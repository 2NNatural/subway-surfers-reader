# PROGRESS.md — Subway Reader

---

## Session 2 — 2026-04-02

### Completed

- **🟢 Chroma key fixed — was targeting wrong color entirely**
  - Used Playwright to extract a video frame and analyze actual pixel data
  - Discovered background is **magenta RGB(255, 0, 246)**, not green (filename was misleading)
  - Rewrote chroma key: RGB Euclidean distance from magenta key color
  - Two-threshold system: inner=110 (fully transparent), outer=180 (fully opaque)
  - Smoothstep cubic hermite feathering eliminates jagged edges
  - Magenta spill suppression on edge pixels (R/B pulled toward G channel)

- **🟢 Video rendering fixed — was showing black rectangle**
  - `className="hidden"` (display:none) prevented browsers from decoding video frames → replaced with offscreen positioning (1×1px, opacity 0)
  - Added `video.play()` call with click/keydown fallback for autoplay-blocked browsers
  - Removed `video.paused` guard so current frame always renders even when paused

- **🟢 Auto-crop to character bounds**
  - VideoPlayer detects character pixel bounds each frame during chroma key pass
  - Canvas resized to crop region (grow-only, never shrinks to prevent flicker)
  - Eliminated the huge black bubble around the small character

- **🟢 Exclusion zone tightened**
  - Reduced from 300×400 to 160×220 display pixels

- **🟢 Real silhouette-based text wrapping**
  - Replaced superellipse exclusion with per-frame character silhouette
  - VideoPlayer builds per-row left/right edge maps during chroma key processing
  - Edges stored as `CharSilhouette` type (Float32Array) shared via React ref
  - textFlowEngine reads actual silhouette edges per line instead of generic shape
  - Temporal smoothing: edges expand instantly, shrink at 4% per frame (prevents text jitter)
  - Fallback to rectangular exclusion if silhouette not ready yet (first frame)
  - Text now wraps tightly around head, shoulders, arms, legs — follows the real outline

- **Files modified:** `VideoPlayer.tsx` (major rewrite ×3), `ReaderPage.tsx`, `TextCanvas.tsx`, `textFlowEngine.ts` (rewritten), `types.ts` (added `CharSilhouette`)
- **Dead code created:** `blobContour.ts` — superellipse math no longer imported anywhere
- **Dev dependency added:** `playwright` (for headless frame analysis, can be removed)
- **Build verification:** `npx tsc --noEmit` passes clean

### Known Bugs / Issues

1. **`blobContour.ts` is dead code** — no longer imported by anything after silhouette rewrite. Should be deleted.

2. **Playwright installed as devDep** — was needed for video frame analysis this session. Can be removed if not needed again.

3. **Document height estimation is approximate** — initial height from full-width `layout()` + `blobHeight * 2` buffer. Updates dynamically if actual layout height diverges. May cause scrollbar jumps on first scroll.

4. **Crop box only grows, never shrinks** — if the character moves to a smaller area later in the video, the crop box stays at the maximum size seen so far. Minor visual issue.

5. **Performance on long documents untested** — the per-pixel chroma key + silhouette extraction runs every frame for 720×720 = 518,400 pixels. Need to profile on lower-end machines.

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
  - Superellipse (n=3) contour function (now superseded by silhouette tracking)
  - `flowTextAroundBlob()` layout engine
- **Video player** (`VideoPlayer.tsx`):
  - Hidden `<video>` element plays MP4
  - Canvas chroma key (initially targeting green — wrong color, fixed in Session 2)
- **Reader controls** (`ReaderControls.tsx`):
  - Font size slider (14–28px, default 18)
  - Back button to return to landing page
  - Floating bottom-right panel with backdrop blur
- **App routing** (`App.tsx`):
  - State-based screen switching: `landing` ↔ `reader`
  - Text string passed from landing to reader
- **Build verification**: `npx tsc --noEmit` and `npx vite build` both pass clean

---

## Done Log

| Date | Item | Notes |
|------|------|-------|
| 2026-03-31 | Initial scaffold | Vite + React + TS + Tailwind |
| 2026-03-31 | All components built | 16 source files across pages/components/hooks/lib |
| 2026-03-31 | Build passing | Clean tsc + vite build |
| 2026-04-02 | Chroma key fixed | Magenta detection (was targeting wrong color) |
| 2026-04-02 | Video rendering fixed | display:none → offscreen, autoplay recovery |
| 2026-04-02 | Auto-crop to character | Canvas crops to sprite bounds per frame |
| 2026-04-02 | Silhouette text wrapping | Text follows real character outline, replaces superellipse |
