# PROGRESS.md — Subway Reader

---

## Session 3 — 2026-04-07 / 2026-04-08

### Completed

- **Train obstacles + 3-track system** (commit `210a6b0` → `c8b1e5c`)
  - New files: `trainObstacles.ts` (spawn/move/collision logic), `TrainCanvas.tsx` (renderer)
  - Trains spawn at top of viewport, scroll downward on 3 tracks (left, center, right)
  - Character starts on center track, switches lanes via keyboard (later removed)
  - Auto-jump when train is in same lane and close
  - Train color schemes: red, yellow, blue, silver, purple, green
  - 6 color palettes with body/roof/stripe/accent

- **Text exclusion for trains**
  - `TrainRect[]` integrated into `textFlowEngine.ts` — text wraps around train rectangles
  - Same exclusion pattern as character silhouette but rectangular
  - Min gutter width (`fontSize * 4.5`) added to prevent word clipping in narrow gaps

- **Fixed train visual regression + min gutter** (commit `eb5f585`)
  - Restored colorful Subway Surfers-style trains after a regression made them plain
  - Added minimum gutter width to fix word clipping near viewport edges

- **Fixed Vercel build error** (commit `9d07e1d`)
  - Removed unused `TRAIN_HEIGHT` import that broke production build

- **Removed keyboard input → fully autonomous character** (commit `c8b1e5c`)
  - Noah explicitly said "there shouldn't be any keyboard input"
  - Character now: randomly switches lanes, auto-dodges trains, auto-jumps when cornered
  - No user interaction with the gameplay — purely visual

- **Attempted 3/4 oblique perspective trains** (commits `a204548`, Canvas 2D)
  - Drew trains with overhead oblique projection in Canvas 2D
  - Noah rejected: "ugly and hand drawn"

- **Switched to actual game model sprites** (commit `fccdd8f`)
  - Downloaded real Subway Surfers train OBJ model from The Models Resource
  - Rendered 3 angles via Three.js + Playwright headless browser
  - Exported transparent PNGs: `train-left.png` (84KB), `train-right.png` (89KB), `train-center.png` (33KB)
  - Replaced Canvas 2D drawing with `<img>` sprite rendering in TrainCanvas

- **Attempted dynamic perspective sprite sheets** (commit `d16944e`)
  - Rendered 8-frame sprite sheets per angle for smooth perspective interpolation as trains scroll
  - Noah said "it's worse" — animation was jarring/distracting

- **Reverted to static sprites** (commit `fa69268` — current HEAD)
  - Reverted `d16944e`, restored the clean static sprites from `fccdd8f`
  - This is the current working state

### Files Created (Session 3)

| File | Purpose |
|------|---------|
| `src/lib/trainObstacles.ts` | Train spawn/move/collision/color logic |
| `src/components/TrainCanvas.tsx` | Train renderer using sprite PNGs |
| `public/train-left.png` | 3D-rendered sprite, left angle |
| `public/train-right.png` | 3D-rendered sprite, right angle |
| `public/train-center.png` | 3D-rendered sprite, front angle |

### Files Modified (Session 3)

| File | Changes |
|------|---------|
| `src/lib/textFlowEngine.ts` | Added `TrainRect[]` exclusion + min gutter width |
| `src/pages/ReaderPage.tsx` | Integrated TrainCanvas, `trainRectsRef`, autonomous character logic |
| `src/components/TextCanvas.tsx` | Reads `trainRectsRef` for train exclusion zones |
| `src/types.ts` | Added `Train`, `TrainRect`, `TrainColorScheme` types |

### Known Bugs / Issues (End of Session 3)

1. **Train left/right sprites are flipped** — `train-right.png` is assigned to the left track and vice versa. User reported but fix was deferred during the revert.

2. **Dynamic perspective rejected** — Sprite sheet approach was too jarring. If revisited, needs a different strategy (WebGL runtime rendering, smoother interpolation, or just keeping static).

3. **`blobContour.ts` is still dead code** — Superellipse math from Session 1, no longer imported. Should be deleted.

4. **Playwright still in devDependencies** — Was used for frame analysis (Session 2) and sprite rendering (Session 3). Can be removed if no longer needed.

5. **Document height estimation is approximate** — May cause scrollbar jumps on first scroll.

6. **Crop box only grows, never shrinks** — Minor visual issue if character moves to smaller area.

### Commit Log (Session 3, chronological)

```
c8b1e5c  Add autonomous character movement and Subway Surfers-style trains
eb5f585  Add colorful Subway Surfers-style trains and fix narrow gutter text clipping
9d07e1d  Fix build: remove unused TRAIN_HEIGHT import
a204548  Redraw trains with correct 3/4 overhead oblique projection
54275a8  Replace hand-drawn Canvas 2D trains with sprite images
fccdd8f  Replace placeholder train sprites with actual game model renders
d16944e  Replace static train sprites with sprite sheets for dynamic perspective
fa69268  Revert "Replace static train sprites with sprite sheets for dynamic perspective"  ← current HEAD
```

---

## Session 2 — 2026-04-02

### Completed

- **Chroma key fixed — was targeting wrong color entirely**
  - Used Playwright to extract a video frame and analyze actual pixel data
  - Discovered background is **magenta RGB(255, 0, 246)**, not green (filename was misleading)
  - Rewrote chroma key: RGB Euclidean distance from magenta key color
  - Two-threshold system: inner=110 (fully transparent), outer=180 (fully opaque)
  - Smoothstep cubic hermite feathering eliminates jagged edges
  - Magenta spill suppression on edge pixels (R/B pulled toward G channel)

- **Video rendering fixed — was showing black rectangle**
  - `className="hidden"` (display:none) prevented browsers from decoding video frames → replaced with offscreen positioning (1×1px, opacity 0)
  - Added `video.play()` call with click/keydown fallback for autoplay-blocked browsers
  - Removed `video.paused` guard so current frame always renders even when paused

- **Auto-crop to character bounds**
  - VideoPlayer detects character pixel bounds each frame during chroma key pass
  - Canvas resized to crop region (grow-only, never shrinks to prevent flicker)
  - Eliminated the huge black bubble around the small character

- **Exclusion zone tightened**
  - Reduced from 300×400 to 160×220 display pixels

- **Real silhouette-based text wrapping**
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
| 2026-04-07 | Train obstacles + 3-track | Trains spawn top→bottom, character dodges on 3 lanes |
| 2026-04-07 | Text exclusion for trains | TrainRect[] integrated into text flow engine |
| 2026-04-07 | Train visual regression fix | Restored colorful trains + min gutter width |
| 2026-04-07 | Vercel build fix | Removed unused TRAIN_HEIGHT import |
| 2026-04-07 | Autonomous character | Removed keyboard input, fully random movement |
| 2026-04-08 | 3D model sprites | Real game model rendered via Three.js → transparent PNGs |
| 2026-04-08 | Dynamic perspective reverted | Sprite sheets rejected, back to static sprites |
