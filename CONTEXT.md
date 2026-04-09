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

### Train Obstacles — Behavioral Requirements

> Noah wants train obstacles scrolling top-to-bottom through the text, and the character to navigate between three tracks (left, center, right), auto-jumping over trains.

- **No keyboard input.** The character is fully autonomous — random lane switches, auto-dodge, auto-jump. Noah explicitly rejected keyboard controls.
- **Train visuals must match the real Subway Surfers game.** Noah rejected hand-drawn Canvas 2D trains ("ugly and hand drawn") and low-quality renders. Current approach uses pre-rendered sprites from an actual 3D game model.
- **Text must exclude around trains** the same way it excludes around the character silhouette — trains get rectangular exclusion zones with min gutter width.
- **Train left/right perspective:** Noah wants the angled view where you can see the front, top, and inside of the train. Reference images were provided.
- **Dynamic perspective was rejected** in sprite-sheet form (8-frame sheets) — user said "it's worse" and reverted. A different approach is needed if this is revisited.

### Session Protocol

- Never make changes outside scope without asking. Flag unrelated bugs, don't fix silently.
- Check in after each logical chunk. Keep responses tight.
- Read CONTEXT.md, PROGRESS.md, ROADMAP.md, README.md at session start.
- Summarize env check (Node, npm, git, deps) before starting work.

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
| Train Sprites | Pre-rendered PNGs from 3D OBJ model | Rendered via Three.js + Playwright from actual Subway Surfers game model |
| Hosting | Vercel | Connected to GitHub repo |
| Dev Tool | Playwright | Installed as devDep for headless frame analysis + sprite rendering. Can be removed. |

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

### Why pre-rendered sprites for trains (not Canvas 2D drawing)

Noah rejected hand-drawn Canvas 2D trains as "ugly and hand drawn." Solution: downloaded the actual Subway Surfers train 3D model (OBJ format from The Models Resource), rendered three angles (left, center, right) via Three.js in a headless Playwright browser, exported as transparent PNGs. These provide game-accurate visuals without runtime 3D rendering overhead.

### Why static sprites (not sprite sheets)

Dynamic perspective via 8-frame sprite sheets was attempted (interpolating angle as trains scroll down). Noah said "it's worse" — the animation was jarring. Reverted to static sprites per angle. Any future dynamic approach needs a different strategy (possibly WebGL runtime rendering or smoother interpolation).

### Train text exclusion

Trains get rectangular exclusion zones (same `TrainRect` system) that integrate with the text flow engine. A minimum gutter width (`fontSize * 4.5`) prevents word clipping in narrow gaps between trains and the viewport edge.

### Autonomous character movement

No keyboard/touch input. The character randomly switches lanes and auto-dodges/auto-jumps over trains. This was an explicit requirement from Noah — the reader should not be distracted by gameplay controls.

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

## How the Train System Works

1. **trainObstacles.ts** manages train state: spawning, movement, collision detection, and color schemes
2. Trains spawn at random intervals at the top of the viewport on one of 3 tracks (left=0, center=1, right=2)
3. Each train has a color scheme (red, yellow, blue, silver, purple, green) and a hue rotation for sprite tinting
4. **TrainCanvas** renders trains using pre-rendered sprite PNGs:
   - `train-right.png` → left track (track 0) — shows right side of train
   - `train-center.png` → center track (track 1) — shows front of train
   - `train-left.png` → right track (track 2) — shows left side of train
   - **Note: left/right assignment is currently flipped** — user reported this but fix was deferred
5. Character auto-dodges by switching to an unoccupied lane; auto-jumps if no safe lane exists
6. `TrainRect[]` are passed to the text flow engine via `trainRectsRef` for text exclusion
7. Min gutter width (`fontSize * 4.5`) prevents word clipping near trains

---

## File Structure

```
subway-reader/
  public/
    subway-surfers.mp4              # Magenta-screen character video (720×720, ~20MB)
    train-left.png                  # 3D-rendered train sprite, left angle (~84KB)
    train-right.png                 # 3D-rendered train sprite, right angle (~89KB)
    train-center.png                # 3D-rendered train sprite, front angle (~33KB)
    favicon.svg                     # App favicon
    icons.svg                       # UI icon sprites
  src/
    App.tsx                         # Screen router (landing ↔ reader)
    types.ts                        # AppScreen, ReaderSettings, FlowLine, CharSilhouette
    index.css                       # Tailwind + dark theme base
    main.tsx                        # React entry point
    pages/
      LandingPage.tsx               # Upload PDF / paste text / "Start Reading"
      ReaderPage.tsx                # Orchestrates TextCanvas + VideoPlayer + TrainCanvas + controls
    components/
      FileUploader.tsx              # Drag-drop + file input for .pdf/.txt
      TextPaster.tsx                # Textarea for raw paste
      VideoPlayer.tsx               # Chroma key + auto-crop + silhouette extraction
      TextCanvas.tsx                # Canvas text renderer with silhouette + train exclusion
      TrainCanvas.tsx               # Train obstacle renderer using sprite PNGs
      ReaderControls.tsx            # Font size slider + back button
    hooks/
      usePretext.ts                 # prepareWithSegments lifecycle + font loading
      usePdfExtract.ts              # PDF extraction with loading/error state
      useAnimationFrame.ts          # rAF loop wrapper
    lib/
      textFlowEngine.ts             # Core: flowTextAroundBlob() — lays out text around silhouette + train rects
      trainObstacles.ts             # Train spawning, movement, collision, color schemes, rect calculation
      blobContour.ts                # ⚠️ DEAD CODE — superellipse math, no longer imported anywhere
      pdfExtractor.ts               # pdfjs-dist wrapper: File → text string
```

---

## Design Direction

- Dark theme: `#0a0a0a` background, `#e5e5e5` text
- Clean, minimal UI — no clutter
- Font: Inter (Google Fonts)
- Reader controls: floating bottom-right panel with backdrop blur

---

## 3D Model Asset Reference

The train sprites were rendered from a real Subway Surfers 3D model:
- **Source:** The Models Resource (https://models.spriters-resource.com/media/assets/299/302286.zip)
- **Format:** OBJ + MTL + `trains.png` texture
- **Render method:** Three.js + OBJLoader/MTLLoader in headless Playwright browser
- **Output:** Three transparent PNGs at different camera angles (left, center, right)
- **Local model files:** Not committed to repo. Stored at `/home/user/workspace/subway-train-model/Subway/`
