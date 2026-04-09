# ROADMAP.md — Subway Reader

> Single source of truth for what comes next. No competing task lists elsewhere.
> Ordered by priority. Work top-down.

---

## [BUG] Fix flipped train left/right sprites

Train sprites are assigned to the wrong tracks: `train-right.png` renders on the left track and `train-left.png` on the right track. Swap the mapping in `TrainCanvas.tsx`.

## [BUG] Delete dead code

- Delete `src/lib/blobContour.ts` — superellipse math, no longer imported after Session 2 silhouette rewrite
- Remove `public/analyze-frame.html` and `public/analyze.html` if present
- Audit for any other orphaned files

## [FEATURE] Improve train perspective / visual quality

Noah wants trains angled so you can see front, top, and inside. The static sprites show this but don't change as trains scroll closer. Sprite sheet approach was rejected (too jarring). Possible approaches:
- WebGL runtime rendering of the OBJ model (real-time camera angle based on Y position)
- Fewer interpolation steps with eased transitions
- Subtle CSS transform (scale + slight rotate) as trains approach
- Accept static sprites as good enough

## [CLEANUP] Remove Playwright from devDependencies

Only needed for headless frame analysis (Session 2) and sprite rendering (Session 3). Can be removed now that sprites are committed. Re-add if needed later.

## [FEATURE] Tune silhouette wrapping feel

- Adjust `GAP` (currently 14px in `textFlowEngine.ts`) — may need per-user preference
- Adjust `SHRINK_RATE` (currently 0.04 in `VideoPlayer.tsx`) — controls how fast text closes in
- Adjust `CROP_PAD` (currently 10 in `VideoPlayer.tsx`)
- Consider making `BLOB_WIDTH`/`BLOB_HEIGHT` (160×220 in `ReaderPage.tsx`) dynamic based on actual detected character size

## [POLISH] Loading & edge cases

- Loading spinner / transition animation from landing → reader
- Handle empty text gracefully
- Handle very short text (shorter than viewport)
- Window resize → re-layout
- Scrollbar jump fix (document height estimation)

## [FEATURE] Video controls

- Let user pick their own MP4 video file
- Adjustable video size (drag handle or presets)

## [PERF] Performance optimization

- Profile chroma key + silhouette on lower-end machines (518,400 pixels per frame)
- Consider WebGL shader for chroma key if CPU approach is too slow
- For very long documents (100+ pages), profile the `layoutNextLine` loop
- Virtualize canvas painting (only compute layout for visible + buffer lines)
- Consider making crop box shrink slowly (currently only grows)

## [FEATURE] TXT file formatting

- Preserve paragraph breaks from `.txt` files
- Handle common text formatting (headers, bullet points) if detectable

## [MAYBE] Additional features

- Multiple exclusion shape modes: silhouette (current), ellipse, rounded rect
- Dark/light theme toggle
- Reading progress indicator
- Bookmark / resume position
- Mobile responsive layout
