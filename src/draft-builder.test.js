import { describe, it, expect } from "vitest";
import {
  getCleanClaims,
  getCleanParagraphs,
  buildLinkedInDraft,
  buildFullBreakdown,
  buildDraftText,
  buildMarkdownExport,
  isFirstTimeUser,
} from "./draft-builder.js";

describe("getCleanClaims", () => {
  it("filters out empty claims", () => {
    const claims = [
      { id: "1", text: "Valid claim" },
      { id: "2", text: "" },
      { id: "3", text: "   " },
      { id: "4", text: "Another valid" },
    ];
    const result = getCleanClaims(claims);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("Valid claim");
    expect(result[1].text).toBe("Another valid");
  });

  it("trims whitespace from claims", () => {
    const claims = [{ id: "1", text: "  Needs trimming  " }];
    const result = getCleanClaims(claims);
    expect(result[0].text).toBe("Needs trimming");
  });

  it("handles empty array", () => {
    expect(getCleanClaims([])).toEqual([]);
  });

  it("handles null/undefined text gracefully", () => {
    const claims = [
      { id: "1", text: null },
      { id: "2", text: undefined },
      { id: "3", text: "Valid" },
    ];
    const result = getCleanClaims(claims);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Valid");
  });

  it("preserves claim IDs", () => {
    const claims = [{ id: "unique-id-123", text: "Claim text" }];
    const result = getCleanClaims(claims);
    expect(result[0].id).toBe("unique-id-123");
  });
});

describe("getCleanParagraphs", () => {
  it("returns expressions for claims in order", () => {
    const claims = [
      { id: "c1", text: "Claim 1" },
      { id: "c2", text: "Claim 2" },
    ];
    const expressions = {
      c1: "Expression for claim 1",
      c2: "Expression for claim 2",
    };
    const result = getCleanParagraphs(claims, expressions);
    expect(result).toEqual(["Expression for claim 1", "Expression for claim 2"]);
  });

  it("filters out empty expressions", () => {
    const claims = [
      { id: "c1", text: "Claim 1" },
      { id: "c2", text: "Claim 2" },
    ];
    const expressions = {
      c1: "Has content",
      c2: "   ",
    };
    const result = getCleanParagraphs(claims, expressions);
    expect(result).toEqual(["Has content"]);
  });

  it("handles missing expressions for claims", () => {
    const claims = [
      { id: "c1", text: "Claim 1" },
      { id: "c2", text: "Claim 2" },
    ];
    const expressions = { c1: "Only one expression" };
    const result = getCleanParagraphs(claims, expressions);
    expect(result).toEqual(["Only one expression"]);
  });

  it("handles empty inputs", () => {
    expect(getCleanParagraphs([], {})).toEqual([]);
  });

  it("trims expression whitespace", () => {
    const claims = [{ id: "c1", text: "Claim" }];
    const expressions = { c1: "   Trimmed content   " };
    const result = getCleanParagraphs(claims, expressions);
    expect(result).toEqual(["Trimmed content"]);
  });
});

describe("buildLinkedInDraft", () => {
  const baseState = {
    intent: "",
    claims: [],
    expressions: {},
    linkedin: {
      hookOverride: "",
      includeBullets: false,
      bulletIntro: "Key points:",
      maxBullets: 5,
      includeCTA: false,
      ctaText: "",
      includeHashtags: false,
      hashtags: "",
      includeSignature: false,
      signature: "",
    },
  };

  it("shows placeholder when no content", () => {
    const result = buildLinkedInDraft(baseState);
    expect(result).toContain("Add intent/claims/expressions to generate a draft");
  });

  it("uses intent as hook when no override", () => {
    const state = { ...baseState, intent: "My intent hook" };
    const result = buildLinkedInDraft(state);
    expect(result).toContain("My intent hook");
  });

  it("uses hookOverride when provided", () => {
    const state = {
      ...baseState,
      intent: "Original intent",
      linkedin: { ...baseState.linkedin, hookOverride: "Custom hook" },
    };
    const result = buildLinkedInDraft(state);
    expect(result).toContain("Custom hook");
    expect(result).not.toContain("Original intent");
  });

  it("includes bullets when enabled", () => {
    const state = {
      ...baseState,
      intent: "Hook",
      claims: [
        { id: "1", text: "Point one" },
        { id: "2", text: "Point two" },
      ],
      linkedin: {
        ...baseState.linkedin,
        includeBullets: true,
        bulletIntro: "Key points:",
        maxBullets: 5,
      },
    };
    const result = buildLinkedInDraft(state);
    expect(result).toContain("Key points:");
    expect(result).toContain("• Point one");
    expect(result).toContain("• Point two");
  });

  it("respects maxBullets limit", () => {
    const state = {
      ...baseState,
      intent: "Hook",
      claims: [
        { id: "1", text: "Point 1" },
        { id: "2", text: "Point 2" },
        { id: "3", text: "Point 3" },
        { id: "4", text: "Point 4" },
      ],
      linkedin: { ...baseState.linkedin, includeBullets: true, maxBullets: 2 },
    };
    const result = buildLinkedInDraft(state);
    expect(result).toContain("• Point 1");
    expect(result).toContain("• Point 2");
    expect(result).not.toContain("• Point 3");
    expect(result).not.toContain("• Point 4");
  });

  it("includes expressions as paragraphs", () => {
    const state = {
      ...baseState,
      intent: "Hook",
      claims: [{ id: "c1", text: "Claim" }],
      expressions: { c1: "This is the expression paragraph." },
    };
    const result = buildLinkedInDraft(state);
    expect(result).toContain("This is the expression paragraph.");
  });

  it("includes CTA when enabled", () => {
    const state = {
      ...baseState,
      intent: "Hook",
      linkedin: { ...baseState.linkedin, includeCTA: true, ctaText: "What do you think?" },
    };
    const result = buildLinkedInDraft(state);
    expect(result).toContain("What do you think?");
  });

  it("includes signature when enabled", () => {
    const state = {
      ...baseState,
      intent: "Hook",
      linkedin: { ...baseState.linkedin, includeSignature: true, signature: "— John Doe" },
    };
    const result = buildLinkedInDraft(state);
    expect(result).toContain("— John Doe");
  });

  it("includes hashtags when enabled", () => {
    const state = {
      ...baseState,
      intent: "Hook",
      linkedin: { ...baseState.linkedin, includeHashtags: true, hashtags: "#leadership #growth" },
    };
    const result = buildLinkedInDraft(state);
    expect(result).toContain("#leadership #growth");
  });

  it("builds complete draft with all options enabled", () => {
    const state = {
      intent: "The opening hook",
      claims: [
        { id: "c1", text: "First point" },
        { id: "c2", text: "Second point" },
      ],
      expressions: {
        c1: "Elaboration on first point.",
        c2: "Elaboration on second point.",
      },
      linkedin: {
        hookOverride: "",
        includeBullets: true,
        bulletIntro: "Key takeaways:",
        maxBullets: 5,
        includeCTA: true,
        ctaText: "Share your thoughts!",
        includeHashtags: true,
        hashtags: "#business",
        includeSignature: true,
        signature: "— Author",
      },
    };
    const result = buildLinkedInDraft(state);

    expect(result).toContain("The opening hook");
    expect(result).toContain("Key takeaways:");
    expect(result).toContain("• First point");
    expect(result).toContain("Elaboration on first point.");
    expect(result).toContain("Share your thoughts!");
    expect(result).toContain("#business");
    expect(result).toContain("— Author");
  });

  it("handles missing linkedin config gracefully", () => {
    const state = {
      intent: "Just intent",
      claims: [],
      expressions: {},
    };
    const result = buildLinkedInDraft(state);
    expect(result).toContain("Just intent");
  });

  it("falls back to claims as content when no expressions and no hook", () => {
    const state = {
      ...baseState,
      intent: "",
      claims: [
        { id: "c1", text: "Standalone claim 1" },
        { id: "c2", text: "Standalone claim 2" },
      ],
      expressions: {},
    };
    const result = buildLinkedInDraft(state);
    expect(result).toContain("Standalone claim 1");
    expect(result).toContain("Standalone claim 2");
  });
});

describe("buildFullBreakdown", () => {
  it("builds breakdown with all sections", () => {
    const state = {
      intent: "My main intent",
      claims: [
        { id: "c1", text: "Claim one" },
        { id: "c2", text: "Claim two" },
      ],
      expressions: {
        c1: "Expression one",
        c2: "Expression two",
      },
    };
    const result = buildFullBreakdown(state);

    expect(result).toContain("INTENT");
    expect(result).toContain("My main intent");
    expect(result).toContain("STRUCTURE");
    expect(result).toContain("• Claim one");
    expect(result).toContain("• Claim two");
    expect(result).toContain("EXPRESSION");
    expect(result).toContain("Expression one");
    expect(result).toContain("Expression two");
  });

  it("omits empty sections", () => {
    const state = {
      intent: "",
      claims: [{ id: "c1", text: "Just a claim" }],
      expressions: {},
    };
    const result = buildFullBreakdown(state);

    expect(result).not.toContain("INTENT");
    expect(result).toContain("STRUCTURE");
    expect(result).not.toContain("EXPRESSION");
  });

  it("handles completely empty state", () => {
    const state = {
      intent: "",
      claims: [],
      expressions: {},
    };
    const result = buildFullBreakdown(state);
    expect(result).toBe("");
  });

  it("filters empty claims from structure", () => {
    const state = {
      intent: "Intent",
      claims: [
        { id: "c1", text: "Valid" },
        { id: "c2", text: "" },
        { id: "c3", text: "   " },
      ],
      expressions: {},
    };
    const result = buildFullBreakdown(state);
    expect(result).toContain("• Valid");
    expect(result.match(/•/g)).toHaveLength(1);
  });
});

describe("buildDraftText", () => {
  const baseState = {
    intent: "Test intent",
    claims: [{ id: "c1", text: "Test claim" }],
    expressions: { c1: "Test expression" },
    outputProfile: "linkedin",
    linkedin: { hookOverride: "" },
  };

  describe("email profile", () => {
    it("adds subject line from intent", () => {
      const state = { ...baseState, outputProfile: "email" };
      const result = buildDraftText("Body text", state);

      expect(result).toContain("Subject: Test intent");
      expect(result).toContain("Body text");
    });

    it("uses hookOverride as subject when available", () => {
      const state = {
        ...baseState,
        outputProfile: "email",
        linkedin: { hookOverride: "Custom Subject" },
      };
      const result = buildDraftText("Body", state);
      expect(result).toContain("Subject: Custom Subject");
    });

    it("falls back to 'Quick note' when no intent", () => {
      const state = {
        ...baseState,
        intent: "",
        outputProfile: "email",
        linkedin: { hookOverride: "" },
      };
      const result = buildDraftText("Body", state);
      expect(result).toContain("Subject: Quick note");
    });
  });

  describe("memo profile", () => {
    it("creates memo structure with sections", () => {
      const state = { ...baseState, outputProfile: "memo" };
      const result = buildDraftText("Details here", state);

      expect(result).toContain("TITLE");
      expect(result).toContain("Test intent");
      expect(result).toContain("TL;DR");
      expect(result).toContain("- Test claim");
      expect(result).toContain("DETAILS");
      expect(result).toContain("Details here");
      expect(result).toContain("NEXT STEPS");
    });

    it("limits TL;DR bullets to 5", () => {
      const state = {
        ...baseState,
        outputProfile: "memo",
        claims: [
          { id: "1", text: "One" },
          { id: "2", text: "Two" },
          { id: "3", text: "Three" },
          { id: "4", text: "Four" },
          { id: "5", text: "Five" },
          { id: "6", text: "Six" },
        ],
      };
      const result = buildDraftText("Details", state);
      expect(result).toContain("- One");
      expect(result).toContain("- Five");
      expect(result).not.toContain("- Six");
    });

    it("uses 'Memo' as default title", () => {
      const state = { ...baseState, intent: "", outputProfile: "memo" };
      const result = buildDraftText("Details", state);
      expect(result).toContain("TITLE\nMemo");
    });
  });

  describe("xthread profile", () => {
    it("splits into numbered thread posts", () => {
      const longText = "A".repeat(300) + " " + "B".repeat(300);
      const state = { ...baseState, outputProfile: "xthread" };
      const result = buildDraftText(longText, state);

      expect(result).toContain("1/");
      expect(result).toContain("2/");
      expect(result).toContain("---");
    });

    it("handles short text as single post", () => {
      const state = { ...baseState, outputProfile: "xthread" };
      const result = buildDraftText("Short text", state);
      expect(result).toContain("1/1");
    });
  });

  describe("blog profile", () => {
    it("creates markdown with title and section headers", () => {
      const state = {
        ...baseState,
        outputProfile: "blog",
        claims: [
          { id: "c1", text: "Section One" },
          { id: "c2", text: "Section Two" },
        ],
        expressions: {
          c1: "Content for section one.",
          c2: "Content for section two.",
        },
      };
      const result = buildDraftText("fallback", state);

      expect(result).toContain("# Test intent");
      expect(result).toContain("## Section One");
      expect(result).toContain("Content for section one.");
      expect(result).toContain("## Section Two");
      expect(result).toContain("Content for section two.");
    });

    it("uses baseText when no claims/expressions", () => {
      const state = {
        ...baseState,
        outputProfile: "blog",
        claims: [],
        expressions: {},
      };
      const result = buildDraftText("Fallback content", state);
      expect(result).toContain("Fallback content");
    });
  });

  describe("linkedin and custom profiles", () => {
    it("returns base text unchanged for linkedin", () => {
      const state = { ...baseState, outputProfile: "linkedin" };
      const result = buildDraftText("Original text", state);
      expect(result).toBe("Original text");
    });

    it("returns base text unchanged for custom", () => {
      const state = { ...baseState, outputProfile: "custom" };
      const result = buildDraftText("Custom content", state);
      expect(result).toBe("Custom content");
    });
  });

  it("defaults to linkedin when profile is unknown", () => {
    const state = { ...baseState, outputProfile: "unknown" };
    const result = buildDraftText("Test", state);
    expect(result).toBe("Test");
  });
});

describe("buildMarkdownExport", () => {
  it("creates markdown with title from intent", () => {
    const state = {
      intent: "Document Title",
      claims: [],
      expressions: {},
    };
    const result = buildMarkdownExport(state);
    expect(result).toBe("# Document Title");
  });

  it("creates section headers from claims with expressions", () => {
    const state = {
      intent: "Title",
      claims: [
        { id: "c1", text: "Section 1" },
        { id: "c2", text: "Section 2" },
      ],
      expressions: {
        c1: "Content 1",
        c2: "Content 2",
      },
    };
    const result = buildMarkdownExport(state);

    expect(result).toContain("# Title");
    expect(result).toContain("## Section 1");
    expect(result).toContain("Content 1");
    expect(result).toContain("## Section 2");
    expect(result).toContain("Content 2");
  });

  it("creates bullet list when claims have no expressions", () => {
    const state = {
      intent: "List Title",
      claims: [
        { id: "c1", text: "Item 1" },
        { id: "c2", text: "Item 2" },
      ],
      expressions: {},
    };
    const result = buildMarkdownExport(state);

    expect(result).toContain("# List Title");
    expect(result).toContain("- Item 1");
    expect(result).toContain("- Item 2");
    expect(result).not.toContain("##");
  });

  it("handles empty state", () => {
    const state = {
      intent: "",
      claims: [],
      expressions: {},
    };
    const result = buildMarkdownExport(state);
    expect(result).toBe("");
  });

  it("filters empty claims", () => {
    const state = {
      intent: "Title",
      claims: [
        { id: "c1", text: "Valid" },
        { id: "c2", text: "" },
      ],
      expressions: {},
    };
    const result = buildMarkdownExport(state);
    expect(result).toContain("- Valid");
    expect(result.match(/-/g)).toHaveLength(1);
  });
});

describe("isFirstTimeUser", () => {
  it("returns true for completely empty state", () => {
    const state = {
      intent: "",
      claims: [{ id: "c1", text: "" }],
      expressions: {},
    };
    expect(isFirstTimeUser(state)).toBe(true);
  });

  it("returns true for whitespace-only content", () => {
    const state = {
      intent: "   ",
      claims: [{ id: "c1", text: "   " }],
      expressions: { c1: "   " },
    };
    expect(isFirstTimeUser(state)).toBe(true);
  });

  it("returns false when intent has content", () => {
    const state = {
      intent: "Some intent",
      claims: [{ id: "c1", text: "" }],
      expressions: {},
    };
    expect(isFirstTimeUser(state)).toBe(false);
  });

  it("returns false when a claim has content", () => {
    const state = {
      intent: "",
      claims: [
        { id: "c1", text: "" },
        { id: "c2", text: "A claim" },
      ],
      expressions: {},
    };
    expect(isFirstTimeUser(state)).toBe(false);
  });

  it("returns false when an expression has content", () => {
    const state = {
      intent: "",
      claims: [{ id: "c1", text: "" }],
      expressions: { c1: "An expression" },
    };
    expect(isFirstTimeUser(state)).toBe(false);
  });

  it("handles missing fields gracefully", () => {
    expect(isFirstTimeUser({})).toBe(true);
    expect(isFirstTimeUser({ intent: null, claims: null, expressions: null })).toBe(true);
  });
});

describe("edge cases", () => {
  describe("very long content", () => {
    it("handles very long intent text", () => {
      const state = {
        intent: "A".repeat(10000),
        claims: [],
        expressions: {},
        linkedin: {},
      };
      const result = buildLinkedInDraft(state);
      expect(result.length).toBeGreaterThan(9000);
    });

    it("handles many claims", () => {
      const claims = Array.from({ length: 100 }, (_, i) => ({
        id: `c${i}`,
        text: `Claim number ${i}`,
      }));
      const state = {
        intent: "Many claims",
        claims,
        expressions: {},
        linkedin: { includeBullets: true, maxBullets: 12 },
      };
      const result = buildLinkedInDraft(state);
      expect(result).toContain("• Claim number 0");
      expect(result).toContain("• Claim number 11");
      // Should stop at maxBullets
      expect(result).not.toContain("• Claim number 12");
    });
  });

  describe("special characters", () => {
    it("preserves unicode in claims", () => {
      const state = {
        intent: "Unicode test",
        claims: [{ id: "c1", text: "日本語 🎉 émoji" }],
        expressions: {},
      };
      const result = buildFullBreakdown(state);
      expect(result).toContain("日本語 🎉 émoji");
    });

    it("preserves newlines in expressions", () => {
      const state = {
        intent: "Test",
        claims: [{ id: "c1", text: "Claim" }],
        expressions: { c1: "Line 1\nLine 2\nLine 3" },
        linkedin: {},
      };
      const result = buildLinkedInDraft(state);
      expect(result).toContain("Line 1\nLine 2\nLine 3");
    });
  });

  describe("malformed input", () => {
    it("handles claims with missing id", () => {
      const state = {
        intent: "Test",
        claims: [{ text: "No ID claim" }],
        expressions: {},
      };
      // Should not throw
      const result = getCleanClaims(state.claims);
      expect(result[0].text).toBe("No ID claim");
    });

    it("handles expressions with non-string values", () => {
      const state = {
        intent: "Test",
        claims: [{ id: "c1", text: "Claim" }],
        expressions: { c1: 12345 },
        linkedin: {},
      };
      // Should handle gracefully
      const result = buildLinkedInDraft(state);
      expect(typeof result).toBe("string");
    });
  });
});
