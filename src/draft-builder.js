// Draft building functions extracted for testing
// These are pure functions that transform state into draft text

import { clampInt, splitIntoThread, OUTPUT_PROFILES } from "./utils.js";

/**
 * Filters claims to only include non-empty ones
 * @param {Array<{id: string, text: string}>} claims
 * @returns {Array<{id: string, text: string}>}
 */
export function getCleanClaims(claims) {
  return claims.map((c) => ({ ...c, text: (c.text || "").trim() })).filter((c) => c.text.length);
}

/**
 * Gets non-empty expression paragraphs for claims
 * @param {Array<{id: string, text: string}>} claims
 * @param {Record<string, string>} expressions
 * @returns {string[]}
 */
export function getCleanParagraphs(claims, expressions) {
  return claims
    .map((c) => {
      const expr = expressions[c.id];
      // Handle non-string values gracefully
      if (typeof expr !== "string") return "";
      return expr.trim();
    })
    .filter(Boolean);
}

/**
 * Builds a LinkedIn-formatted draft from state
 * @param {object} state - The application state
 * @returns {string}
 */
export function buildLinkedInDraft(state) {
  const intent = (state.intent || "").trim();
  const cfg = state.linkedin || {};

  const claims = getCleanClaims(state.claims || []);
  const paragraphs = getCleanParagraphs(claims, state.expressions || {});

  const lines = [];

  const hook = (cfg.hookOverride || "").trim() || intent;
  if (hook) {
    lines.push(hook);
    lines.push("");
  }

  if (cfg.includeBullets && claims.length) {
    const n = clampInt(cfg.maxBullets, 1, 12, 5);
    const intro = (cfg.bulletIntro || "").trim();
    if (intro) lines.push(intro);

    claims.slice(0, n).forEach((c) => lines.push(`• ${c.text}`));
    lines.push("");
  }

  if (paragraphs.length) {
    for (const p of paragraphs) {
      lines.push(p);
      lines.push("");
    }
  } else if (!hook && claims.length) {
    claims.slice(0, clampInt(cfg.maxBullets, 1, 12, 5)).forEach((c) => {
      lines.push(c.text);
      lines.push("");
    });
  } else if (!hook) {
    lines.push("(Add intent/claims/expressions to generate a draft.)");
    lines.push("");
  }

  if (cfg.includeCTA) {
    const cta = (cfg.ctaText || "").trim();
    if (cta) {
      lines.push(cta);
      lines.push("");
    }
  }

  if (cfg.includeSignature) {
    const sig = (cfg.signature || "").trim();
    if (sig) {
      lines.push(sig);
      lines.push("");
    }
  }

  if (cfg.includeHashtags) {
    const tags = (cfg.hashtags || "").trim();
    if (tags) {
      lines.push(tags);
      lines.push("");
    }
  }

  return lines.join("\n").trim();
}

/**
 * Builds a full breakdown showing Intent, Structure, Expression sections
 * @param {object} state - The application state
 * @returns {string}
 */
export function buildFullBreakdown(state) {
  const intent = (state.intent || "").trim();
  const claims = getCleanClaims(state.claims || []);
  const paragraphs = getCleanParagraphs(claims, state.expressions || {});

  const lines = [];

  if (intent) {
    lines.push("INTENT");
    lines.push(intent);
    lines.push("");
  }

  if (claims.length) {
    lines.push("STRUCTURE");
    claims.forEach((c) => lines.push(`• ${c.text}`));
    lines.push("");
  }

  if (paragraphs.length) {
    lines.push("EXPRESSION");
    paragraphs.forEach((p) => {
      lines.push(p);
      lines.push("");
    });
  }

  return lines.join("\n").trim();
}

/**
 * Formats draft text according to the output profile
 * @param {string} baseText - The base draft text
 * @param {object} state - The application state
 * @returns {string}
 */
export function buildDraftText(baseText, state) {
  const profile = state.outputProfile || "linkedin";
  const p = OUTPUT_PROFILES[profile];

  if (profile === "email") {
    const subject =
      (state.linkedin?.hookOverride || "").trim() || (state.intent || "").trim() || "Quick note";
    return `Subject: ${subject}\n\n${baseText.trim()}`;
  }

  if (profile === "memo") {
    const title = (state.intent || "").trim() || "Memo";
    const claims = getCleanClaims(state.claims || []);
    const bulletPoints = claims.length
      ? claims
          .slice(0, 5)
          .map((c) => `- ${c.text}`)
          .join("\n")
      : "- ";
    return `TITLE\n${title}\n\nTL;DR\n${bulletPoints}\n\nDETAILS\n${baseText.trim()}\n\nNEXT STEPS\n- `;
  }

  if (profile === "xthread") {
    return splitIntoThread(baseText, p?.chunkSize || 280).join("\n\n---\n\n");
  }

  if (profile === "blog") {
    const title = (state.intent || "").trim();
    const claims = getCleanClaims(state.claims || []);
    let output = "";
    if (title) output += `# ${title}\n\n`;

    const paragraphs = getCleanParagraphs(claims, state.expressions || {});
    if (paragraphs.length && claims.length) {
      claims.forEach((c, i) => {
        output += `## ${c.text}\n\n`;
        if (paragraphs[i]) output += `${paragraphs[i]}\n\n`;
      });
    } else {
      output += baseText.trim();
    }
    return output.trim();
  }

  // linkedin, custom: return base text as-is
  return baseText;
}

/**
 * Builds a markdown export from state
 * @param {object} state - The application state
 * @returns {string}
 */
export function buildMarkdownExport(state) {
  const intent = (state.intent || "").trim();
  const claims = getCleanClaims(state.claims || []);
  const paragraphs = getCleanParagraphs(claims, state.expressions || {});

  const lines = [];

  if (intent) {
    lines.push(`# ${intent}`);
    lines.push("");
  }

  if (claims.length && paragraphs.length) {
    claims.forEach((c, i) => {
      lines.push(`## ${c.text}`);
      lines.push("");
      if (paragraphs[i]) {
        lines.push(paragraphs[i]);
        lines.push("");
      }
    });
  } else if (claims.length) {
    claims.forEach((c) => {
      lines.push(`- ${c.text}`);
    });
    lines.push("");
  }

  return lines.join("\n").trim();
}

/**
 * Checks if user is a first-time user (no content entered)
 * @param {object} state - The application state
 * @returns {boolean}
 */
export function isFirstTimeUser(state) {
  const hasIntent = (state.intent || "").trim().length > 0;
  const hasClaims = (state.claims || []).some((c) => (c.text || "").trim().length > 0);
  const hasExpressions = Object.values(state.expressions || {}).some(
    (e) => (e || "").trim().length > 0
  );
  return !hasIntent && !hasClaims && !hasExpressions;
}
