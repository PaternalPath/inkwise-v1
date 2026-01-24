# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Inkwise, please report it responsibly.

### How to Report

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email your report to the maintainers (or open a private security advisory on GitHub)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment:** Within 48 hours
- **Initial Assessment:** Within 7 days
- **Resolution Timeline:** Depends on severity
  - Critical: 24-48 hours
  - High: 7 days
  - Medium: 30 days
  - Low: Next release

### Scope

The following are in scope:

- XSS (Cross-Site Scripting) vulnerabilities
- Injection attacks
- Data exposure issues
- Authentication/authorization bypasses (if applicable)
- Dependency vulnerabilities

The following are out of scope:

- Issues requiring physical access to user's device
- Social engineering attacks
- Issues in dependencies without a realistic attack vector
- Theoretical vulnerabilities without proof of concept

## Security Measures

Inkwise implements the following security measures:

### Content Security Policy (CSP)

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
frame-ancestors 'none';
```

### Input Sanitization

- All user input is escaped using `escapeHtml()` before rendering
- HTML entities are properly encoded: `&`, `<`, `>`, `"`, `'`

### Data Validation

- Zod schemas validate all imported data
- Malformed data is rejected with clear error messages

### No External Dependencies at Runtime

- Only one production dependency (Zod) minimizes attack surface
- No external API calls during normal operation

### Local-Only Storage

- No server-side data storage eliminates server-side attack vectors
- localStorage data stays in user's browser

## Dependency Management

- Dependencies are regularly audited using `npm audit`
- Automated dependency updates via Dependabot (when enabled)
- Lock file (`package-lock.json`) ensures reproducible builds

## Security Headers

The application sets the following security headers:

- `Content-Security-Policy` — Restricts resource loading
- `X-Content-Type-Options: nosniff` — Prevents MIME sniffing
- `X-Frame-Options: DENY` — Prevents clickjacking
- `Referrer-Policy: strict-origin-when-cross-origin` — Controls referrer information

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who help us improve Inkwise security.
