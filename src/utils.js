// Utility functions extracted for testing
// These mirror the logic in main.js

export const OUTPUT_PROFILES = {
  linkedin: {
    label: "LinkedIn Post",
    maxChars: 3000,
    hint: "Short hook, whitespace, skimmable.",
  },
  xthread: {
    label: "X / Twitter Thread",
    maxChars: 25000,
    chunkSize: 280,
    hint: "Split into numbered posts (1/n).",
  },
  email: {
    label: "Email",
    maxChars: 20000,
    hint: "Subject + body.",
  },
  memo: {
    label: "Memo",
    maxChars: 20000,
    hint: "Title, TL;DR, bullets, next steps.",
  },
  blog: {
    label: "Blog / Article",
    maxChars: 100000,
    hint: "Headings + longer paragraphs.",
  },
  custom: {
    label: "Custom",
    maxChars: 20000,
    hint: "Your rules.",
  },
};

export function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function splitIntoThread(text, size = 280) {
  const chunks = [];
  let remaining = text.trim();

  while (remaining.length > size) {
    let cut = remaining.lastIndexOf("\n", size);
    if (cut < 120) cut = remaining.lastIndexOf(" ", size);
    if (cut < 120) cut = size;

    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);

  const n = chunks.length;
  return chunks.map((c, i) => `${i + 1}/${n}\n${c}`);
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function validateOutputProfile(profile) {
  return OUTPUT_PROFILES[profile] ? profile : "linkedin";
}

export function getCharacterCount(text) {
  return (text || "").length;
}

export function isOverCharacterLimit(text, profile) {
  const profileConfig = OUTPUT_PROFILES[profile] || OUTPUT_PROFILES.linkedin;
  return getCharacterCount(text) > profileConfig.maxChars;
}

const STORAGE_KEY = "inkwise:v1";

export function createDefaultState() {
  return {
    phase: "intent",
    intent: "",
    claims: [{ id: "test-id", text: "" }],
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
}

export function saveStateToStorage(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}
