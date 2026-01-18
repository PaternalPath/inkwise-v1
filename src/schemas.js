/**
 * Zod schemas for Inkwise state validation
 * Used for import/export validation and type safety
 */
import { z } from "zod";

// Output profile keys
export const OutputProfileKeySchema = z.enum(["linkedin", "xthread", "email", "memo", "blog", "custom"]);

// Phase enum
export const PhaseSchema = z.enum(["intent", "structure", "expression", "draft"]);

// Individual claim
export const ClaimSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
});

// LinkedIn configuration
export const LinkedInConfigSchema = z.object({
  hookOverride: z.string().default(""),
  includeBullets: z.boolean().default(false),
  bulletIntro: z.string().default("Key points:"),
  maxBullets: z.number().int().min(1).max(12).default(5),
  includeCTA: z.boolean().default(true),
  ctaText: z.string().default("What would you change?"),
  includeHashtags: z.boolean().default(false),
  hashtags: z.string().default("#leadership #execution #systems"),
  includeSignature: z.boolean().default(false),
  signature: z.string().default("— Posted via Inkwise"),
});

// UI state
export const UIStateSchema = z.object({
  presetId: z.string().default("systems_coordination"),
});

// Project metadata (optional, for enhanced exports)
export const ProjectMetadataSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// Main application state
export const AppStateSchema = z.object({
  phase: PhaseSchema.default("intent"),
  intent: z.string().default(""),
  claims: z.array(ClaimSchema).min(1),
  expressions: z.record(z.string(), z.string()).default({}),
  outputProfile: OutputProfileKeySchema.default("linkedin"),
  ui: UIStateSchema.default({}),
  linkedin: LinkedInConfigSchema.default({}),
  // Optional metadata
  metadata: ProjectMetadataSchema.optional(),
});

// Session export format (what gets saved to JSON files)
export const SessionExportSchema = z.object({
  version: z.string().refine((v) => v.startsWith("inkwise:session:"), {
    message: "Version must start with 'inkwise:session:'",
  }),
  exportedAt: z.string().datetime(),
  state: AppStateSchema,
});

// Legacy session format (for backwards compatibility)
export const LegacySessionSchema = z.object({
  version: z.string().optional(),
  exportedAt: z.string().optional(),
  state: z.unknown().optional(),
});

/**
 * Validates and parses a session export
 * @param {unknown} data - Raw data to validate
 * @returns {{ success: true, data: z.infer<typeof SessionExportSchema> } | { success: false, error: z.ZodError }}
 */
export function parseSessionExport(data) {
  const result = SessionExportSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validates and parses application state
 * @param {unknown} data - Raw data to validate
 * @returns {{ success: true, data: z.infer<typeof AppStateSchema> } | { success: false, error: z.ZodError }}
 */
export function parseAppState(data) {
  const result = AppStateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Extracts state from various import formats (handles legacy and new formats)
 * @param {unknown} data - Raw imported data
 * @returns {{ success: true, data: z.infer<typeof AppStateSchema> } | { success: false, error: string }}
 */
export function extractStateFromImport(data) {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Invalid import: data must be an object" };
  }

  const obj = /** @type {Record<string, unknown>} */ (data);

  // Check if it's a session export format
  if (obj.version && typeof obj.version === "string" && obj.version.startsWith("inkwise:session:")) {
    const parsed = parseSessionExport(data);
    if (parsed.success) {
      return { success: true, data: parsed.data.state };
    }
    // Try to extract just the state for partial recovery
    if (obj.state && typeof obj.state === "object") {
      const stateResult = parseAppState(obj.state);
      if (stateResult.success) {
        return { success: true, data: stateResult.data };
      }
    }
    // parsed.success is false here, so we have parsed.error
    const errorMsg = /** @type {{ success: false, error: import("zod").ZodError }} */ (parsed).error.errors
      .map((e) => e.message)
      .join(", ");
    return {
      success: false,
      error: `Invalid session format: ${errorMsg}`,
    };
  }

  // Check if it's raw state (legacy import or direct state object)
  const stateResult = parseAppState(data);
  if (stateResult.success) {
    return { success: true, data: stateResult.data };
  }

  // Try to extract from nested state property
  if (obj.state && typeof obj.state === "object") {
    const nestedResult = parseAppState(obj.state);
    if (nestedResult.success) {
      return { success: true, data: nestedResult.data };
    }
  }

  return {
    success: false,
    error: "Could not parse import data. Ensure it's a valid Inkwise session or project file.",
  };
}

/**
 * Creates a session export payload
 * @param {z.infer<typeof AppStateSchema>} state - Current app state
 * @returns {z.infer<typeof SessionExportSchema>}
 */
export function createSessionExport(state) {
  return {
    version: "inkwise:session:v1",
    exportedAt: new Date().toISOString(),
    state,
  };
}

/**
 * Formats Zod errors into user-friendly messages
 * @param {z.ZodError} error - Zod error object
 * @returns {string[]}
 */
export function formatZodErrors(error) {
  return error.errors.map((e) => {
    const path = e.path.length > 0 ? `${e.path.join(".")}: ` : "";
    return `${path}${e.message}`;
  });
}
