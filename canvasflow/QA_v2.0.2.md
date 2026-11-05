# CanvasFlow v2.0.2 QA — Editor Workspace Experience Redesign

## Scope

This release improves the **CanvasFlow editor application's interface**, not the styling of websites created with the editor. The editable project schema remains v12. Existing design/export logic and all v2.0 precision-canvas functionality are retained.

## Implemented

- Labeled Insert tool groups: Content, Media & layout, Graphics, and Vector tools. Existing `data-insert` and `data-vector-tool` actions are retained.
- Canvas controls grouped into viewport width, zoom/Fit, and an additional Canvas Tools menu. Existing control IDs and event bindings are retained.
- Recursive layer search across sections and nested containers. Matching descendants retain the parent rows needed to show their location; section-name matches reveal the complete section; Escape clears the search; `/` focuses the search when the user is not typing in another field.
- Refined brand/header, page manager, page list, layer tree, canvas stage, inspector cards, fields, selection summary, control states and responsive panel arrangements.
- Retained the v2.0.1 action menus and on-demand feature Guide.
- Kept editor-only changes in `styles.css`; `src/model.js` website HTML/CSS export logic is unchanged from v2.0.1.

## Automated verification

- `npm run check` — pass.
- `npm test` — 102/102 pass.
- HTML audit — 82 unique IDs, 0 duplicates.
- Local HTML asset references — 2 checked, 0 missing.
- CSS parser audit — 971 top-level rules, 0 parse errors (nested at-rules parsed recursively).
- Local server smoke test — GET `/`, `/src/app.js`, `/styles.css` returned 200; HEAD `/styles.css` returned 200 with MIME and Content-Length; POST returned 405; encoded path traversal returned 403.
- ZIP integrity — pass (37 entries, no corrupt member).
- Freshly extracted release — `npm run check` pass; `npm test` 102/102 pass.

## Manual browser checklist — outstanding

The environment blocks Playwright navigation to the local editor with `ERR_BLOCKED_BY_ADMINISTRATOR`, and the headless browser did not produce a usable render. These interactive checks have **not** been marked as passed:

- Confirm grouped Insert controls remain easy to reach with horizontal scrolling at smaller widths.
- Search for a nested child and verify its parent container stays visible; search for a section and verify its layers remain visible; `/` focuses and Escape clears the query.
- Open Canvas Tools and verify Hand, Centre, Guides, Grid and Rulers still operate and the menu dismisses after an action/outside click.
- Check menus/dialogs, save status, preview resizing and inspector controls.
- Confirm there is no horizontal page overflow at 320, 375, 768, 1024, 1366 and 1920 CSS pixels.
- Repeat the checks in Chrome, Edge and Android browser.

No manual browser pass is claimed in this report.
