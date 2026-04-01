# ROADMAP.md — Subway Reader

---

## [NEXT] — Fix Chroma Key (Session Blocker)

- Install ffmpeg or use Canvas to extract a single frame from the video and inspect actual pixel colors
- Log the RGB/HSL values of the green screen pixels vs the character pixels
- Tune `isGreen` thresholds in `VideoPlayer.tsx` based on real data
- If the green screen is not a clean chroma green (e.g. lime, teal, or has compression artifacts), adjust detection range or add noise tolerance
- Consider if the video needs pre-processing (e.g. ffmpeg chromakey filter to WebM with alpha)
- Test with hard refresh (Cmd+Shift+R) after every change — browser may cache old version

## [NEXT] — Verify Text Wrapping Works End-to-End

- Paste a large block of text and confirm it wraps organically around the blob
- Scroll through and verify the exclusion zone moves correctly with scroll
- Test with a PDF upload
- Check that font size slider triggers re-layout

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

- For very long documents (100+ pages), profile the `layoutNextLine` loop
- If >2ms per frame, implement cursor-caching: pre-compute full-width lines, use their cursors to jump to the exclusion zone region
- Virtualize canvas painting (only compute layout for visible + buffer lines)

## [LATER] — TXT File Formatting

- Preserve paragraph breaks from `.txt` files
- Handle common text formatting (headers, bullet points) if detectable

## [MAYBE] — Additional Features

- Multiple blob shapes to choose from (ellipse, rounded rect, custom SVG path)
- Dark/light theme toggle
- Reading progress indicator
- Bookmark / resume position
- Mobile responsive layout
