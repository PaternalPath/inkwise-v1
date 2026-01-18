# Inkwise Fortune-500 Upgrade Plan

## Audit Summary

### Framework & Version
- **Build Tool**: Vite 7.2.4
- **Language**: Vanilla JavaScript (ES2022 modules, no TypeScript)
- **Styling**: Custom CSS with CSS variables (Apple-inspired dark theme)
- **State**: Plain JavaScript object + localStorage persistence
- **Testing**: Vitest 4.0.16 with jsdom (19 test cases)
- **Linting**: ESLint 9.x + Prettier 3.x
- **CI**: GitHub Actions (lint, format check, test, build)

### Current Scripts Status
| Script | Status | Notes |
|--------|--------|-------|
| `dev` | Working | Vite dev server |
| `build` | Working | Production build |
| `start` | Missing | Needs `vite preview` alias |
| `lint` | Working | ESLint |
| `typecheck` | Missing | Need to add JSDoc + TypeScript checking |
| `test` | Working | Vitest run |

### Current Core User Flow
1. **Intent** → Define what you're trying to say (1-2 sentences)
2. **Structure** → Add 3-5 ordered claims/points
3. **Expression** → Write paragraphs for each claim
4. **Draft** → Generate platform-ready output (LinkedIn, X Thread, Email, Memo, Blog, Custom)

### State Model (Current)
```javascript
{
  phase: "intent" | "structure" | "expression" | "draft",
  intent: string,
  claims: [{ id: UUID, text: string }],
  expressions: { [claimId]: string },
  outputProfile: "linkedin" | "xthread" | "email" | "memo" | "blog" | "custom",
  ui: { presetId: string },
  linkedin: { hookOverride, includeBullets, bulletIntro, maxBullets, includeCTA, ctaText, includeHashtags, hashtags, includeSignature, signature }
}
```

### Known Gaps vs Acceptance Criteria

| Criterion | Current State | Gap |
|-----------|---------------|-----|
| `npm run typecheck` | Missing | Need JSDoc + TypeScript checking |
| `npm run start` | Missing | Need alias for `vite preview` |
| `.nvmrc` / `engines.node` | Missing | Need Node version pinning |
| Zod schemas | Missing | State not validated with Zod |
| Empty state (first-time users) | Partial | Has presets but no prominent CTA |
| Loading state | Missing | No explicit loading indicators |
| Error state (malformed data) | Partial | Fails silently to default |
| Undo functionality | Missing | No undo for destructive actions |
| Progress indicator | Missing | No visual step indicator |
| Export .md | Missing | Only .txt download |
| Export JSON | Exists | Session export works |
| Import JSON validation | Partial | No Zod validation |
| Demo project fixture | Missing | Presets exist but no `/fixtures/demo-project.json` |
| "Load demo project" button | Partial | Buried in Draft page |
| Accessibility (labels) | Partial | Some inputs lack proper labels |
| Focus states | Partial | Basic focus outlines |
| Keyboard navigation | Partial | Works but not optimized |
| README screenshots | Missing | No images above the fold |
| docs/architecture.md | Missing | Need to create |
| docs/product.md | Missing | Need to create |
| Playwright tests | Missing | Need smoke tests |

---

## Plan: 9 Tasks

### Task 1: Standardize Scripts & Tooling
- [x] Add `start` script (alias for `vite preview`)
- [x] Add `typecheck` script using JSDoc + TypeScript checking
- [x] Add `.nvmrc` file pinning Node 20
- [x] Add `engines.node` to package.json
- [x] Install `typescript` as dev dependency for type checking

### Task 2: Add Zod Schemas & Validation
- [x] Install `zod` as production dependency (small, zero runtime overhead)
- [x] Create `src/schemas.js` with Zod schemas for:
  - Project state
  - Intent, Claims, Expressions
  - LinkedIn config
  - Session export format
- [x] Add schema validation to import flow
- [x] Export TypeScript types via JSDoc

### Task 3: Add UX States & Progress Indicator
- [x] Add subtle progress indicator showing current phase (1/4, 2/4, etc.)
- [x] Add first-time user empty state with CTA to load demo
- [x] Add error state for malformed persisted data with reset option
- [x] Add toast notifications instead of alerts

### Task 4: Export/Import Enhancements
- [x] Add "Download .md" option (markdown format)
- [x] Add "Export Project JSON" with full state
- [x] Add "Import Project JSON" with Zod validation
- [x] Add clear error messages for invalid imports
- [x] Create `/fixtures/demo-project.json`

### Task 5: Demo Project & Load Button
- [x] Move "Load demo project" button to prominent position (Intent page empty state)
- [x] Add demo project fixture file
- [x] Wire up fixture loading

### Task 6: UI Quality Pass
- [x] Add proper `<label>` elements to all inputs
- [x] Add `aria-label` attributes where needed
- [x] Ensure visible focus outlines on all interactive elements
- [x] Add keyboard shortcuts for common actions
- [x] Ensure mobile-friendly layout
- [x] Add toast component for feedback

### Task 7: Unit Tests
- [x] Test Zod schema validation for demo project fixture
- [x] Test import/export roundtrip
- [x] Test persistence versioning (load older schema or fail gracefully)
- [x] Test export helpers (md/txt generation)

### Task 8: Playwright Smoke Tests
- [x] Install Playwright
- [x] Test: App loads successfully
- [x] Test: Load demo project works
- [x] Test: Navigate through Intent → Draft
- [x] Test: Export triggers correctly

### Task 9: Documentation & README
- [x] Create docs/architecture.md (1 page)
- [x] Create docs/product.md
- [x] Update README with:
  - Screenshots/GIF above the fold
  - Quickstart (5 commands)
  - Load demo project instructions
  - Export/import instructions
  - Privacy note
  - Vercel deploy steps

---

## Verification Commands

```bash
# Clean machine verification
npm ci
npm run lint
npm run typecheck
npm test
npm run build

# Run E2E tests
npm run test:e2e

# Preview production build
npm run start
```

## Vercel Deployment
- No environment variables required
- Builds with `npm run build`
- Output directory: `dist`
- Framework preset: Vite
