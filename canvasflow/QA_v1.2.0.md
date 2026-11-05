# CanvasFlow v1.2.0 — QA & Debug Assurance Report

**Release date:** 29 October 2026  
**Release:** Motion Design Studio  
**Baseline:** CanvasFlow v1.1.0 Precision Design Studio  
**Project schema:** v7 (unchanged; older v1–v7 backups remain supported)

## Release summary

CanvasFlow v1.2.0 adds per-element motion duration, delay, easing, direction, and trigger settings to the existing editor. Supported trigger modes are page load, viewport entry, and hover/focus. The Motion inspector can request a replay of the selected element in the sandboxed preview iframe. A self-contained IntersectionObserver script is emitted into exported HTML only when at least one element uses viewport-triggered motion.

Motion values are normalized through allow-lists and numeric bounds; arbitrary user-provided JavaScript is not executed. The `prefers-reduced-motion` stylesheet rule now also clears animation delay, and viewport-triggered elements are not hidden when reduced motion is enabled. If IntersectionObserver is unavailable, content is shown and the animation can play immediately.

## Automated verification

- `npm run check` — passed (server and editor/model/utility scripts parse).
- `npm test` — **43 passed, 0 failed**.
- Source archive and sample export archive — ZIP integrity checks passed.
- Local server smoke test — `/` returned HTTP 200.

### Coverage added in v1.2

1. Motion setting defaults, bounds (duration 100–5000 ms; delay 0–3000 ms), allow-listed easing/direction/trigger values, and legacy project normalization.
2. Generated CSS for duration, delay, easing, direction and hover/focus trigger.
3. Conditional inclusion of the viewport observer runtime, runtime JavaScript syntax, reduced-motion CSS, and fallback behavior.
4. A simulated IntersectionObserver pass confirming viewport items switch from `cf-motion-pending` to `cf-motion-active` and are unobserved after first entry.
5. Inspector wiring for motion settings, deferred numeric entry (values commit on change rather than being clamped each keystroke), and the Preview motion message bridge.
6. Existing regression coverage remains green for schema compatibility, safe URL handling, responsive CSS, image assets, history, overlay movement/stacking, layer visibility/opacity/locking, and ZIP structure.

## Manual verification still required

A full interactive browser test was **not completed** in this build environment. A headless Chromium launch timed out, so no claim is made that all UI interactions were verified in a real browser. Before publishing, test in Chrome and Edge:

- Change duration and delay by typing multi-digit values, then confirm the preview/export uses the saved values.
- Preview/replay each of the seven entrance styles.
- Confirm load, viewport-entry and hover/focus modes work in the editor preview and in the exported sample site.
- Scroll down and back to verify viewport animations play once on entry and content never remains hidden.
- Enable operating-system/browser reduced-motion preferences and confirm motion is minimized and all viewport-triggered content remains visible.
- Check editor layout at desktop and mobile widths, plus real touch behavior.
- Save, refresh, close and reopen the editor in Chrome/Edge to verify persistent `localStorage`, and test project backup/restore.

No GitHub publication or deployment was performed. CanvasFlow remains a local-first personal-development prototype, not a commercial-grade hosted platform.
