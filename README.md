# Inkwise

**Transform rough ideas into polished drafts with a structured writing workflow.**

![Inkwise Demo](https://via.placeholder.com/800x450/1c1c1e/0a84ff?text=Intent+→+Structure+→+Expression+→+Draft)

> A lightweight, offline-first writing tool that guides you from fuzzy thinking to platform-ready content. No account required, no AI dependency—just a clear process.

## Features

- **4-Phase Workflow**: Intent → Structure → Expression → Draft
- **6 Output Profiles**: LinkedIn, X/Twitter, Email, Memo, Blog, Custom
- **Local-First**: All data stays in your browser via localStorage
- **Export Options**: Copy, .txt, .md, or full project JSON
- **Demo Project**: One-click example to see the workflow in action
- **Accessible**: Keyboard navigable with proper ARIA labels
- **Zero Config**: Works immediately, no API keys needed

## Quickstart

```bash
# Clone and install
git clone https://github.com/PaternalPath/inkwise-v1.git
cd inkwise-v1
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and click **Load Demo Project** to explore.

## Live Demo

- **Demo**: [inkwise-v1.vercel.app](https://inkwise-v1.vercel.app)
- **Repo**: [github.com/PaternalPath/inkwise-v1](https://github.com/PaternalPath/inkwise-v1)

## The Workflow

1. **Intent** — Define what you're trying to say (1–2 sentences)
2. **Structure** — Break it into ordered claims (3–5 points)
3. **Expression** — Write each claim as a paragraph
4. **Draft** — Format for your platform and export

### Output Profiles

| Profile | Best For | Format |
|---------|----------|--------|
| LinkedIn Post | Professional content | Hook + bullets + CTA (3,000 chars) |
| X/Twitter Thread | Viral ideas | Auto-split into numbered posts (280 chars each) |
| Email | Direct communication | Subject + body |
| Memo | Internal updates | Title + TL;DR + details |
| Blog/Article | Long-form content | Markdown with headings |
| Custom | Anything else | Plain text |

## Load Demo Project

1. Open the app at [localhost:5173](http://localhost:5173) or [inkwise-v1.vercel.app](https://inkwise-v1.vercel.app)
2. Click **Load Demo Project** on the welcome screen
3. Explore each phase using the progress indicator
4. Try different output profiles (LinkedIn, Email, X Thread)
5. Export your result using Copy, .txt, .md, or JSON

## Export & Import

### Export Options (Draft page)
- **Copy Text**: Copy formatted draft to clipboard
- **Download .txt**: Plain text file
- **Download .md**: Markdown format
- **Export Project**: Full JSON backup

### Import
- Click **Import Project (.json)** on the Draft page
- Select a previously exported JSON file
- Your session is restored with validation

## Privacy

- **100% Local**: Data never leaves your browser
- **No Tracking**: No analytics, no cookies, no telemetry
- **No Account**: Start writing immediately
- **Export Anytime**: Your data is always portable

## Development

### Scripts

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Preview production build
npm run lint       # Run ESLint
npm run typecheck  # Type check with TypeScript/JSDoc
npm test           # Run unit tests (Vitest, 41 tests)
npm run test:e2e   # Run E2E tests (Playwright, 11 tests)
```

### Clean Machine Verification

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

### Tech Stack

- **Build**: Vite 7
- **Language**: Vanilla JavaScript (ES2022)
- **Styling**: Custom CSS with CSS variables
- **Validation**: Zod schemas
- **Testing**: Vitest + Playwright
- **CI**: GitHub Actions

### Quality Checks

All PRs must pass:
- ESLint (code quality)
- Prettier (formatting)
- TypeScript (type checking via JSDoc)
- Vitest (41 unit tests)
- Playwright (11 E2E tests)
- Production build

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/PaternalPath/inkwise-v1)

**Manual deployment:**
1. Push to GitHub
2. Import project in Vercel
3. Framework: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. **No environment variables needed**

## Documentation

- [Architecture](docs/architecture.md) — Technical design decisions
- [Product](docs/product.md) — Who it's for and how it works
- [Plan](docs/PLAN.md) — Development roadmap

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run `npm run lint && npm run typecheck && npm test`
4. Submit a pull request

## License

MIT
