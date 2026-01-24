// src/main.js
import "./style.css";
import { extractStateFromImport, createSessionExport } from "./schemas.js";

// Inkwise v2.0 — Fortune-500 Quality
// Intent → Structure → Expression → Draft (LinkedIn-optimized)

// ---------- Structured Logger ----------
const logger = {
  _format(level, message, context) {
    const timestamp = new Date().toISOString();
    const ctx = context ? ` ${JSON.stringify(context)}` : "";
    return `[${timestamp}] ${level}: ${message}${ctx}`;
  },
  info(message, context) {
    console.info(this._format("INFO", message, context));
  },
  warn(message, context) {
    console.warn(this._format("WARN", message, context));
  },
  error(message, context) {
    console.error(this._format("ERROR", message, context));
  },
};

// ---------- Global Error Handler ----------
window.addEventListener("error", (event) => {
  logger.error("Uncaught error", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logger.error("Unhandled promise rejection", {
    reason: String(event.reason),
  });
});

// ---------- Debounce Utility ----------
function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

const STORAGE_KEY = "inkwise:v1";
const root = document.querySelector("#app");

// --------- small compatibility helpers ----------
const clone = (obj) => {
  if (typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
};

const uuid = () => {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(16).slice(2) + Date.now().toString(16);
};

const pad2 = (n) => String(n).padStart(2, "0");
const fileStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(
    d.getMinutes()
  )}${pad2(d.getSeconds())}`;
};

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// ---------- Output Profiles ----------
const OUTPUT_PROFILES = {
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

// ---------- state ----------
const DEFAULT_STATE = {
  phase: "intent",
  intent: "",
  claims: [{ id: uuid(), text: "" }],
  expressions: {}, // { [claimId]: string }
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

function sanitizeAndMergeState(maybeState) {
  const candidate =
    maybeState &&
    typeof maybeState === "object" &&
    maybeState.state &&
    typeof maybeState.state === "object" &&
    maybeState.version &&
    String(maybeState.version).startsWith("inkwise:session:")
      ? maybeState.state
      : maybeState;

  const parsed = candidate && typeof candidate === "object" ? candidate : {};

  const merged = {
    ...clone(DEFAULT_STATE),
    ...parsed,
    claims: Array.isArray(parsed.claims) && parsed.claims.length ? parsed.claims : clone(DEFAULT_STATE.claims),
    expressions: parsed.expressions && typeof parsed.expressions === "object" ? parsed.expressions : {},
    ui: {
      ...clone(DEFAULT_STATE.ui),
      ...(parsed.ui && typeof parsed.ui === "object" ? parsed.ui : {}),
    },
    linkedin: {
      ...clone(DEFAULT_STATE.linkedin),
      ...(parsed.linkedin && typeof parsed.linkedin === "object" ? parsed.linkedin : {}),
    },
  };

  merged.claims = merged.claims.map((c) => ({
    id: c && c.id ? c.id : uuid(),
    text: c && typeof c.text === "string" ? c.text : "",
  }));

  merged.linkedin.maxBullets = clampInt(merged.linkedin.maxBullets, 1, 12, 5);

  const allowed = new Set(["intent", "structure", "expression", "draft"]);
  if (!allowed.has(merged.phase)) merged.phase = "intent";

  // Validate outputProfile
  if (!OUTPUT_PROFILES[merged.outputProfile]) {
    merged.outputProfile = "linkedin";
  }

  return merged;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(DEFAULT_STATE);
    return sanitizeAndMergeState(JSON.parse(raw));
  } catch {
    return clone(DEFAULT_STATE);
  }
}

let state = loadState();

function saveStateImmediate() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    logger.error("Failed to save state to localStorage", { error: String(err) });
  }
}

const saveState = debounce(saveStateImmediate, 300);

function setState(patch, { rerender = true } = {}) {
  state = { ...state, ...patch };
  saveState();
  if (rerender) render();
}

function replaceState(nextState, { rerender = true } = {}) {
  state = sanitizeAndMergeState(nextState);
  saveState();
  if (rerender) render();
}

function setPhase(phase) {
  setState({ phase }, { rerender: true });
}

function updateIntent(nextIntent) {
  setState({ intent: nextIntent }, { rerender: false });
}

function updateClaim(claimId, nextText) {
  const claims = state.claims.map((c) => (c.id === claimId ? { ...c, text: nextText } : c));
  setState({ claims }, { rerender: false });
}

function addClaim() {
  setState({ claims: [...state.claims, { id: uuid(), text: "" }] }, { rerender: true });
}

function removeClaim(claimId) {
  const claims = state.claims.filter((c) => c.id !== claimId);
  const expressions = { ...state.expressions };
  delete expressions[claimId];

  setState(
    {
      claims: claims.length ? claims : [{ id: uuid(), text: "" }],
      expressions,
    },
    { rerender: true }
  );
}

function moveClaim(claimId, direction) {
  const index = state.claims.findIndex((c) => c.id === claimId);
  if (index < 0) return;

  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= state.claims.length) return;

  const claims = [...state.claims];
  const [item] = claims.splice(index, 1);
  claims.splice(nextIndex, 0, item);
  setState({ claims }, { rerender: true });
}

function updateExpression(claimId, nextText) {
  setState({ expressions: { ...state.expressions, [claimId]: nextText } }, { rerender: false });
}

function updateLinkedInField(path, value, { rerender = false } = {}) {
  setState({ linkedin: { ...state.linkedin, [path]: value } }, { rerender });
}

function updateUIField(path, value, { rerender = false } = {}) {
  setState({ ui: { ...state.ui, [path]: value } }, { rerender });
}

function getActiveCount() {
  return { nonEmptyClaims: state.claims.filter((c) => c.text.trim()).length };
}

// ---------- Draft builders ----------
function getCleanClaims() {
  return state.claims.map((c) => ({ ...c, text: (c.text || "").trim() })).filter((c) => c.text.length);
}

function getCleanParagraphs(claims) {
  return claims.map((c) => (state.expressions[c.id] || "").trim()).filter(Boolean);
}

function buildLinkedInDraft() {
  const intent = (state.intent || "").trim();
  const cfg = state.linkedin;

  const claims = getCleanClaims();
  const paragraphs = getCleanParagraphs(claims);

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

function buildFullBreakdown() {
  const intent = (state.intent || "").trim();
  const claims = getCleanClaims();
  const paragraphs = getCleanParagraphs(claims);

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

// ---------- Profile-aware draft formatting ----------
function splitIntoThread(text, size = 280) {
  const chunks = [];
  let remaining = text.trim();

  while (remaining.length > size) {
    // Try to break on a newline or space
    let cut = remaining.lastIndexOf("\n", size);
    if (cut < 120) cut = remaining.lastIndexOf(" ", size);
    if (cut < 120) cut = size;

    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);

  // Add numbering (1/n format)
  const n = chunks.length;
  return chunks.map((c, i) => `${i + 1}/${n}\n${c}`);
}

function buildDraftText(baseText) {
  const profile = state.outputProfile;
  const p = OUTPUT_PROFILES[profile];

  if (profile === "email") {
    const subject = (state.linkedin?.hookOverride || "").trim() || (state.intent || "").trim() || "Quick note";
    return `Subject: ${subject}\n\n${baseText.trim()}`;
  }

  if (profile === "memo") {
    const title = (state.intent || "").trim() || "Memo";
    const claims = getCleanClaims();
    const bulletPoints = claims.length
      ? claims
          .slice(0, 5)
          .map((c) => `- ${c.text}`)
          .join("\n")
      : "- ";
    return `TITLE\n${title}\n\nTL;DR\n${bulletPoints}\n\nDETAILS\n${baseText.trim()}\n\nNEXT STEPS\n- `;
  }

  if (profile === "xthread") {
    return splitIntoThread(baseText, p.chunkSize || 280).join("\n\n---\n\n");
  }

  if (profile === "blog") {
    const title = (state.intent || "").trim();
    const claims = getCleanClaims();
    let output = "";
    if (title) output += `# ${title}\n\n`;

    // Use claims as section headers if we have expressions
    const paragraphs = getCleanParagraphs(claims);
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

// ---------- Toast notifications ----------
let toastTimeout = null;

function showToast(message, type = "info") {
  // Remove existing toast
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  if (toastTimeout) clearTimeout(toastTimeout);

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = message;

  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add("toast--visible");
  });

  toastTimeout = setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!", "success");
  } catch {
    window.prompt("Copy this:", text);
  }
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadJsonFile(filename, obj) {
  const text = JSON.stringify(obj, null, 2);
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Session Export / Import ----------
function exportSession() {
  const payload = createSessionExport(state);
  downloadJsonFile(`inkwise_session_${fileStamp()}.json`, payload);
}

async function importSessionFromFile(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const result = extractStateFromImport(parsed);

    if (!result.success) {
      const errorResult = /** @type {{ success: false, error: string }} */ (result);
      showToast(errorResult.error, "error");
      return;
    }

    replaceState(result.data, { rerender: true });
    if (state.phase !== "draft") setPhase("draft");
    showToast("Session imported successfully!", "success");
  } catch (err) {
    console.error(err);
    showToast("Import failed. Make sure this is a valid Inkwise session .json file.", "error");
  }
}

// ---------- Quickstart Presets ----------
function presetLabel(id) {
  const map = {
    systems_coordination: "Systems: Coordination Tax",
    sf_homeless_spend: "Civic: Dollars → Outcomes",
    ai_energy_wall: "AI: Inference Hits Infrastructure",
    travel_trust: "Business: Trust > Hype (Travel)",
  };
  return map[id] || id;
}

function makePreset(name, { intent, claims, expressions, linkedin }) {
  const claimObjs = claims.map((t) => ({ id: uuid(), text: t }));
  const exprMap = {};
  claimObjs.forEach((c, i) => {
    exprMap[c.id] = expressions[i] || "";
  });

  return {
    id: name,
    label: presetLabel(name),
    patch: {
      intent,
      claims: claimObjs.length ? claimObjs : [{ id: uuid(), text: "" }],
      expressions: exprMap,
      linkedin: {
        ...state.linkedin,
        ...(linkedin || {}),
      },
      ui: {
        ...state.ui,
        presetId: name,
      },
      phase: "draft",
    },
  };
}

const PRESETS = [
  makePreset("systems_coordination", {
    intent: "If your system needs constant coordination to function, it’s already failing.",
    claims: [
      "Coordination feels productive, but it often signals fragility.",
      "Good systems degrade gracefully without heroics.",
      "The fix is ownership + interfaces, not more meetings.",
    ],
    expressions: [
      "Coordination can look like momentum because everyone is busy routing around gaps. But the busier the routing layer gets, the more you’re paying a hidden tax to keep the machine upright.",
      "Strong systems don’t require heroic people to keep them standing. They have clear handoffs, obvious defaults, and predictable failure modes—so output stays acceptable even when someone is out.",
      "The boring upgrade is the real one: assign an owner, define inputs/outputs, set a cadence, and write the “when this breaks” fallback. Meetings don’t scale. Interfaces do.",
    ],
    linkedin: { includeCTA: true, ctaText: "Where do you see coordination masquerading as execution?" },
  }),
  makePreset("sf_homeless_spend", {
    intent: "The question isn’t moral. It’s mechanical: what happens to a dollar between appropriation and outcome?",
    claims: [
      "High spend doesn’t automatically produce visible results.",
      "Complexity can absorb resources before they reach outcomes.",
      "The right KPI is time-to-outcome, not dollars allocated.",
    ],
    expressions: [
      "You can pour real money into a problem and still have the street-level reality look unchanged. That doesn’t prove bad intent—it proves the system between funding and outcomes matters more than the funding itself.",
      "When a program becomes an ecosystem, complexity becomes a sponge. Layers of process, eligibility, handoffs, and vendors can absorb the value before it ever becomes a bed, a treatment slot, or a stabilized person.",
      "The metric that should scare you is time-to-outcome. How long from appropriation to a measurable change? If it’s measured in years, the system is optimized for throughput—not resolution.",
    ],
    linkedin: { includeBullets: true, bulletIntro: "Three mechanical questions:", maxBullets: 3 },
  }),
  makePreset("ai_energy_wall", {
    intent: "The bottleneck isn’t compute. It’s electricity.",
    claims: [
      "Training is a sprint; inference is a marathon through grids and permitting.",
      "Interconnection queues + transmission timelines are the real constraint.",
      "Winners will pair models with power strategy, not just GPUs.",
    ],
    expressions: [
      "Everyone debates chips and model capability. But deploying intelligence at scale means running inference constantly—and that load has to go through physical infrastructure.",
      "Interconnection queues, transmission buildout, and permitting timelines move on a multi-year clock. That clock doesn’t care how fast your model improves.",
      "The competitive edge won’t just be better models. It will be securing power, siting compute intelligently, and engineering reliability as a first-class product constraint.",
    ],
    linkedin: { includeBullets: true, includeHashtags: true, hashtags: "#ai #infrastructure #energy #datacenters" },
  }),
  makePreset("travel_trust", {
    intent: "In travel, trust is the product. The itinerary is the delivery vehicle.",
    claims: [
      "People don’t buy trips; they buy certainty.",
      "Your system should reduce decisions, not add options.",
      "Overdeliver quietly: clear expectations, clean handoffs, fast fixes.",
    ],
    expressions: [
      "Most clients aren’t paying for flights and hotels—they’re paying to stop worrying. The real value is confidence: that someone competent is holding the details.",
      "A good travel workflow narrows choices into a few strong options with tradeoffs explained. Too many options feels like homework, not service.",
      "The brand is built in the moments that go wrong: quick rebooks, proactive updates, and calm accountability. Never oversell. Always overdeliver.",
    ],
    linkedin: { includeHashtags: true, hashtags: "#customerservice #systems #travel", includeSignature: true },
  }),
];

function applyPreset(presetId) {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) return;

  const nextLinkedIn = { ...state.linkedin, ...(preset.patch.linkedin || {}) };

  setState(
    {
      ...preset.patch,
      linkedin: nextLinkedIn,
      ui: { ...state.ui, presetId },
      phase: "draft",
    },
    { rerender: true }
  );
}

// ---------- Demo Project ----------
async function loadDemoProject() {
  try {
    const response = await fetch("/fixtures/demo-project.json");
    if (!response.ok) throw new Error("Failed to load demo project");

    const data = await response.json();
    const result = extractStateFromImport(data);

    if (!result.success) {
      const errorResult = /** @type {{ success: false, error: string }} */ (result);
      showToast(errorResult.error, "error");
      return;
    }

    replaceState(result.data, { rerender: true });
    showToast("Demo project loaded! Explore the workflow.", "success");
  } catch (err) {
    console.error(err);
    showToast("Failed to load demo project.", "error");
  }
}

// ---------- Progress Indicator ----------
function renderProgress() {
  const phases = [
    { key: "intent", label: "Intent" },
    { key: "structure", label: "Structure" },
    { key: "expression", label: "Expression" },
    { key: "draft", label: "Draft" },
  ];

  const currentIndex = phases.findIndex((p) => p.key === state.phase);

  return `
    <div class="progress-bar" role="navigation" aria-label="Workflow progress">
      ${phases
        .map((p, i) => {
          const isActive = i === currentIndex;
          const isCompleted = i < currentIndex;
          const stepClass = isActive ? "progress-step--active" : isCompleted ? "progress-step--completed" : "";
          const lineClass = isCompleted ? "progress-line--completed" : "";

          return `
            <button
              class="progress-step ${stepClass}"
              data-action="set-phase"
              data-phase="${p.key}"
              aria-current="${isActive ? "step" : "false"}"
            >
              <span class="progress-dot"></span>
              <span>${escapeHtml(p.label)}</span>
            </button>
            ${i < phases.length - 1 ? `<div class="progress-line ${lineClass}"></div>` : ""}
          `;
        })
        .join("")}
    </div>
  `;
}

// ---------- Empty State ----------
function isFirstTimeUser() {
  // Check if user has any content
  const hasIntent = state.intent.trim().length > 0;
  const hasClaims = state.claims.some((c) => c.text.trim().length > 0);
  const hasExpressions = Object.values(state.expressions).some((e) => e.trim().length > 0);
  return !hasIntent && !hasClaims && !hasExpressions;
}

function renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">&#9998;</div>
      <div class="empty-state-title">Welcome to Inkwise</div>
      <div class="empty-state-description">
        Transform rough ideas into polished drafts using a structured workflow:
        Intent → Structure → Expression → Draft
      </div>
      <div class="row" style="justify-content: center; gap: 12px;">
        <button data-action="load-demo" class="btn btn--primary">Load Demo Project</button>
        <button data-action="start-fresh" class="btn">Start Fresh</button>
      </div>
    </div>
  `;
}

// ---------- Export Functions ----------
function buildMarkdownExport() {
  const intent = (state.intent || "").trim();
  const claims = getCleanClaims();
  const paragraphs = getCleanParagraphs(claims);

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

function downloadMarkdown() {
  const md = buildMarkdownExport();
  const profileKey = state.outputProfile || "linkedin";
  downloadTextFile(`inkwise_${profileKey}_${fileStamp()}.md`, md);
  showToast("Markdown downloaded!", "success");
}

function exportProjectJson() {
  const payload = createSessionExport(state);
  downloadJsonFile(`inkwise_project_${fileStamp()}.json`, payload);
  showToast("Project exported!", "success");
}

// ---------- UI ----------
function navButton(phase, label) {
  const active = state.phase === phase;
  return `
    <button
      data-action="set-phase"
      data-phase="${phase}"
      class="nav-btn ${active ? "nav-btn--active" : ""}"
    >${escapeHtml(label)}</button>
  `;
}

function pageShell(contentHtml) {
  const { nonEmptyClaims } = getActiveCount();

  const profileOptions = Object.entries(OUTPUT_PROFILES)
    .map(
      ([key, p]) =>
        `<option value="${key}" ${state.outputProfile === key ? "selected" : ""}>${escapeHtml(p.label)}</option>`
    )
    .join("");

  const profilePicker = `
    <label class="profile-picker">
      <span class="muted">Output</span>
      <select data-action="set-output-profile" class="select select--compact">
        ${profileOptions}
      </select>
    </label>
  `;

  return `
    <div class="app-shell">
      <header class="app-header">
        <div>
          <div class="brand-title">Inkwise</div>
          <div class="brand-subtitle">Intent → Structure → Expression</div>
          <div class="brand-meta">Claims: ${nonEmptyClaims}/${state.claims.length} • Autosave: on</div>
        </div>

        <div class="header-right">
          ${profilePicker}
          <nav class="nav">
            ${navButton("intent", "Intent")}
            ${navButton("structure", "Structure")}
            ${navButton("expression", "Expression")}
            ${navButton("draft", "Draft")}
          </nav>
        </div>
      </header>

      <main class="main-card">
        ${renderProgress()}
        ${contentHtml}
      </main>

      <footer class="footer-tip">
        Local-first: Your data stays in your browser. No account required.
      </footer>
    </div>
  `;
}

function renderIntent() {
  // Show empty state for first-time users
  if (isFirstTimeUser() && state.phase === "intent") {
    return renderEmptyState();
  }

  return `
    <h2 class="h2">Intent</h2>
    <div class="muted" id="intent-hint">Define what you're trying to say before you say it.</div>

    <div class="spacer-10"></div>

    <label for="intent-input" class="sr-only">Your intent</label>
    <textarea
      id="intent-input"
      data-field="intent"
      placeholder="What are you trying to say?"
      class="textarea textarea--h130"
      aria-describedby="intent-hint"
    >${escapeHtml(state.intent)}</textarea>

    <div class="row" style="margin-top:12px;">
      <button data-action="continue" data-next="structure" class="btn btn--primary">Continue to Structure →</button>
      <button data-action="load-demo" class="btn btn--ghost">Load Demo</button>
      <button data-action="reset" class="btn btn--ghost">Reset</button>
    </div>
  `;
}

function renderStructure() {
  return `
    <h2 class="h2">Structure</h2>
    <div class="muted" id="structure-hint">Turn intent into ordered claims.</div>

    <div class="spacer-10"></div>

    <div class="stack" role="list" aria-label="Claims">
      ${state.claims
        .map(
          (c, idx) => `
          <div class="claim-row" role="listitem">
            <div class="claim-index" aria-hidden="true">${idx + 1}.</div>

            <label for="claim-${c.id}" class="sr-only">Claim ${idx + 1}</label>
            <textarea
              id="claim-${c.id}"
              data-field="claim"
              data-claim-id="${c.id}"
              placeholder="Claim (one clear point)"
              class="textarea textarea--h70"
              style="flex:1;"
              aria-describedby="structure-hint"
            >${escapeHtml(c.text)}</textarea>

            <div class="claim-actions" role="group" aria-label="Claim ${idx + 1} actions">
              <button data-action="move-claim" data-claim-id="${c.id}" data-dir="up" class="mini-btn" aria-label="Move claim ${idx + 1} up" ${idx === 0 ? "disabled" : ""}>↑</button>
              <button data-action="move-claim" data-claim-id="${c.id}" data-dir="down" class="mini-btn" aria-label="Move claim ${idx + 1} down" ${idx === state.claims.length - 1 ? "disabled" : ""}>↓</button>
              <button data-action="remove-claim" data-claim-id="${c.id}" class="mini-btn mini-btn--ghost" aria-label="Remove claim ${idx + 1}">✕</button>
            </div>
          </div>
        `
        )
        .join("")}
    </div>

    <div class="row" style="margin-top:12px;">
      <button data-action="add-claim" class="btn">+ Add claim</button>
      <button data-action="continue" data-next="expression" class="btn btn--primary">Continue to Expression →</button>
    </div>
  `;
}

function renderExpression() {
  const claims = getCleanClaims();

  if (!claims.length) {
    return `
      <h2 class="h2">Expression</h2>
      <div class="muted">Translate each claim into prose.</div>

      <div class="spacer-10"></div>

      <div class="panel muted">Add at least one claim in Structure to write expressions.</div>

      <div class="row" style="margin-top:12px;">
        <button data-action="set-phase" data-phase="structure" class="btn">← Back to Structure</button>
      </div>
    `;
  }

  return `
    <h2 class="h2">Expression</h2>
    <div class="muted" id="expression-hint">Write the paragraphs that support your ordered claims.</div>

    <div class="spacer-10"></div>

    <div class="col">
      ${claims
        .map((c, idx) => {
          const current = state.expressions[c.id] || "";
          return `
            <div class="panel">
              <label for="expr-${c.id}" class="panel-title--700">${idx + 1}. ${escapeHtml(c.text)}</label>
              <textarea
                id="expr-${c.id}"
                data-field="expression"
                data-claim-id="${c.id}"
                placeholder="Write this as a clean paragraph…"
                class="textarea textarea--h110"
                aria-describedby="expression-hint"
              >${escapeHtml(current)}</textarea>
            </div>
          `;
        })
        .join("")}
    </div>

    <div class="row" style="margin-top:12px;">
      <button data-action="continue" data-next="draft" class="btn btn--primary">Continue to Draft →</button>
    </div>
  `;
}

function renderDraft() {
  const baseDraft = buildLinkedInDraft();
  const formattedDraft = buildDraftText(baseDraft);
  const full = buildFullBreakdown();
  const hasContent = baseDraft.trim().length > 0 && !baseDraft.includes("Add intent/claims/expressions");

  const cfg = state.linkedin;
  const profile = OUTPUT_PROFILES[state.outputProfile] || OUTPUT_PROFILES.linkedin;
  const profileKey = state.outputProfile;

  // Character counter
  const charCount = formattedDraft.length;
  const maxChars = profile.maxChars;
  const isOverLimit = charCount > maxChars;
  const charCountClass = isOverLimit ? "char-count char-count--over" : "char-count";

  const presetOptions = PRESETS.map(
    (p) => `<option value="${p.id}" ${state.ui.presetId === p.id ? "selected" : ""}>${escapeHtml(p.label)}</option>`
  ).join("");

  // Show LinkedIn controls only for linkedin profile
  const showLinkedInControls = profileKey === "linkedin";

  return `
    <h2 class="h2">Draft</h2>
    <div class="muted">${escapeHtml(profile.label)} output + controls + presets + exports.</div>
    <div class="muted-sm" style="margin-top:4px;">${escapeHtml(profile.hint)}</div>

    <div class="spacer-10"></div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-title">Quickstart Presets</div>

        <div class="row">
          <select data-field="ui-presetId" class="select">${presetOptions}</select>
          <button data-action="load-preset" class="btn">Load Example</button>
        </div>

        <div class="muted-sm" style="margin-top:10px;">
          Loads a complete example into Intent/Structure/Expression and jumps you to Draft.
        </div>

        <div class="divider"></div>

        <div class="panel-title">Export Options</div>
        <div class="row" style="flex-wrap: wrap;">
          <button data-action="copy-draft" class="btn" ${!hasContent ? "disabled" : ""}>Copy Text</button>
          <button data-action="download-draft" class="btn" ${!hasContent ? "disabled" : ""}>Download .txt</button>
          <button data-action="download-md" class="btn" ${!hasContent ? "disabled" : ""}>Download .md</button>
          <button data-action="export-project" class="btn">Export Project</button>
        </div>
        <div class="muted-sm" style="margin-top:10px;">
          Copy or download your draft. Export Project saves everything for later import.
        </div>

        <div class="divider"></div>

        <div class="panel-title">Import</div>
        <div class="row">
          <button data-action="import-session" class="btn">Import Project (.json)</button>
          <input type="file" accept="application/json" data-field="session-file" style="display:none;" />
        </div>
        <div class="muted-sm" style="margin-top:10px;">
          Restore a previously exported project.
        </div>

        ${
          showLinkedInControls
            ? `
        <div class="divider"></div>

        <div class="panel-title panel-title--700">LinkedIn Controls</div>

        <div class="label">Hook override (optional)</div>
        <textarea data-field="li-hookOverride" class="textarea textarea--h70" placeholder="If blank, uses Intent as the hook.">${escapeHtml(
          cfg.hookOverride
        )}</textarea>

        <div class="spacer-10"></div>

        ${checkboxRow("li-includeBullets", cfg.includeBullets, "Include bullet section")}
        <div class="label">Bullet intro</div>
        <input data-field="li-bulletIntro" value="${escapeHtml(cfg.bulletIntro)}" class="input" />
        <div class="label">Max bullets</div>
        <input data-field="li-maxBullets" value="${escapeHtml(cfg.maxBullets)}" inputmode="numeric" class="input" />

        <div class="spacer-10"></div>

        ${checkboxRow("li-includeCTA", cfg.includeCTA, "Include CTA")}
        <div class="label">CTA text</div>
        <input data-field="li-ctaText" value="${escapeHtml(cfg.ctaText)}" class="input" />

        <div class="spacer-10"></div>

        ${checkboxRow("li-includeHashtags", cfg.includeHashtags, "Include hashtags")}
        <div class="label">Hashtags</div>
        <input data-field="li-hashtags" value="${escapeHtml(cfg.hashtags)}" class="input" />

        <div class="spacer-10"></div>

        ${checkboxRow("li-includeSignature", cfg.includeSignature, "Include signature")}
        <div class="label">Signature</div>
        <input data-field="li-signature" value="${escapeHtml(cfg.signature)}" class="input" />
        `
            : ""
        }

        <div class="row" style="margin-top:12px;">
          <button data-action="copy-draft" class="btn" ${!hasContent ? "disabled" : ""}>Copy ${escapeHtml(profile.label)}</button>
          <button data-action="download-draft" class="btn" ${!hasContent ? "disabled" : ""}>Download .txt</button>
          <button data-action="download-full" class="btn" ${!hasContent ? "disabled" : ""}>Download Breakdown</button>
          <button data-action="set-phase" data-phase="expression" class="btn">← Back</button>
        </div>
      </div>

      <div class="col">
        <div class="panel">
          <div class="row-between">
            <div class="panel-title panel-title--700">${escapeHtml(profile.label)} Ready</div>
            <div class="row" style="gap:12px; align-items:center;">
              <span class="${charCountClass}">${charCount.toLocaleString()} / ${maxChars.toLocaleString()}</span>
              <button data-action="copy-draft" class="btn btn--small" ${!hasContent ? "disabled" : ""}>Copy</button>
              <button data-action="download-draft" class="btn btn--small" ${!hasContent ? "disabled" : ""}>Download</button>
            </div>
          </div>

          <div class="preview">${escapeHtml(formattedDraft || "(Add intent/claims/expressions to generate a draft.)")}</div>
        </div>

        <div class="panel">
          <div class="row-between">
            <div class="panel-title panel-title--700">Full Breakdown (for you)</div>
            <div class="row">
              <button data-action="copy-full" class="btn btn--small" ${!hasContent ? "disabled" : ""}>Copy</button>
              <button data-action="download-full" class="btn btn--small" ${!hasContent ? "disabled" : ""}>Download</button>
            </div>
          </div>

          <div class="preview preview--small">${escapeHtml(full || "")}</div>
        </div>
      </div>
    </div>
  `;
}

function checkboxRow(field, checked, label) {
  return `
    <label class="row" style="align-items:center; margin:6px 0;">
      <input type="checkbox" data-field="${field}" ${checked ? "checked" : ""} />
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function renderPhase() {
  if (state.phase === "intent") return renderIntent();
  if (state.phase === "structure") return renderStructure();
  if (state.phase === "expression") return renderExpression();
  if (state.phase === "draft") return renderDraft();
  return `<div>Unknown phase.</div>`;
}

function render() {
  root.innerHTML = pageShell(renderPhase());
}

// ---------- helpers ----------
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- events ----------
root.addEventListener("click", async (e) => {
  /** @type {HTMLElement | null} */
  const target = /** @type {HTMLElement} */ (e.target).closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;

  if (action === "set-phase") return setPhase(target.dataset.phase);
  if (action === "continue") return setPhase(target.dataset.next);

  if (action === "reset") {
    const ok = confirm("Reset everything? This clears saved work.");
    if (!ok) return;
    state = clone(DEFAULT_STATE);
    saveState();
    render();
    return;
  }

  if (action === "add-claim") return addClaim();
  if (action === "remove-claim") return removeClaim(target.dataset.claimId);
  if (action === "move-claim") return moveClaim(target.dataset.claimId, target.dataset.dir);

  if (action === "copy-draft") return copyToClipboard(buildDraftText(buildLinkedInDraft()));
  if (action === "copy-full") return copyToClipboard(buildFullBreakdown());

  if (action === "load-preset") return applyPreset(state.ui.presetId);

  if (action === "download-draft") {
    const profileKey = state.outputProfile || "linkedin";
    downloadTextFile(`inkwise_${profileKey}_${fileStamp()}.txt`, buildDraftText(buildLinkedInDraft()));
    showToast("Text file downloaded!", "success");
    return;
  }
  if (action === "download-full") {
    downloadTextFile(`inkwise_breakdown_${fileStamp()}.txt`, buildFullBreakdown());
    showToast("Breakdown downloaded!", "success");
    return;
  }
  if (action === "download-md") return downloadMarkdown();

  if (action === "export-session") return exportSession();
  if (action === "export-project") return exportProjectJson();

  if (action === "import-session") {
    /** @type {HTMLInputElement | null} */
    const input = root.querySelector('input[data-field="session-file"]');
    if (input) input.click();
    return;
  }

  if (action === "load-demo") return loadDemoProject();

  if (action === "start-fresh") {
    // Dismiss empty state and start writing
    setState({ intent: "" }, { rerender: true });
    // Focus the intent textarea
    setTimeout(() => {
      const textarea = document.getElementById("intent-input");
      if (textarea) textarea.focus();
    }, 50);
    return;
  }
});

root.addEventListener("input", (e) => {
  /** @type {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement} */
  const el = /** @type {HTMLInputElement} */ (e.target);
  const field = el.dataset.field;

  if (field === "intent") return updateIntent(el.value);
  if (field === "claim") return updateClaim(el.dataset.claimId, el.value);
  if (field === "expression") return updateExpression(el.dataset.claimId, el.value);

  if (!field) return;

  if (field === "ui-presetId") return updateUIField("presetId", el.value, { rerender: false });

  if (field === "li-hookOverride") return updateLinkedInField("hookOverride", el.value, { rerender: false });
  if (field === "li-bulletIntro") return updateLinkedInField("bulletIntro", el.value, { rerender: false });
  if (field === "li-maxBullets")
    return updateLinkedInField("maxBullets", clampInt(el.value, 1, 12, 5), { rerender: false });
  if (field === "li-ctaText") return updateLinkedInField("ctaText", el.value, { rerender: false });
  if (field === "li-hashtags") return updateLinkedInField("hashtags", el.value, { rerender: false });
  if (field === "li-signature") return updateLinkedInField("signature", el.value, { rerender: false });
});

root.addEventListener("change", async (e) => {
  /** @type {HTMLInputElement | HTMLSelectElement} */
  const el = /** @type {HTMLInputElement} */ (e.target);

  // Handle output profile dropdown
  if (el.dataset?.action === "set-output-profile") {
    setState({ outputProfile: el.value });
    return;
  }

  const field = el.dataset.field;
  if (!field) return;

  if (field === "session-file") {
    const inputEl = /** @type {HTMLInputElement} */ (el);
    const file = inputEl.files && inputEl.files[0];
    inputEl.value = "";
    if (!file) return;
    await importSessionFromFile(file);
    return;
  }

  const checkboxEl = /** @type {HTMLInputElement} */ (el);
  if (field === "li-includeBullets")
    return updateLinkedInField("includeBullets", !!checkboxEl.checked, { rerender: true });
  if (field === "li-includeCTA") return updateLinkedInField("includeCTA", !!checkboxEl.checked, { rerender: true });
  if (field === "li-includeHashtags")
    return updateLinkedInField("includeHashtags", !!checkboxEl.checked, { rerender: true });
  if (field === "li-includeSignature")
    return updateLinkedInField("includeSignature", !!checkboxEl.checked, { rerender: true });
});

render();
