import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  OUTPUT_PROFILES,
  clampInt,
  splitIntoThread,
  escapeHtml,
  validateOutputProfile,
  getCharacterCount,
  isOverCharacterLimit,
  createDefaultState,
  saveStateToStorage,
  loadStateFromStorage,
  clearStorage,
} from "./utils.js";

describe("OUTPUT_PROFILES", () => {
  it("should have correct constraints for LinkedIn", () => {
    expect(OUTPUT_PROFILES.linkedin.maxChars).toBe(3000);
    expect(OUTPUT_PROFILES.linkedin.label).toBe("LinkedIn Post");
  });

  it("should have correct constraints for X/Twitter", () => {
    expect(OUTPUT_PROFILES.xthread.maxChars).toBe(25000);
    expect(OUTPUT_PROFILES.xthread.chunkSize).toBe(280);
    expect(OUTPUT_PROFILES.xthread.label).toBe("X / Twitter Thread");
  });

  it("should have all 6 profile types", () => {
    const profileKeys = Object.keys(OUTPUT_PROFILES);
    expect(profileKeys).toContain("linkedin");
    expect(profileKeys).toContain("xthread");
    expect(profileKeys).toContain("email");
    expect(profileKeys).toContain("memo");
    expect(profileKeys).toContain("blog");
    expect(profileKeys).toContain("custom");
    expect(profileKeys.length).toBe(6);
  });
});

describe("clampInt", () => {
  it("should clamp value within range", () => {
    expect(clampInt(5, 1, 10, 5)).toBe(5);
    expect(clampInt(0, 1, 10, 5)).toBe(1);
    expect(clampInt(15, 1, 10, 5)).toBe(10);
  });

  it("should return fallback for non-numeric input", () => {
    expect(clampInt("abc", 1, 10, 5)).toBe(5);
    expect(clampInt(undefined, 1, 10, 7)).toBe(7);
    expect(clampInt(null, 1, 10, 3)).toBe(3);
  });
});

describe("splitIntoThread", () => {
  it("should split long text into numbered chunks", () => {
    const longText = "A".repeat(300) + " " + "B".repeat(300);
    const chunks = splitIntoThread(longText, 280);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toMatch(/^1\/\d+\n/);
    expect(chunks[1]).toMatch(/^2\/\d+\n/);
  });

  it("should not split short text", () => {
    const shortText = "Hello world";
    const chunks = splitIntoThread(shortText, 280);

    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe("1/1\nHello world");
  });

  it("should handle empty text", () => {
    const chunks = splitIntoThread("", 280);
    expect(chunks.length).toBe(0);
  });
});

describe("escapeHtml", () => {
  it("should escape HTML special characters", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    expect(escapeHtml('"quoted"')).toBe("&quot;quoted&quot;");
    expect(escapeHtml("'single'")).toBe("&#039;single&#039;");
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("should handle non-string values", () => {
    expect(escapeHtml(123)).toBe("123");
    expect(escapeHtml(null)).toBe("null");
  });
});

describe("validateOutputProfile", () => {
  it("should return valid profile unchanged", () => {
    expect(validateOutputProfile("linkedin")).toBe("linkedin");
    expect(validateOutputProfile("xthread")).toBe("xthread");
    expect(validateOutputProfile("email")).toBe("email");
  });

  it("should return linkedin for invalid profile", () => {
    expect(validateOutputProfile("invalid")).toBe("linkedin");
    expect(validateOutputProfile("")).toBe("linkedin");
    expect(validateOutputProfile(null)).toBe("linkedin");
  });
});

describe("character counting", () => {
  it("should count characters correctly", () => {
    expect(getCharacterCount("hello")).toBe(5);
    expect(getCharacterCount("")).toBe(0);
    expect(getCharacterCount(null)).toBe(0);
  });

  it("should detect when over limit for LinkedIn", () => {
    const shortText = "A".repeat(100);
    const longText = "A".repeat(3500);

    expect(isOverCharacterLimit(shortText, "linkedin")).toBe(false);
    expect(isOverCharacterLimit(longText, "linkedin")).toBe(true);
  });

  it("should use profile-specific limits", () => {
    const mediumText = "A".repeat(5000);

    expect(isOverCharacterLimit(mediumText, "linkedin")).toBe(true); // 3000 limit
    expect(isOverCharacterLimit(mediumText, "email")).toBe(false); // 20000 limit
  });
});

describe("localStorage persistence", () => {
  beforeEach(() => {
    clearStorage();
  });

  afterEach(() => {
    clearStorage();
  });

  it("should save and load state from localStorage", () => {
    const state = createDefaultState();
    state.intent = "Test intent";
    state.outputProfile = "email";

    saveStateToStorage(state);
    const loaded = loadStateFromStorage();

    expect(loaded.intent).toBe("Test intent");
    expect(loaded.outputProfile).toBe("email");
  });

  it("should return null when no state exists", () => {
    const loaded = loadStateFromStorage();
    expect(loaded).toBeNull();
  });

  it("should create default state with correct structure", () => {
    const state = createDefaultState();

    expect(state.phase).toBe("intent");
    expect(state.outputProfile).toBe("linkedin");
    expect(state.claims).toHaveLength(1);
    expect(state.linkedin.includeCTA).toBe(true);
  });
});

describe("state reset/clear", () => {
  beforeEach(() => {
    clearStorage();
  });

  afterEach(() => {
    clearStorage();
  });

  it("should clear state from localStorage", () => {
    const state = createDefaultState();
    state.intent = "Some content";
    saveStateToStorage(state);

    expect(loadStateFromStorage()).not.toBeNull();

    clearStorage();

    expect(loadStateFromStorage()).toBeNull();
  });
});
