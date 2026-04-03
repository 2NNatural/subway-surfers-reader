# CONTEXT.md — Subway Reader

> Upload this file at the start of every new Claude session for this project.

---

## Project Goal (Noah's Words)

> "I need to build a web application designed to help users read long-form text (like textbooks or study sheets) while simultaneously keeping their attention engaged by playing a loop of 'Subway Surfers' gameplay directly in the middle of the text."

---

## Noah's Instructions — Verbatim

### Layout Rules (Strict Requirements)

> "The text MUST explicitly wrap around the central video container. It cannot be split-screen, it cannot be pushed to a sidebar, and it MUST NOT be layered on top of the video with transparency/text-shadows."

> "You must use pretext's layout engine to calculate bounding boxes and actively route the text flow around a designated central rectangular exclusion zone where the video player sits. The text should flow seamlessly from the left side of the video to the right side, continuing down the page."

### Text Engine — Non-Negotiable

> "You MUST use pretext (the TypeScript library that measures and lays out text 500x faster than the DOM). This is non-negotiable for handling massive textbook strings efficiently."

### Scrolling Behavior

> "Manual Scroll: The user will scroll through the text manually. Do not implement any auto-scroll or teleprompter behavior."

> "Pinned Video: The Subway Surfers video container must remain pinned/fixed in the exact center of the viewport at all times."

> "Dynamic Wrapping: As the user scrolls the document, the pretext engine must account for the scroll position and seamlessly flow the text around the stationary central video container."

### Video Wrapping Shape

> "I want it to loop around the subway surfers character itself like the image, not the entire video frame"

Noah provided a reference image showing text wrapping around an irregular dragon silhouette in a medieval manuscript — the text flows around the character's actual shape, not a rectangle.

**Current implementation:** Real per-frame silhouette tracking. VideoPlayer computes per-row left/right edges of the character each frame. Text flow engine uses those edges (with temporal smoothing) to wrap text tightly around the character's actual outline.

**Previous approach (superseded):** Superellipse (n=3) as a static organic blob contour. Replaced in Session 2 because Noah wanted the text to follow the actual character shape.

### Video Source

- Noah has a **magenta** screen MP4 (filename says "GreenScreen" but the actual background is **RGB(255, 0, 246)**, hue ~302°)
- Copied to: `public/subway-surfers.mp4`
- Video specs: **720×720**, ~16 seconds, ~20MB
- Real-time chroma key removal renders the character with transparent background

### Video Size

- **Medium (300×400px)** — Noah's original choice, later tightened
- **Current display size:** 160×220px (set in `ReaderPage.tsx`)
- Canvas auto-crops to character bounds each frame, then CSS scales to display size

---

## Corrections Made Across Sessions

### Session 1: Chroma Key Targeting Wrong Color

Noah said: **"It doesn't look like a subway surfers character at all, did you base it off the video?"**

Root cause: Chroma key algorithm was written blindly targeting green (hue 70°–170°). The video background is actually **magenta RGB(255, 0, 246)**. The filename "GreenScreen" was misleading.

Fix (Session 2): Used Playwright + Canvas to extract a frame and analyze actual pixel data. Rewrote chroma key to target magenta using RGB Euclidean distance.

### Session 2: Video Not Rendering (Black Rectangle)

Noah said: **"there was no change, it is still a black blob with no color, that is not fitted to a recognizable character shape."**

Root cause: Three compounding issues:
1. `className="hidden"` uses `display:none` — browsers skip video frame decoding for hidden elements
2. `video.paused` guard in the animation loop meant nothing rendered if autoplay was blocked
3. Canvas defaulted to opaque 300×150 when never drawn to

Fix: Replaced `className="hidden"` with offscreen positioning (1×1px, opacity 0). Added `video.play()` with click/keydown fallback. Removed `video.paused` guard.

### Session 2: Huge Black Bubble Around Character

Noah said: **"there's a HUGE black bubble around him. Can we crop to around the sprite exactly?"**

Root cause: The 720×720 video frame was being rendered at 300×400 display size. The character is small within the frame, so most of the canvas was transparent (appears black on dark background), and the 300×400 exclusion zone pushed text far away.

Fix: Added runtime auto-crop — VideoPlayer detects character bounds per frame and only renders the cropped region. Reduced exclusion zone from 300×400 to 160×220.

### Session 2: Text Should Follow Character Shape

Noah said: **"tailor it to actually be a wrap around the character"**

Root cause: The superellipse exclusion zone was a static generic shape, not fitted to the character.

Fix: Replaced the superellipse system with real per-frame silhouette tracking. VideoPlayer builds per-row edge maps during chroma key processing. Text flow engine reads those edges (via shared ref) to create variable-width exclusion zones matching the actual character outline. Temporal smoothing prevents text jitter.

---

## Technical Stack

| Layer | Technology | Version/Notes |
|-------|-----------|---------------|
| Framework | React + TypeScript | via Vite |
| Bundler | Vite | v8.0.3 |
| Text Layout | `@chenglou/pretext` | `@chenglou/pretext` on npm. By Cheng Lou (ex-React core, Midjourney). 300-600x faster than DOM. |
| PDF Parsing | `pdfjs-dist` | Extracts raw text from uploaded PDFs |
| Styling | Tailwind CSS v4 | `@tailwindcss/vite` plugin |
| Font | Inter | Loaded via Google Fonts |
| Video | HTML5 `<video>` + Canvas chroma key | Magenta screen MP4, real-time per-pixel processing |
| Dev Tool | Playwright | Installed as devDep for headless frame analysis. Can be removed. |

### Pretext API (Confirmed from `@chenglou/pretext` v0.0.3)

```typescript
import { prepare, prepareWithSegments, layout, layoutNextLine, layoutWithLines } from '@chenglou/pretext'

const prepared = prepareWithSegments(text, '18px Inter')
const { height, lineCount } = layout(prepared, maxWidth, lineHeight)
const line = layoutNextLine(prepared, cursor, maxWidth)
// Returns: { text, width, start: LayoutCursor, end: LayoutCursor } | null
// cursor = { segmentIndex: number, graphemeIndex: number }
```

**Performance:** `layoutNextLine()` is pure arithmetic over cached measurements (~0.0002ms per call). Full document re-layout on every scroll frame is sub-millisecond.

---

## Architecture Decisions

### Why Canvas rendering (not DOM)

Pretext is measurement-only — it doesn't render. We use `ctx.fillText()` on a fixed Canvas covering the viewport. A scroll container with a spacer div provides native scrollbar behavior.

### Why per-frame silhouette tracking (not static shape)

The character animates, so the text wrapping follows the actual outline each frame. Temporal smoothing (edges expand instantly, shrink at 4% per frame) prevents text from jittering. This replaced the original superellipse approach because Noah wanted text to follow the real character shape.

### Why full re-layout per scroll frame

The video is viewport-fixed, so its document-space position changes with every scroll event. This means the exclusion zone moves relative to the text. At <1ms per layout pass, this is well within the 16ms frame budget.

### Why not YouTube iframe

Changed to local MP4 because:
1. Noah has a chroma-key video that needs pixel processing
2. Canvas pixel manipulation is impossible on cross-origin iframes
3. MP4 gives full control over playback and rendering

### Why offscreen positioning (not display:none)

`display:none` prevents browsers from decoding video frames. The `<video>` element is positioned at 1×1px with opacity 0, which keeps it decodable without being visible.

---

## How the Silhouette Wrapping Works

1. **VideoPlayer** renders each frame, runs chroma key, and simultaneously tracks per-row min/max X of non-transparent pixels
2. Character bounds are auto-cropped (grow-only crop box), canvas resized to crop region
3. Per-row edges are converted from native video pixels to display coordinates, stored as `CharSilhouette` (Float32Array of left/right offsets from center)
4. Temporal smoothing: edges expand instantly to wider positions, shrink back at `SHRINK_RATE = 0.04` per frame
5. `silhouetteRef` (shared React ref) passes the silhouette from VideoPlayer to TextCanvas each frame
6. **textFlowEngine** reads the silhouette: for each text line at Y, looks up the silhouette row, gets left/right exclusion edges
7. Two `layoutNextLine()` calls per affected row: left gutter and right gutter
8. Fallback: if no silhouette yet (first frame), uses simple rectangular exclusion (160×220)

### Chroma Key Algorithm

- **Key color:** RGB(255, 0, 246) — magenta
- **Method:** RGB Euclidean distance from key color
- **Inner threshold:** 110 (distance < 110 → fully transparent)
- **Outer threshold:** 180 (distance > 180 → fully opaque)
- **Feather zone:** smoothstep cubic hermite `t²(3-2t)` for alpha between thresholds
- **Spill suppression:** edge pixels have R and B channels pulled toward green channel to remove magenta fringing

---

## File Structure

```
subway-reader/
  public/
    subway-surfers.mp4              # Magenta-screen character video (720×720, ~20MB)
  src/
    App.tsx                         # Screen router (landing ↔ reader)
    types.ts                        # AppScreen, ReaderSettings, FlowLine, CharSilhouette
    index.css                       # Tailwind + dark theme base
    main.tsx                        # React entry point
    pages/
      LandingPage.tsx               # Upload PDF / paste text / "Start Reading"
      ReaderPage.tsx                # Orchestrates TextCanvas + VideoPlayer + controls, owns silhouetteRef
    components/
      FileUploader.tsx              # Drag-drop + file input for .pdf/.txt
      TextPaster.tsx                # Textarea for raw paste
      VideoPlayer.tsx               # Chroma key + auto-crop + silhouette extraction
      TextCanvas.tsx                # Canvas text renderer with silhouette-based exclusion
      ReaderControls.tsx            # Font size slider + back button
    hooks/
      usePretext.ts                 # prepareWithSegments lifecycle + font loading
      usePdfExtract.ts              # PDF extraction with loading/error state
      useAnimationFrame.ts          # rAF loop wrapper
    lib/
      textFlowEngine.ts             # Core: flowTextAroundBlob() — lays out text around silhouette
      blobContour.ts                # ⚠️ DEAD CODE — superellipse math, no longer imported anywhere
      pdfExtractor.ts               # pdfjs-dist wrapper: File → text string
```

---

## Design Direction

- Dark theme: `#0a0a0a` background, `#e5e5e5` text
- Clean, minimal UI — no clutter
- Font: Inter (Google Fonts)
- Reader controls: floating bottom-right panel with backdrop blur
