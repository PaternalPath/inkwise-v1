import { describe, it, expect } from "vitest";
import {
  AppStateSchema,
  parseAppState,
  parseSessionExport,
  extractStateFromImport,
  createSessionExport,
  formatZodErrors,
  ClaimSchema,
  LinkedInConfigSchema,
} from "./schemas.js";

describe("Zod Schemas", () => {
  describe("ClaimSchema", () => {
    it("validates a valid claim", () => {
      const claim = { id: "claim-123", text: "This is a claim" };
      const result = ClaimSchema.safeParse(claim);
      expect(result.success).toBe(true);
    });

    it("requires id to be non-empty", () => {
      const claim = { id: "", text: "This is a claim" };
      const result = ClaimSchema.safeParse(claim);
      expect(result.success).toBe(false);
    });

    it("allows empty text", () => {
      const claim = { id: "claim-123", text: "" };
      const result = ClaimSchema.safeParse(claim);
      expect(result.success).toBe(true);
    });
  });

  describe("LinkedInConfigSchema", () => {
    it("provides default values", () => {
      const result = LinkedInConfigSchema.parse({});
      expect(result.hookOverride).toBe("");
      expect(result.includeBullets).toBe(false);
      expect(result.maxBullets).toBe(5);
      expect(result.includeCTA).toBe(true);
    });

    it("validates maxBullets range", () => {
      const valid = LinkedInConfigSchema.safeParse({ maxBullets: 6 });
      expect(valid.success).toBe(true);

      const tooLow = LinkedInConfigSchema.safeParse({ maxBullets: 0 });
      expect(tooLow.success).toBe(false);

      const tooHigh = LinkedInConfigSchema.safeParse({ maxBullets: 13 });
      expect(tooHigh.success).toBe(false);
    });
  });

  describe("AppStateSchema", () => {
    it("validates a minimal valid state", () => {
      const state = {
        phase: "intent",
        intent: "Test intent",
        claims: [{ id: "c1", text: "Claim 1" }],
        expressions: {},
        outputProfile: "linkedin",
      };
      const result = parseAppState(state);
      expect(result.success).toBe(true);
    });

    it("provides defaults for optional fields", () => {
      const state = {
        claims: [{ id: "c1", text: "" }],
      };
      const result = parseAppState(state);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phase).toBe("intent");
        expect(result.data.outputProfile).toBe("linkedin");
      }
    });

    it("rejects invalid phase", () => {
      const state = {
        phase: "invalid-phase",
        claims: [{ id: "c1", text: "" }],
      };
      const result = parseAppState(state);
      expect(result.success).toBe(false);
    });

    it("rejects empty claims array", () => {
      const state = {
        claims: [],
      };
      const result = parseAppState(state);
      expect(result.success).toBe(false);
    });
  });

  describe("SessionExportSchema", () => {
    it("validates a valid session export", () => {
      const session = {
        version: "inkwise:session:v1",
        exportedAt: "2025-01-18T00:00:00.000Z",
        state: {
          phase: "draft",
          intent: "Test",
          claims: [{ id: "c1", text: "Claim" }],
          expressions: {},
          outputProfile: "linkedin",
        },
      };
      const result = parseSessionExport(session);
      expect(result.success).toBe(true);
    });

    it("rejects invalid version prefix", () => {
      const session = {
        version: "other:format:v1",
        exportedAt: "2025-01-18T00:00:00.000Z",
        state: {
          claims: [{ id: "c1", text: "" }],
        },
      };
      const result = parseSessionExport(session);
      expect(result.success).toBe(false);
    });

    it("rejects invalid datetime format", () => {
      const session = {
        version: "inkwise:session:v1",
        exportedAt: "not-a-date",
        state: {
          claims: [{ id: "c1", text: "" }],
        },
      };
      const result = parseSessionExport(session);
      expect(result.success).toBe(false);
    });
  });
});

describe("extractStateFromImport", () => {
  it("extracts state from session export format", () => {
    const session = {
      version: "inkwise:session:v1",
      exportedAt: "2025-01-18T00:00:00.000Z",
      state: {
        phase: "draft",
        intent: "Test intent",
        claims: [{ id: "c1", text: "Claim 1" }],
        expressions: { c1: "Expression 1" },
        outputProfile: "linkedin",
      },
    };
    const result = extractStateFromImport(session);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.intent).toBe("Test intent");
      expect(result.data.phase).toBe("draft");
    }
  });

  it("extracts state from raw state object", () => {
    const rawState = {
      phase: "structure",
      intent: "Raw intent",
      claims: [{ id: "c1", text: "Claim" }],
      expressions: {},
      outputProfile: "email",
    };
    const result = extractStateFromImport(rawState);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.intent).toBe("Raw intent");
    }
  });

  it("returns error for null input", () => {
    const result = extractStateFromImport(null);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid import");
    }
  });

  it("returns error for non-object input", () => {
    const result = extractStateFromImport("not an object");
    expect(result.success).toBe(false);
  });

  it("returns error for invalid state structure", () => {
    const invalid = {
      version: "inkwise:session:v1",
      exportedAt: "2025-01-18T00:00:00.000Z",
      state: {
        claims: [], // Invalid: empty array
      },
    };
    const result = extractStateFromImport(invalid);
    expect(result.success).toBe(false);
  });
});

describe("createSessionExport", () => {
  it("creates a valid session export", () => {
    const state = {
      phase: "intent",
      intent: "Test",
      claims: [{ id: "c1", text: "Claim" }],
      expressions: {},
      outputProfile: "linkedin",
      ui: { presetId: "test" },
      linkedin: {
        hookOverride: "",
        includeBullets: false,
        bulletIntro: "Key points:",
        maxBullets: 5,
        includeCTA: true,
        ctaText: "What do you think?",
        includeHashtags: false,
        hashtags: "",
        includeSignature: false,
        signature: "",
      },
    };

    const exported = createSessionExport(state);

    expect(exported.version).toBe("inkwise:session:v1");
    expect(exported.exportedAt).toBeDefined();
    expect(exported.state).toEqual(state);

    // Validate the export is parseable
    const validated = parseSessionExport(exported);
    expect(validated.success).toBe(true);
  });

  it("produces roundtrip-compatible exports", () => {
    const originalState = {
      phase: "draft",
      intent: "Original intent",
      claims: [
        { id: "c1", text: "Claim 1" },
        { id: "c2", text: "Claim 2" },
      ],
      expressions: { c1: "Expression 1", c2: "Expression 2" },
      outputProfile: "blog",
      ui: { presetId: "custom" },
      linkedin: {
        hookOverride: "Custom hook",
        includeBullets: true,
        bulletIntro: "Points:",
        maxBullets: 3,
        includeCTA: false,
        ctaText: "",
        includeHashtags: true,
        hashtags: "#test",
        includeSignature: true,
        signature: "— Test",
      },
    };

    // Export
    const exported = createSessionExport(originalState);

    // Simulate JSON roundtrip
    const jsonString = JSON.stringify(exported);
    const parsed = JSON.parse(jsonString);

    // Import
    const imported = extractStateFromImport(parsed);
    expect(imported.success).toBe(true);
    if (imported.success) {
      expect(imported.data.intent).toBe(originalState.intent);
      expect(imported.data.claims).toHaveLength(2);
      expect(imported.data.expressions.c1).toBe("Expression 1");
      expect(imported.data.linkedin.hookOverride).toBe("Custom hook");
    }
  });
});

describe("formatZodErrors", () => {
  it("formats errors with paths", () => {
    const result = AppStateSchema.safeParse({
      phase: "invalid",
      claims: [],
    });

    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      expect(formatted.length).toBeGreaterThan(0);
      expect(formatted.some((e) => e.includes("phase"))).toBe(true);
    }
  });
});

describe("Demo Project Fixture", () => {
  it("can be validated as a session export", async () => {
    // Load the demo project fixture
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const fixturePath = path.resolve(__dirname, "../public/fixtures/demo-project.json");
    const fixtureContent = fs.readFileSync(fixturePath, "utf-8");
    const fixture = JSON.parse(fixtureContent);

    // Validate
    const result = parseSessionExport(fixture);
    expect(result.success).toBe(true);
  });

  it("can be extracted as valid state", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const fixturePath = path.resolve(__dirname, "../public/fixtures/demo-project.json");
    const fixtureContent = fs.readFileSync(fixturePath, "utf-8");
    const fixture = JSON.parse(fixtureContent);

    const result = extractStateFromImport(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.claims.length).toBe(3);
      expect(result.data.phase).toBe("draft");
    }
  });
});
