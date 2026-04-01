# Subway Reader

> A web app to help users read long-form text (like textbooks or study sheets) while simultaneously keeping their attention engaged by playing a loop of "Subway Surfers" gameplay directly in the middle of the text.

**Status:** 🟡 In Progress — core architecture built, chroma key needs tuning

## Quick Start

```bash
cd ~/subway-reader
npm install
npm run dev
# → http://localhost:5173/
```

## How It Works

1. Upload a PDF, drop a TXT file, or paste raw text on the landing page
2. Hit "Start Reading" — text renders via Canvas using `@chenglou/pretext` for 500x faster layout
3. A green-screened Subway Surfers character video plays fixed at viewport center, chroma-keyed to transparency in real-time
4. Text wraps organically around the character using a superellipse exclusion zone — not split-screen, not overlaid, true magazine-style flow

## Docs

- [CONTEXT.md](CONTEXT.md) — Full project context, instructions, decisions, stack. **Upload this to start a new session.**
- [PROGRESS.md](PROGRESS.md) — What's been built, session changelog, known bugs
- [ROADMAP.md](ROADMAP.md) — Prioritized next steps
