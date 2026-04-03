# Subway Reader

> "I need to build a web application designed to help users read long-form text (like textbooks or study sheets) while simultaneously keeping their attention engaged by playing a loop of 'Subway Surfers' gameplay directly in the middle of the text."

**Status:** 🟢 Core working — chroma key, silhouette text wrapping, and reader all functional

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
3. A chroma-keyed Subway Surfers character video plays fixed at viewport center, magenta background removed in real-time
4. Text wraps tightly around the character's actual silhouette each frame — not a generic shape, the real outline

## Docs

| File | Purpose |
|------|---------|
| [CONTEXT.md](CONTEXT.md) | Full project context, instructions, decisions, stack. **Upload this to start a new session.** |
| [PROGRESS.md](PROGRESS.md) | Session changelog, what's built, known bugs |
| [ROADMAP.md](ROADMAP.md) | Single prioritized task list for what comes next |
