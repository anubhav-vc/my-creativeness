# CanvasFlow v2.0.0 — QA report

Date: 2 November 2026  
Baseline: supplied CanvasFlow v1.9.0 Advanced Layout Studio ZIP  
Release: v2.0.0 Precision Canvas & Transform Studio  
Project schema: v12  
Runtime: Node.js v22.16.0

## Summary

The v2.0.0 release extends the supplied v1.9.0 project rather than replacing it. The original responsive website workflow remains the default. Precision composition is an explicit Free-position mode for eligible elements and nested containers; the older overlay/vector positioning system remains compatible.

## Automated verification

| Check | Result |
|---|---:|
| `npm run check` | Pass; includes `src/geometry.js` syntax check |
| `npm test` | **100 passed, 0 failed** |
| HTML ID audit | 77 IDs, 0 duplicates |
| Local HTML references | 2 checked, 0 missing (`./styles.css`, `./src/app.js`) |
| `styles.css` parsing with tinycss2 | 538 top-level rules, 0 parse errors |
| Generated Free-position CSS parsing | 109 top-level rules, 0 parse errors |
| Local server `GET /` | HTTP 200 |
| Local server `GET /styles.css` | HTTP 200, `text/css` |
| Local server `GET /src/geometry.js` | HTTP 200, `text/javascript` |
| Local server `HEAD /styles.css` | HTTP 200 with content type and length |
| Local server `POST /` | HTTP 405 |
| Encoded path traversal probe | HTTP 403 |
| ZIP integrity | Pass; 31 entries, `testzip() is None` |
| Freshly extracted release | `npm run check` passes; **100 tests pass** |

## v2.0-specific coverage

- Schema v11 projects migrate to schema v12 without losing existing content or responsive section settings. Imports support schema v1–v11.
- Free-position geometry is normalized and bounded. Parent-relative X/Y, units, width, height, rotation, transform origin, and Tablet/Mobile overrides are retained and exported as CSS absolute positioning and responsive media queries.
- Existing Flow layout remains the default. Responsive container/section layouts continue to work; the precision mode does not change the webpage viewport when editor zoom changes.
- Geometry helpers cover zoom bounds, resize handles, aspect constraints, snapping, selection bounds, alignment, and distribution. Snap acquisition tolerance is adjusted by editor zoom to remain near eight screen pixels.
- Preview bridge source syntax and editor wiring are tested. Pointer cancellation restores pre-gesture styles; committed transforms are stored in parent-local coordinates.
- Snapping settings cover grid, parent edges/centres, siblings, user guides, equal spacing and axis enablement. Alt bypass and group-aware snap exclusion are covered.
- Ruler guide creation maps the top ruler to vertical X guides and the left ruler to horizontal Y guides. Guides are translated into the selected nested parent's coordinate space. Touch devices can use two-finger pan/pinch for the editor camera; multi-touch camera gestures cancel in-progress edits transactionally.
- Multi-selection arrangement is measured in the live preview at the active breakpoint and only applies to compatible Free-position elements sharing a parent. Match width, Match height, and Match size use the first selected element as their reference. Centre selection measures live selected bounds and adjusts the editor camera without changing document coordinates.
- Editor-only rulers, grid overlays, guides, handles and snap indicators are not serialized into exported website CSS/HTML.
- Legacy section overlays, existing layout presets, component definitions, vectors, assets, typography, interactions, multi-page projects and prior responsive settings remain covered by the full regression suite.
- The schema-5 compatibility save is skipped when v12-only precision data would otherwise be lost in an older-format copy.

## Package and compatibility notes

- The current local storage key is `canvasflow.mvp.project.v12`; older v11 through v1 keys are checked for migration.
- The project format is schema v12. Older CanvasFlow builds should not be used to reopen v12 backups; create a backup before downgrading.
- Node.js 22 or newer is required for the included local development server and test workflow.
- `V2.0_PLAN.md` is included in the release ZIP to preserve the approved implementation specification alongside the source.

## Manual browser verification still required

This environment can run the project tests and local HTTP smoke checks, but it could not complete a genuine interactive Chrome/Edge/Android session. No full manual browser pass is claimed. Before relying on the editor for a production project, verify:

1. Zoom to 25%, 50%, 100%, 150% and 200%; confirm Fit (including Ctrl/Cmd+Shift+F), pointer-centred zoom, Hand, Space+drag, Centre selection, two-finger touch pan/pinch, and that the website viewport width does not change.
2. Convert ordinary content and a nested container from Flow to Free position; confirm the element remains inside its intended parent and normal Flow content remains responsive.
3. Resize using all eight handles, rotate, use aspect lock and exact numeric fields; test both unrotated and rotated selections, undo/redo, Escape and pointer cancellation.
4. Repeat transforms inside nested containers with padding and borders; inspect parent-relative X/Y and verify repeated drag/resize operations do not accumulate drift.
5. Test each snapping option independently, Alt bypass, group movement and equal-spacing behaviour at different zoom levels.
6. Drag guides from both rulers; move, lock, hide, delete and clear them. Test guide snapping inside a nested Free-position parent.
7. Align, distribute, and Match width/height/size for multi-selected Free-position elements at Desktop, Tablet and Mobile breakpoints; confirm unrelated selections and parent containers are unchanged.
8. Save, refresh, reopen, import a v1.9.0 backup, and export a multi-page site containing nested containers and Free-position elements. Inspect the exported site at desktop/tablet/mobile widths.
9. Test touch interactions and keyboard navigation on Android/Chrome and desktop Chrome/Edge. In particular, verify that two-finger gestures do not accidentally move or resize an element and that releasing one finger ends camera mode cleanly.

## Final source smoke checks

- Local server on an isolated port: `GET /` 200; `GET /styles.css` 200 (`text/css`); `GET /src/geometry.js` 200 (`text/javascript`); `HEAD /styles.css` 200 with content type and content length; `POST /` 405; encoded path traversal 403.
- HTML audit: 77 IDs, no duplicates; both local script/style references resolve. `styles.css` has 538 parseable top-level rules; representative generated Free-position CSS including Tablet/Mobile overrides has 109 parseable top-level rules; both parse with zero tinycss2 errors.
- The final ZIP contains 31 entries, including the approved plan and QA report. `ZipFile.testzip()` returns `None`; a clean extraction passes `npm run check` and all **100 tests**.

## Run locally

Extract the release ZIP, open a terminal in the project folder, and run:

```bash
npm start
```

Then visit `http://localhost:4173`. Run `npm run check` and `npm test` to repeat automated checks.
