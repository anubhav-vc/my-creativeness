# CanvasFlow v1.8.0 — Responsive Layout Engine QA

## Release scope

v1.8.0 adds a section-level responsive layout engine while retaining the v1.7.1 Component and Interaction Studio. The editable project format is schema v10. Schema v1–v9 projects are accepted and normalized into v10; existing text, assets, pages, component definitions, variants, and supported interactions are retained.

## Implemented

- Section layout modes: Stack, Flexbox, fixed Grid, auto-fit Grid, and the retained legacy two-column mode.
- Flexbox settings: row/row-reverse/column/column-reverse direction, wrapping, main-axis distribution, and cross-axis alignment.
- Grid settings: fixed 1–6 columns or auto-fit columns with a bounded 120–480 px minimum card width.
- Responsive section layout fields are stored as independent Tablet and Mobile overrides. Unset values inherit from the wider/base layout.
- Layout settings and section gaps are bounded and normalized during project import; generated output uses normal CSS Flexbox/Grid and media queries.
- Flexbox cards receive a flexible 240 px basis so row wrapping produces columns rather than full-width cards.
- Existing alignment guides/snapping, overlay editing, multi-page export, design tokens, asset library, vector tools, linked components, variants, and safe button interactions are retained.

## Automated verification

Run from the project root with Node.js 22 or newer:

```bash
npm run check
npm test
```

Results:

- `npm run check`: passed.
- `npm test`: **89 passed, 0 failed**.
- Migration test confirms schema v9 sections retain content and legacy alignment intent when normalized to schema v10.
- Responsive CSS tests cover fixed Grid, auto-fit Grid, Flexbox direction/wrapping/distribution/alignment, gap bounds, Tablet/Mobile output, and rejection of unsupported values.
- Editor wiring test checks layout-mode controls, Flexbox/Grid inspector fields, and breakpoint-specific property storage.
- The retained local-server integration test covers GET, HEAD headers, method rejection, and encoded path traversal rejection.

## Package audit

The release ZIP was extracted into a clean directory and verified independently:

- Archive integrity: passed; **27 entries**, about 174 KiB; no `.bak` files included.
- Extracted package: `npm run check` passed and `npm test` passed **89/89**.
- Editor HTML: **72 IDs**, zero duplicates; **2** local stylesheet/script references checked, zero missing.
- Editor stylesheet: **500** top-level CSS rules, zero parser errors.
- Generated Flexbox/Grid export sample: **105** top-level CSS rules, zero parser errors. The sample includes a Flexbox base layout, a Tablet fixed-Grid override, and a Mobile auto-fit Grid override.
- Extracted local server: `GET /` = 200; `GET /src/app.js` = 200; `HEAD /styles.css` = 200 with `text/css` and a content length; `POST /` = 405; encoded traversal request rejected (403/404).

## Manual browser checklist

A full interactive browser session is not claimed in this environment. An earlier headless Chromium attempt was blocked by the environment (`ERR_BLOCKED_BY_ADMINISTRATOR`). Please manually verify in Chrome or Edge:

1. Switch a section between Stack, Flexbox, fixed Grid, and auto-fit Grid.
2. In Flexbox, test row and column directions, wrapping, distribution, and cross-axis alignment. Confirm cards wrap into multiple columns when space allows.
3. In Grid, test 2–4 fixed columns, then auto-fit with several minimum card widths.
4. Change a section's layout at Tablet and Mobile. Confirm Mobile inherits Tablet values that have not been explicitly overridden.
5. Save, refresh, reopen the project, and confirm the layout settings persist.
6. Import a v1.7.1 project backup and confirm its existing components, variants, interactions, pages, and assets remain intact.
7. Export the website and inspect it at desktop, tablet, and phone widths; confirm the output works without the CanvasFlow editor.

## Boundaries

- The editor remains a local-first prototype with browser localStorage; keep portable project backups.
- Responsive breakpoints are fixed to the editor's Tablet and Mobile presets; user-defined breakpoint widths are not part of v1.8.
- Grid and Flexbox apply to section children in normal content flow. Overlay shapes/vectors remain a separate decorative layer.
- Manual browser verification, touch interaction, and testing across real Android/iOS devices remain outstanding.
