# Inkwise — Writing OS (Intent → Structure → Expression → Draft)

A lightweight, offline-first writing tool that turns rough ideas into platform-ready drafts using a clear, repeatable workflow. One workflow, multiple output targets.

## Why it exists
Most writing tools either:
- start blank (high friction), or
- depend entirely on AI (low control).

Inkwise is the middle path: **a structured workflow** that helps you think clearly, write faster, and ship consistently — with **no account required** and **local persistence**.

## Live Demo
- Demo: [inkwise-v1.vercel.app](https://inkwise-v1.vercel.app)
- Repo: [github.com/PaternalPath/inkwise-v1](https://github.com/PaternalPath/inkwise-v1)

## What it does
### Workflow
1. **Intent** — what you're trying to say (1–2 sentences)
2. **Structure** — key claims / points you want to make
3. **Expression** — tighten language and phrasing
4. **Draft** — generate platform-ready output you can copy/export

### Output Profiles
Same workflow, different containers:
- **LinkedIn Post** — short hook, whitespace, skimmable (3,000 chars)
- **X / Twitter Thread** — auto-split into numbered posts (280 chars each)
- **Email** — subject line + body
- **Memo** — title, TL;DR, bullets, next steps
- **Blog / Article** — markdown headings + longer paragraphs
- **Custom** — your rules

### Features
- Offline-first: saves sessions via `localStorage`
- Copy/export flows for quick posting
- Draft presets (hooks + formats)
- Live character counter per output profile
- Clean formatting helpers for consistent spacing

## 60-second walkthrough
1. Select your output profile (LinkedIn, X Thread, Email, etc.)
2. Type your intent (1–2 sentences)
3. Add 3–5 claims in Structure
4. Refine phrasing in Expression
5. Generate a draft → copy → post


## Tech Stack
- Vite + Vanilla JS
- Local persistence (localStorage)
- [Any additional libs here]

## Getting Started (Local)
```bash
npm install
npm run dev
