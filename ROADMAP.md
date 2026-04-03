# ROADMAP.md — Subway Reader

> Single source of truth for what comes next. No competing task lists elsewhere.

---

## [NEXT] — Clean Up Dead Code

- Delete `src/lib/blobContour.ts` — superellipse math, no longer imported after silhouette rewrite
- Remove `playwright` from devDependencies if no longer needed for debugging
- Remove `public/analyze-frame.html` and `public/analyze.html` if they were recreated

## [NEXT] — Verify Text Wrapping Works End-to-End

- Paste a large block of text and confirm it wraps tightly around the character silhouette
- Scroll through and verify the exclusion zone moves correctly with scroll
- Test with a PDF upload
- Check that font size slider triggers re-layout
- Verify on different viewport sizes

## [NEXT] — Tune Silhouette Wrapping Feel

- Adjust `GAP` (currently 14px in `textFlowEngine.ts`) — may need per-user preference
- Adjust `SHRINK_RATE` (currently 0.04 in `VideoPlayer.tsx`) — controls how fast text closes in when character moves
- Adjust `CROP_PAD` (currently 10 in `VideoPlayer.tsx`)
- Consider whether `BLOB_WIDTH`/`BLOB_HEIGHT` (160×220 in `ReaderPage.tsx`) need to be dynamic based on actual detected character size

## [SOON] — Polish & Edge Cases

- Loading spinner / transition animation from landing → reader
- Handle empty text gracefully
- Handle very short text (shorter than viewport)
- Window resize → re-layout
- Scrollbar jump fix (document height estimation)

## [SOON] — Video Controls

- Let user pick their own MP4 video file (file picker on reader page or landing page)
- Adjustable video size (drag handle or presets)

## [LATER] — Performance Optimization

- Profile chroma key + silhouette on lower-end machines (518,400 pixels per frame)
- Consider WebGL shader for chroma key if CPU approach is too slow
- For very long documents (100+ pages), profile the `layoutNextLine` loop
- If >2ms per frame, implement cursor-caching: pre-compute full-width lines, use their cursors to jump to the exclusion zone region
- Virtualize canvas painting (only compute layout for visible + buffer lines)
- Consider making crop box shrink slowly (currently only grows)

## [LATER] — TXT File Formatting

- Preserve paragraph breaks from `.txt` files
- Handle common text formatting (headers, bullet points) if detectable

## [MAYBE] — Additional Features

- Multiple exclusion shape modes: silhouette (current), ellipse, rounded rect
- Dark/light theme toggle
- Reading progress indicator
- Bookmark / resume position
- Mobile responsive layout
