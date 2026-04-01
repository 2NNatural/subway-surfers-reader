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

**Chosen approach:** Organic blob shape (superellipse n=3) as the exclusion contour. Not the character's pixel silhouette (that would cause text to reshuffle every frame as the character animates).

### Video Source

- Noah has a green screen MP4: `~/Downloads/SubwaySurfersJakeRunning(GreenScreen).mp4`
- Copied to: `public/subway-surfers.mp4`
- Real-time chroma key removal renders the character with transparent background
- Noah offered: "If it would help, I can upload a green screened character video" and "If an MP4 would be better than iFrame, we can do that too"

### Video Size

- **Medium (300×400px)** — Noah's choice from options presented

---

## Corrections Made This Session

### 1. Chroma Key Not Working

Noah said: **"It doesn't look like a subway surfers character at all, did you base it off the video?"**

Root cause: I wrote the chroma key algorithm blindly without inspecting the actual video file. The initial algorithm was too simplistic (basic RGB thresholds). 

Fix attempted: Rewrote with HSL-based detection, native resolution rendering, and edge softening.

Noah followed up: **"it still looks the same"**

**Status: UNRESOLVED.** The chroma key is the #1 blocker. Next session must:
1. Actually view/inspect the video to understand its green screen characteristics
2. Install ffmpeg to extract a frame and analyze the color values
3. Tune the chroma key thresholds based on actual pixel data, not guesses
4. Consider whether the video needs preprocessing

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
| Video | HTML5 `<video>` + Canvas chroma key | Green screen MP4, real-time per-pixel processing |

### Pretext API (Confirmed from `@chenglou/pretext` v0.0.3)

```typescript
// Key imports
import { prepare, prepareWithSegments, layout, layoutNextLine, layoutWithLines } from '@chenglou/pretext'

// One-time preparation (~19ms for large texts)
const prepared = prepareWithSegments(text, '18px Inter')

// Full layout (for height estimation)
const { height, lineCount } = layout(prepared, maxWidth, lineHeight)

// CRITICAL: Variable-width per line (for exclusion zones)
// This is the core API that makes text wrapping work
const line = layoutNextLine(prepared, cursor, maxWidth)
// Returns: { text, width, start: LayoutCursor, end: LayoutCursor } | null
// cursor = { segmentIndex: number, graphemeIndex: number }
```

**Performance:** `layoutNextLine()` is pure arithmetic over cached measurements (~0.0002ms per call). Full document re-layout on every scroll frame is sub-millisecond.

---

## Architecture Decisions

### Why Canvas rendering (not DOM)

Pretext is measurement-only — it doesn't render. We use `ctx.fillText()` on a fixed Canvas covering the viewport. A scroll container with a spacer div provides native scrollbar behavior.

### Why superellipse exclusion (not pixel-based silhouette tracking)

The character moves/animates within the video. Tracking exact pixel boundaries per frame would cause text to constantly reshuffle — unreadable. A fixed organic contour (superellipse n=3) provides stable reading. The character animates freely inside the shape.

### Why full re-layout per scroll frame

The video is viewport-fixed, so its document-space position changes with every scroll event. This means the exclusion zone moves relative to the text. Rather than caching and invalidating, we re-layout the entire document each frame. At <1ms per layout pass, this is well within the 16ms frame budget.

### Why not YouTube iframe

Initially planned as YouTube embed. Changed to local MP4 because:
1. Noah has a green screen video that needs chroma key processing
2. Canvas pixel manipulation is impossible on cross-origin iframes
3. MP4 gives full control over playback and rendering

---

## File Structure

```
subway-reader/
  public/
    subway-surfers.mp4              # Green screen character video
  src/
    App.tsx                         # Screen router (landing ↔ reader)
    types.ts                        # AppScreen, ReaderSettings, FlowLine
    index.css                       # Tailwind + dark theme base
    main.tsx                        # React entry point
    pages/
      LandingPage.tsx               # Upload PDF / paste text / "Start Reading"
      ReaderPage.tsx                # Orchestrates TextCanvas + VideoPlayer + controls
    components/
      FileUploader.tsx              # Drag-drop + file input for .pdf/.txt
      TextPaster.tsx                # Textarea for raw paste
      VideoPlayer.tsx               # Chroma-keyed video canvas (NEEDS FIXING)
      TextCanvas.tsx                # Canvas text renderer with exclusion zone
      ReaderControls.tsx            # Font size slider + back button
    hooks/
      usePretext.ts                 # prepareWithSegments lifecycle + font loading
      usePdfExtract.ts              # PDF extraction with loading/error state
      useAnimationFrame.ts          # rAF loop wrapper
    lib/
      textFlowEngine.ts             # Core: flowTextAroundBlob() — lays out text around superellipse
      blobContour.ts                # Superellipse math: getBlobEdges(), blobToClipPath()
      pdfExtractor.ts               # pdfjs-dist wrapper: File → text string
```

---

## How the Exclusion Zone Works

1. Video is `position: fixed` at viewport center
2. In document-space, the blob center = `(viewportWidth/2, viewportHeight/2 + scrollTop)`
3. For each text line at Y position:
   - Query `getBlobEdges(yFromBlobCenter, blobHeight, blobWidth)` → returns `{left, right}` offsets or `null`
   - If `null`: full-width line via `layoutNextLine(prepared, cursor, fullWidth)`
   - If intersects: two `layoutNextLine()` calls — left gutter width and right gutter width
   - Text flows continuously: left gutter → right gutter → next line
4. Canvas paints only lines visible in viewport via `ctx.fillText()`

---

## Design Direction

- Dark theme: `#0a0a0a` background, `#e5e5e5` text
- Clean, minimal UI — no clutter
- Font: Inter (Google Fonts)
- Reader controls: floating bottom-right panel with backdrop blur
