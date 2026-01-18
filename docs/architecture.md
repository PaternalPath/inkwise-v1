# Inkwise Architecture

## Overview

Inkwise is a client-side writing tool built with Vite + vanilla JavaScript. It runs entirely in the browser with no backend dependencies.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  ┌─────────────────────────────────────────────────────────┤
│  │                     index.html                          │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐│
│  │  │   main.js   │→ │  schemas.js │→ │   localStorage   ││
│  │  │ (UI + State)│  │   (Zod)     │  │  "inkwise:v1"    ││
│  │  └─────────────┘  └─────────────┘  └──────────────────┘│
│  │         ↓                                               │
│  │  ┌─────────────┐                                        │
│  │  │  style.css  │                                        │
│  │  └─────────────┘                                        │
│  └─────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### UI Layer (`main.js`)
- Single-page app with phase-based rendering
- HTML template strings with XSS-safe escaping
- Event delegation on root element
- No framework, no virtual DOM

### State Management
- Plain JavaScript object in memory
- Shallow merge updates with `setState(patch)`
- Deep merge for imports with `replaceState(state)`
- Autosave on every state change

### Persistence (`localStorage`)
- Key: `"inkwise:v1"`
- Format: JSON string
- Storage limit: ~5MB (browser dependent)
- No expiration, persists until cleared

### Validation (`schemas.js` with Zod)
- `AppStateSchema`: Validates application state
- `SessionExportSchema`: Validates import/export format
- `extractStateFromImport()`: Safely parses external data
- Provides defaults for missing fields

## Data Flow

```
User Input → Event Handler → setState() → localStorage → render()
                                  ↓
                          Zod Validation (imports only)
```

## State Shape

```javascript
{
  phase: "intent" | "structure" | "expression" | "draft",
  intent: string,
  claims: [{ id: string, text: string }],
  expressions: { [claimId]: string },
  outputProfile: "linkedin" | "xthread" | "email" | "memo" | "blog" | "custom",
  ui: { presetId: string },
  linkedin: { hookOverride, includeBullets, bulletIntro, maxBullets, ... }
}
```

## Storage Rationale

**Why localStorage?**
- Zero setup, works offline
- Synchronous API, simple mental model
- 5MB is plenty for text
- No backend = no auth, no GDPR complexity

**Why not IndexedDB?**
- Overkill for this use case
- Async complexity not justified
- localStorage covers all requirements

## Validation Approach

**Why Zod?**
- Runtime validation for untrusted imports
- Type inference for IDE support
- Small bundle size (~50KB gzipped with tree-shaking)
- Default values for schema evolution

**Validation points:**
1. Import from JSON file
2. Load demo project fixture
3. (Future) API responses if backend added

## Export Formats

| Format | Use Case |
|--------|----------|
| `.txt` | Plain text for any platform |
| `.md` | Markdown for technical blogs |
| `.json` | Full project state for backup/restore |

## Security Considerations

- All user input escaped with `escapeHtml()`
- No `innerHTML` with raw user content
- No eval, no dynamic script loading
- CSP-friendly (no inline scripts in HTML)
