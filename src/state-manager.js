// State management functions extracted for testing
// These handle state sanitization, merging, and validation

import { clampInt, OUTPUT_PROFILES } from "./utils.js";

// Deep clone helper with structuredClone fallback
export function clone(obj) {
  if (typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

// UUID generator with crypto.randomUUID fallback
export function uuid() {
  if (typeof crypto !== "undefined" && crypto?.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

// Timestamp formatting for filenames
export function fileStamp() {
  const d = new Date();
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(
    d.getMinutes()
  )}${pad2(d.getSeconds())}`;
}

// Default state structure
export const DEFAULT_STATE = {
  phase: "intent",
  intent: "",
  claims: [{ id: "default-claim-id", text: "" }],
  expressions: {},
  outputProfile: "linkedin",
  ui: {
    presetId: "systems_coordination",
  },
  linkedin: {
    hookOverride: "",
    includeBullets: false,
    bulletIntro: "Key points:",
    maxBullets: 5,
    includeCTA: true,
    ctaText: "What would you change?",
    includeHashtags: false,
    hashtags: "#leadership #execution #systems",
    includeSignature: false,
    signature: "— Posted via Inkwise",
  },
};

// Valid phases
const VALID_PHASES = new Set(["intent", "structure", "expression", "draft"]);

/**
 * Sanitizes and merges incoming state with defaults
 * Handles malformed data, missing fields, and invalid values
 * @param {unknown} maybeState - The state to sanitize
 * @param {() => string} [uuidFn] - Optional UUID generator (for testing)
 * @returns {object} - The sanitized state
 */
export function sanitizeAndMergeState(maybeState, uuidFn = uuid) {
  // Handle session export format (with version and state wrapper)
  const candidate =
    maybeState &&
    typeof maybeState === "object" &&
    maybeState.state &&
    typeof maybeState.state === "object" &&
    maybeState.version &&
    String(maybeState.version).startsWith("inkwise:session:")
      ? maybeState.state
      : maybeState;

  // Ensure we have an object to work with
  const parsed = candidate && typeof candidate === "object" ? candidate : {};

  // Merge with defaults
  const merged = {
    ...clone(DEFAULT_STATE),
    ...parsed,
    // Ensure intent is a string
    intent: typeof parsed.intent === "string" ? parsed.intent : "",
    // Handle claims specially - ensure array with at least one item
    claims: Array.isArray(parsed.claims) && parsed.claims.length ? parsed.claims : clone(DEFAULT_STATE.claims),
    // Handle expressions - must be an object (not array)
    expressions:
      parsed.expressions && typeof parsed.expressions === "object" && !Array.isArray(parsed.expressions)
        ? parsed.expressions
        : {},
    // Merge nested ui object
    ui: {
      ...clone(DEFAULT_STATE.ui),
      ...(parsed.ui && typeof parsed.ui === "object" && !Array.isArray(parsed.ui) ? parsed.ui : {}),
    },
    // Merge nested linkedin object
    linkedin: {
      ...clone(DEFAULT_STATE.linkedin),
      ...(parsed.linkedin && typeof parsed.linkedin === "object" && !Array.isArray(parsed.linkedin)
        ? parsed.linkedin
        : {}),
    },
  };

  // Sanitize claims - ensure each has valid id and text
  merged.claims = merged.claims.map((c) => ({
    id: c && c.id ? c.id : uuidFn(),
    text: c && typeof c.text === "string" ? c.text : "",
  }));

  // Clamp maxBullets to valid range
  merged.linkedin.maxBullets = clampInt(merged.linkedin.maxBullets, 1, 12, 5);

  // Validate phase
  if (!VALID_PHASES.has(merged.phase)) {
    merged.phase = "intent";
  }

  // Validate outputProfile
  if (!OUTPUT_PROFILES[merged.outputProfile]) {
    merged.outputProfile = "linkedin";
  }

  return merged;
}

/**
 * Validates a phase value
 * @param {string} phase
 * @returns {boolean}
 */
export function isValidPhase(phase) {
  return VALID_PHASES.has(phase);
}

/**
 * Gets the next phase in the workflow
 * @param {string} currentPhase
 * @returns {string|null}
 */
export function getNextPhase(currentPhase) {
  const phases = ["intent", "structure", "expression", "draft"];
  const currentIndex = phases.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex === phases.length - 1) return null;
  return phases[currentIndex + 1];
}

/**
 * Gets the previous phase in the workflow
 * @param {string} currentPhase
 * @returns {string|null}
 */
export function getPreviousPhase(currentPhase) {
  const phases = ["intent", "structure", "expression", "draft"];
  const currentIndex = phases.indexOf(currentPhase);
  if (currentIndex <= 0) return null;
  return phases[currentIndex - 1];
}

/**
 * Calculates progress metrics from state
 * @param {object} state
 * @returns {{currentPhaseIndex: number, totalPhases: number, nonEmptyClaims: number, totalClaims: number, completedExpressions: number}}
 */
export function getProgressMetrics(state) {
  const phases = ["intent", "structure", "expression", "draft"];
  const currentPhaseIndex = phases.indexOf(state.phase);
  const claims = state.claims || [];
  const expressions = state.expressions || {};

  const nonEmptyClaims = claims.filter((c) => c.text && c.text.trim().length > 0).length;
  const completedExpressions = claims.filter((c) => {
    const expr = expressions[c.id];
    return expr && expr.trim().length > 0;
  }).length;

  return {
    currentPhaseIndex,
    totalPhases: phases.length,
    nonEmptyClaims,
    totalClaims: claims.length,
    completedExpressions,
  };
}
