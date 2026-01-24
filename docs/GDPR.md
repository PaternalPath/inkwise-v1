# GDPR Compliance Statement

**Last Updated:** January 2025

## Overview

Inkwise is fully compliant with the General Data Protection Regulation (GDPR) by design. This document explains how Inkwise meets GDPR requirements.

## Data Controller

Inkwise operates as a local-first application with **no data controller** in the traditional sense. All data processing occurs on the user's own device, and no personal data is transmitted to or stored on external servers.

## Personal Data Processing

### Data We Process

**None.** Inkwise does not process any personal data on our servers because:

- We have no servers that store user data
- We have no user accounts or authentication
- We have no analytics or tracking
- We have no cookies

### Data You Store Locally

Your browser's localStorage may contain:

- Writing projects (intent, claims, expressions, drafts)
- UI preferences (output profile, LinkedIn settings)

This data is:
- Stored only on your device
- Never transmitted to us or third parties
- Fully under your control

## GDPR Rights

Under GDPR, you have the following rights. Here's how they apply to Inkwise:

### Right of Access (Article 15)

You can access all your data directly in your browser:
1. Open Developer Tools (F12)
2. Go to Application → Local Storage
3. Find `inkwise:v1` key

Or use the built-in "Export Session JSON" feature.

### Right to Rectification (Article 16)

You can edit any of your data directly in the application at any time.

### Right to Erasure (Article 17)

You can delete all your data:
- Use the "Reset" button in the application, or
- Clear your browser's localStorage, or
- Use your browser's "Clear browsing data" feature

### Right to Data Portability (Article 20)

You can export all your data using:
- "Export Session JSON" — Machine-readable format
- "Download .md" — Human-readable Markdown
- "Download .txt" — Plain text

### Right to Object (Article 21)

Not applicable — we perform no data processing to object to.

### Right to Restrict Processing (Article 18)

Not applicable — we perform no server-side data processing.

## Data Protection by Design (Article 25)

Inkwise implements data protection by design:

1. **Data Minimization** — We collect zero data
2. **Local-First Architecture** — All data stays on user's device
3. **No Tracking** — No analytics, cookies, or fingerprinting
4. **User Control** — Full export and delete capabilities
5. **Transparency** — Open-source code for inspection

## International Data Transfers

Inkwise performs **no international data transfers** because we transfer no data at all. Your data never leaves your browser.

## Data Breach Notification

Since we store no user data on any servers, there is no possibility of a data breach affecting your personal information stored in Inkwise.

## Children's Data

Inkwise does not knowingly collect any data from anyone, including children under 16.

## Contact

For GDPR-related questions, open an issue on our GitHub repository.

---

## Summary

| GDPR Requirement | Inkwise Status |
|------------------|----------------|
| Lawful basis for processing | N/A — No processing |
| Data minimization | Compliant — Zero collection |
| Purpose limitation | N/A — No processing |
| Storage limitation | User-controlled localStorage |
| Integrity and confidentiality | Local storage only |
| Accountability | Open-source, documented |
| Data subject rights | All supported via app features |
| Data Protection Officer | Not required — No processing |
| Records of processing | N/A — No processing |
| Data breach notification | N/A — No server storage |

**Inkwise is GDPR-compliant by design through its local-first, zero-collection architecture.**
