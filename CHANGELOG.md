# Changelog

All notable changes to Inkwise will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CSP (Content Security Policy) headers for enhanced security
- Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- PRIVACY.md documentation
- SECURITY.md with vulnerability disclosure policy
- GDPR.md compliance statement
- Global error handler with structured logging
- Bundle size tracking in CI pipeline
- npm audit security scanning in CI
- Debounced localStorage saves for better performance
- prefers-reduced-motion accessibility support

### Changed
- Improved CI/CD pipeline with security scanning and bundle analysis

### Removed
- Unused Vite boilerplate (counter.js)

## [1.0.0] - 2025-01-24

### Added
- Initial release of Inkwise
- Four-phase writing workflow: Intent → Structure → Expression → Draft
- Six output profiles: LinkedIn, X/Twitter Thread, Email, Memo, Blog, Custom
- LinkedIn-specific customization options (hooks, bullets, CTAs, hashtags, signatures)
- Local-first architecture with localStorage persistence
- Demo project with pre-loaded content
- Export capabilities: JSON, Markdown, Plain Text
- Import/Export session functionality with Zod validation
- Progress indicator showing current phase
- Toast notifications for user feedback
- Empty state with prominent "Load Demo" CTA
- Error state handling for corrupted data
- Keyboard shortcuts for common actions
- Comprehensive unit tests (41 tests via Vitest)
- End-to-end tests (11 tests via Playwright)
- Full accessibility support (ARIA labels, focus states, screen reader text)
- Apple-inspired dark theme UI
- Mobile-responsive design
- GitHub Actions CI/CD pipeline

### Security
- XSS protection via escapeHtml() sanitization
- Zod schema validation for all imports
- No external API dependencies
- No tracking or analytics
