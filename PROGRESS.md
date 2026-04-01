# PROGRESS.md — Subway Reader

---

## Session 1 — 2026-03-31

### Completed

- **Project scaffold**: Vite + React + TypeScript, all dependencies installed
  - `@chenglou/pretext`, `pdfjs-dist`, `tailwindcss`, `@tailwindcss/vite`
- **Video file**: Copied `SubwaySurfersJakeRunning(GreenScreen).mp4` from Downloads → `public/subway-surfers.mp4`
- **Landing page** (`LandingPage.tsx`):
  - Drag-and-drop file upload zone (`.pdf`, `.txt`)
  - Large textarea for raw text pasting
  - "Start Reading" button with disabled state
  - Dark theme, centered layout
- **PDF extraction pipeline** (`pdfExtractor.ts`, `usePdfExtract.ts`):
  - `pdfjs-dist` with worker configured via Vite's `import.meta.url`
  - Extracts text from all pages, joins with double newlines
  - Loading/error state management
- **Text rendering engine** (`TextCanvas.tsx`, `usePretext.ts`):
  - `prepareWithSegments()` called after `document.fonts.load()` completes
  - Fixed Canvas covering viewport, high-DPI scaled via `devicePixelRatio`
  - Scroll container with spacer div for native scrollbar
  - Paints only visible lines each frame
- **Blob exclusion zone** (`blobContour.ts`, `textFlowEngine.ts`):
  - Superellipse (n=3) contour function: `getBlobEdges()` returns left/right edges at any Y
  - `blobToClipPath()` generates CSS polygon from the superellipse (60 sample points)
  - `flowTextAroundBlob()` — full layout engine that splits lines into left/right gutters around the blob
  - 20px gap between text and blob edge, 40px minimum gutter width
  - 50,000 line safety limit to prevent infinite loops
- **Video player** (`VideoPlayer.tsx`):
  - Hidden `<video>` element plays MP4 (autoplay, muted, loop, playsInline)
  - Canvas renders chroma-keyed frames at video's native resolution
  - HSL-based green screen detection (hue 70-170°, saturation >0.15, lightness 20-240)
  - Edge softening for pixels near green boundary
- **Reader controls** (`ReaderControls.tsx`):
  - Font size slider (14–28px, default 18)
  - Back button to return to landing page
  - Floating bottom-right panel with backdrop blur
- **App routing** (`App.tsx`):
  - State-based screen switching: `landing` ↔ `reader`
  - Text string passed from landing to reader
- **Build verification**: `npx tsc --noEmit` and `npx vite build` both pass clean

### Known Bugs / Unresolved

1. **🔴 BLOCKER: Chroma key not working correctly**
   - Noah reported: "It doesn't look like a subway surfers character at all"
   - After HSL-based rewrite, Noah reported: "it still looks the same"
   - Root cause: Chroma key thresholds were written without inspecting the actual video
   - The video was never visually examined — no ffmpeg available to extract frames
   - **Must fix first next session**

2. **Video may need preprocessing**
   - Unknown video resolution, frame rate, exact green screen color
   - May need ffmpeg installed to inspect and potentially pre-process

3. **Document height estimation is approximate**
   - Initial height from full-width `layout()` + `blobHeight * 2` buffer
   - Updates dynamically if actual layout height diverges significantly
   - May cause scrollbar jumps on first scroll

---

## Done Log (Historical)

| Date | Item | Notes |
|------|------|-------|
| 2026-03-31 | Initial scaffold | Vite + React + TS + Tailwind |
| 2026-03-31 | All components built | 16 source files across pages/components/hooks/lib |
| 2026-03-31 | Build passing | Clean tsc + vite build |
