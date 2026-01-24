import { describe, it, expect, vi } from "vitest";
import {
  clone,
  uuid,
  fileStamp,
  DEFAULT_STATE,
  sanitizeAndMergeState,
  isValidPhase,
  getNextPhase,
  getPreviousPhase,
  getProgressMetrics,
} from "./state-manager.js";

describe("clone", () => {
  it("creates a deep copy of objects", () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = clone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.b).not.toBe(original.b);
  });

  it("handles arrays", () => {
    const original = [1, [2, 3], { a: 4 }];
    const cloned = clone(original);

    expect(cloned).toEqual(original);
    expect(cloned[1]).not.toBe(original[1]);
    expect(cloned[2]).not.toBe(original[2]);
  });

  it("handles null and primitives", () => {
    expect(clone(null)).toBe(null);
    expect(clone(42)).toBe(42);
    expect(clone("string")).toBe("string");
    expect(clone(true)).toBe(true);
  });
});

describe("uuid", () => {
  it("generates unique IDs", () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(uuid());
    }
    expect(ids.size).toBe(100);
  });

  it("generates string IDs", () => {
    const id = uuid();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});

describe("fileStamp", () => {
  it("returns formatted timestamp string", () => {
    const stamp = fileStamp();
    // Format: YYYY-MM-DD_HHMMSS
    expect(stamp).toMatch(/^\d{4}-\d{2}-\d{2}_\d{6}$/);
  });

  it("uses current date", () => {
    const stamp = fileStamp();
    const year = new Date().getFullYear().toString();
    expect(stamp.startsWith(year)).toBe(true);
  });
});

describe("DEFAULT_STATE", () => {
  it("has all required fields", () => {
    expect(DEFAULT_STATE.phase).toBe("intent");
    expect(DEFAULT_STATE.intent).toBe("");
    expect(DEFAULT_STATE.claims).toHaveLength(1);
    expect(DEFAULT_STATE.expressions).toEqual({});
    expect(DEFAULT_STATE.outputProfile).toBe("linkedin");
    expect(DEFAULT_STATE.ui).toBeDefined();
    expect(DEFAULT_STATE.linkedin).toBeDefined();
  });

  it("has correct linkedin defaults", () => {
    expect(DEFAULT_STATE.linkedin.includeCTA).toBe(true);
    expect(DEFAULT_STATE.linkedin.maxBullets).toBe(5);
    expect(DEFAULT_STATE.linkedin.includeBullets).toBe(false);
  });
});

describe("sanitizeAndMergeState", () => {
  const mockUuid = () => "mock-uuid";

  describe("basic merging", () => {
    it("returns default state for null input", () => {
      const result = sanitizeAndMergeState(null, mockUuid);
      expect(result.phase).toBe("intent");
      expect(result.intent).toBe("");
    });

    it("returns default state for undefined input", () => {
      const result = sanitizeAndMergeState(undefined, mockUuid);
      expect(result.phase).toBe("intent");
    });

    it("returns default state for non-object input", () => {
      expect(sanitizeAndMergeState("string", mockUuid).phase).toBe("intent");
      expect(sanitizeAndMergeState(123, mockUuid).phase).toBe("intent");
      expect(sanitizeAndMergeState(true, mockUuid).phase).toBe("intent");
    });

    it("merges partial state with defaults", () => {
      const partial = { intent: "My intent", phase: "structure" };
      const result = sanitizeAndMergeState(partial, mockUuid);

      expect(result.intent).toBe("My intent");
      expect(result.phase).toBe("structure");
      expect(result.outputProfile).toBe("linkedin"); // default
      expect(result.linkedin.includeCTA).toBe(true); // default
    });

    it("preserves valid custom values", () => {
      const custom = {
        phase: "draft",
        intent: "Custom",
        outputProfile: "email",
        claims: [{ id: "c1", text: "Claim 1" }],
        expressions: { c1: "Expression 1" },
      };
      const result = sanitizeAndMergeState(custom, mockUuid);

      expect(result.phase).toBe("draft");
      expect(result.intent).toBe("Custom");
      expect(result.outputProfile).toBe("email");
      expect(result.expressions.c1).toBe("Expression 1");
    });
  });

  describe("session export format handling", () => {
    it("extracts state from session export wrapper", () => {
      const sessionExport = {
        version: "inkwise:session:v1",
        exportedAt: "2025-01-18T00:00:00.000Z",
        state: {
          phase: "draft",
          intent: "Exported intent",
          claims: [{ id: "c1", text: "Claim" }],
        },
      };
      const result = sanitizeAndMergeState(sessionExport, mockUuid);

      expect(result.intent).toBe("Exported intent");
      expect(result.phase).toBe("draft");
    });

    it("ignores non-inkwise version prefixes", () => {
      const otherFormat = {
        version: "other:format:v1",
        state: { intent: "Should not extract" },
        intent: "Top level intent",
      };
      const result = sanitizeAndMergeState(otherFormat, mockUuid);
      // Should use top-level, not nested state
      expect(result.intent).toBe("Top level intent");
    });
  });

  describe("claims sanitization", () => {
    it("ensures claims is always an array", () => {
      const state = { claims: "not an array" };
      const result = sanitizeAndMergeState(state, mockUuid);
      expect(Array.isArray(result.claims)).toBe(true);
      expect(result.claims.length).toBeGreaterThan(0);
    });

    it("uses default claims for empty array", () => {
      const state = { claims: [] };
      const result = sanitizeAndMergeState(state, mockUuid);
      expect(result.claims.length).toBeGreaterThan(0);
    });

    it("adds missing claim IDs", () => {
      const state = { claims: [{ text: "No ID claim" }] };
      const result = sanitizeAndMergeState(state, mockUuid);
      expect(result.claims[0].id).toBe("mock-uuid");
      expect(result.claims[0].text).toBe("No ID claim");
    });

    it("converts non-string text to empty string", () => {
      const state = { claims: [{ id: "c1", text: 123 }] };
      const result = sanitizeAndMergeState(state, mockUuid);
      expect(result.claims[0].text).toBe("");
    });

    it("handles null claims in array", () => {
      const state = { claims: [null, { id: "c1", text: "Valid" }, undefined] };
      const result = sanitizeAndMergeState(state, mockUuid);

      expect(result.claims).toHaveLength(3);
      expect(result.claims[0].id).toBe("mock-uuid");
      expect(result.claims[1].text).toBe("Valid");
    });

    it("preserves valid claim IDs", () => {
      const state = { claims: [{ id: "existing-id", text: "Text" }] };
      const result = sanitizeAndMergeState(state, mockUuid);
      expect(result.claims[0].id).toBe("existing-id");
    });
  });

  describe("expressions sanitization", () => {
    it("ensures expressions is an object", () => {
      const state = { expressions: "not an object" };
      const result = sanitizeAndMergeState(state, mockUuid);
      expect(typeof result.expressions).toBe("object");
      expect(result.expressions).toEqual({});
    });

    it("handles null expressions", () => {
      const state = { expressions: null };
      const result = sanitizeAndMergeState(state, mockUuid);
      expect(result.expressions).toEqual({});
    });

    it("preserves valid expressions", () => {
      const state = {
        claims: [{ id: "c1", text: "Claim" }],
        expressions: { c1: "Expression text" },
      };
      const result = sanitizeAndMergeState(state, mockUuid);
      expect(result.expressions.c1).toBe("Expression text");
    });
  });

  describe("phase validation", () => {
    it("accepts valid phases", () => {
      expect(sanitizeAndMergeState({ phase: "intent" }, mockUuid).phase).toBe("intent");
      expect(sanitizeAndMergeState({ phase: "structure" }, mockUuid).phase).toBe("structure");
      expect(sanitizeAndMergeState({ phase: "expression" }, mockUuid).phase).toBe("expression");
      expect(sanitizeAndMergeState({ phase: "draft" }, mockUuid).phase).toBe("draft");
    });

    it("rejects invalid phases and defaults to intent", () => {
      expect(sanitizeAndMergeState({ phase: "invalid" }, mockUuid).phase).toBe("intent");
      expect(sanitizeAndMergeState({ phase: "" }, mockUuid).phase).toBe("intent");
      expect(sanitizeAndMergeState({ phase: null }, mockUuid).phase).toBe("intent");
      expect(sanitizeAndMergeState({ phase: 123 }, mockUuid).phase).toBe("intent");
    });
  });

  describe("outputProfile validation", () => {
    it("accepts valid profiles", () => {
      expect(sanitizeAndMergeState({ outputProfile: "linkedin" }, mockUuid).outputProfile).toBe("linkedin");
      expect(sanitizeAndMergeState({ outputProfile: "email" }, mockUuid).outputProfile).toBe("email");
      expect(sanitizeAndMergeState({ outputProfile: "memo" }, mockUuid).outputProfile).toBe("memo");
      expect(sanitizeAndMergeState({ outputProfile: "xthread" }, mockUuid).outputProfile).toBe("xthread");
      expect(sanitizeAndMergeState({ outputProfile: "blog" }, mockUuid).outputProfile).toBe("blog");
      expect(sanitizeAndMergeState({ outputProfile: "custom" }, mockUuid).outputProfile).toBe("custom");
    });

    it("defaults invalid profiles to linkedin", () => {
      expect(sanitizeAndMergeState({ outputProfile: "invalid" }, mockUuid).outputProfile).toBe("linkedin");
      expect(sanitizeAndMergeState({ outputProfile: "" }, mockUuid).outputProfile).toBe("linkedin");
      expect(sanitizeAndMergeState({ outputProfile: null }, mockUuid).outputProfile).toBe("linkedin");
    });
  });

  describe("linkedin config sanitization", () => {
    it("clamps maxBullets to valid range", () => {
      expect(sanitizeAndMergeState({ linkedin: { maxBullets: 0 } }, mockUuid).linkedin.maxBullets).toBe(1);
      expect(sanitizeAndMergeState({ linkedin: { maxBullets: 13 } }, mockUuid).linkedin.maxBullets).toBe(12);
      expect(sanitizeAndMergeState({ linkedin: { maxBullets: 7 } }, mockUuid).linkedin.maxBullets).toBe(7);
    });

    it("uses fallback for invalid maxBullets", () => {
      expect(sanitizeAndMergeState({ linkedin: { maxBullets: "abc" } }, mockUuid).linkedin.maxBullets).toBe(5);
      expect(sanitizeAndMergeState({ linkedin: { maxBullets: null } }, mockUuid).linkedin.maxBullets).toBe(5);
    });

    it("merges linkedin config with defaults", () => {
      const state = { linkedin: { hookOverride: "Custom hook" } };
      const result = sanitizeAndMergeState(state, mockUuid);

      expect(result.linkedin.hookOverride).toBe("Custom hook");
      expect(result.linkedin.includeCTA).toBe(true); // default preserved
    });

    it("handles non-object linkedin config", () => {
      const state = { linkedin: "not an object" };
      const result = sanitizeAndMergeState(state, mockUuid);
      expect(result.linkedin.includeCTA).toBe(true); // defaults applied
    });
  });

  describe("ui config sanitization", () => {
    it("merges ui config with defaults", () => {
      const state = { ui: { presetId: "custom_preset" } };
      const result = sanitizeAndMergeState(state, mockUuid);
      expect(result.ui.presetId).toBe("custom_preset");
    });

    it("handles non-object ui config", () => {
      const state = { ui: null };
      const result = sanitizeAndMergeState(state, mockUuid);
      expect(result.ui.presetId).toBe("systems_coordination");
    });
  });

  describe("edge cases", () => {
    it("handles deeply nested invalid data", () => {
      const state = {
        phase: { nested: "object" },
        intent: [1, 2, 3],
        claims: { notAnArray: true },
        expressions: [1, 2, 3],
        linkedin: [1, 2, 3],
      };
      const result = sanitizeAndMergeState(state, mockUuid);

      expect(result.phase).toBe("intent");
      expect(typeof result.intent).toBe("string");
      expect(Array.isArray(result.claims)).toBe(true);
      expect(typeof result.expressions).toBe("object");
      expect(typeof result.linkedin).toBe("object");
    });

    it("handles circular reference-like structures", () => {
      const state = {
        claims: [{ id: "c1", text: "Valid" }],
        extra: { deeply: { nested: { value: "test" } } },
      };
      const result = sanitizeAndMergeState(state, mockUuid);
      expect(result.claims[0].text).toBe("Valid");
    });

    it("handles prototype pollution attempts", () => {
      const state = {
        __proto__: { admin: true },
        constructor: { prototype: { admin: true } },
        claims: [{ id: "c1", text: "Test" }],
      };
      const result = sanitizeAndMergeState(state, mockUuid);
      expect(result.admin).toBeUndefined();
    });

    it("handles very large claims array", () => {
      const claims = Array.from({ length: 1000 }, (_, i) => ({
        id: `c${i}`,
        text: `Claim ${i}`,
      }));
      const state = { claims };
      const result = sanitizeAndMergeState(state, mockUuid);
      expect(result.claims).toHaveLength(1000);
    });
  });
});

describe("isValidPhase", () => {
  it("returns true for valid phases", () => {
    expect(isValidPhase("intent")).toBe(true);
    expect(isValidPhase("structure")).toBe(true);
    expect(isValidPhase("expression")).toBe(true);
    expect(isValidPhase("draft")).toBe(true);
  });

  it("returns false for invalid phases", () => {
    expect(isValidPhase("invalid")).toBe(false);
    expect(isValidPhase("")).toBe(false);
    expect(isValidPhase(null)).toBe(false);
    expect(isValidPhase(undefined)).toBe(false);
    expect(isValidPhase(123)).toBe(false);
  });
});

describe("getNextPhase", () => {
  it("returns next phase in workflow", () => {
    expect(getNextPhase("intent")).toBe("structure");
    expect(getNextPhase("structure")).toBe("expression");
    expect(getNextPhase("expression")).toBe("draft");
  });

  it("returns null for last phase", () => {
    expect(getNextPhase("draft")).toBe(null);
  });

  it("returns null for invalid phase", () => {
    expect(getNextPhase("invalid")).toBe(null);
  });
});

describe("getPreviousPhase", () => {
  it("returns previous phase in workflow", () => {
    expect(getPreviousPhase("draft")).toBe("expression");
    expect(getPreviousPhase("expression")).toBe("structure");
    expect(getPreviousPhase("structure")).toBe("intent");
  });

  it("returns null for first phase", () => {
    expect(getPreviousPhase("intent")).toBe(null);
  });

  it("returns null for invalid phase", () => {
    expect(getPreviousPhase("invalid")).toBe(null);
  });
});

describe("getProgressMetrics", () => {
  it("calculates metrics for empty state", () => {
    const state = {
      phase: "intent",
      claims: [{ id: "c1", text: "" }],
      expressions: {},
    };
    const metrics = getProgressMetrics(state);

    expect(metrics.currentPhaseIndex).toBe(0);
    expect(metrics.totalPhases).toBe(4);
    expect(metrics.nonEmptyClaims).toBe(0);
    expect(metrics.totalClaims).toBe(1);
    expect(metrics.completedExpressions).toBe(0);
  });

  it("calculates metrics for partial state", () => {
    const state = {
      phase: "expression",
      claims: [
        { id: "c1", text: "Claim 1" },
        { id: "c2", text: "" },
        { id: "c3", text: "Claim 3" },
      ],
      expressions: {
        c1: "Expression 1",
        c3: "  ", // whitespace only
      },
    };
    const metrics = getProgressMetrics(state);

    expect(metrics.currentPhaseIndex).toBe(2);
    expect(metrics.nonEmptyClaims).toBe(2);
    expect(metrics.totalClaims).toBe(3);
    expect(metrics.completedExpressions).toBe(1);
  });

  it("calculates metrics for complete state", () => {
    const state = {
      phase: "draft",
      claims: [
        { id: "c1", text: "Claim 1" },
        { id: "c2", text: "Claim 2" },
      ],
      expressions: {
        c1: "Expression 1",
        c2: "Expression 2",
      },
    };
    const metrics = getProgressMetrics(state);

    expect(metrics.currentPhaseIndex).toBe(3);
    expect(metrics.nonEmptyClaims).toBe(2);
    expect(metrics.completedExpressions).toBe(2);
  });

  it("handles missing fields gracefully", () => {
    const metrics = getProgressMetrics({ phase: "intent" });

    expect(metrics.nonEmptyClaims).toBe(0);
    expect(metrics.totalClaims).toBe(0);
    expect(metrics.completedExpressions).toBe(0);
  });
});
