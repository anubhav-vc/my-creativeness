# CanvasFlow v1.7.1 — Component Studio refinement QA

## Release summary

This is a maintenance/refinement release built directly on v1.7.0. It does not change the project schema: **schema v9 remains current**, and v1.7.0 backups remain compatible.

## Changes

- Fixed shape component variants so `shapeKind` is an allowed, validated variant property. Circle, pill, triangle, diamond, hexagon, star and ring variants now survive project normalization and render through the normal shape CSS/export path.
- Added direct per-variant styling controls in Component Studio for buttons, cards, headings/paragraphs, images, shapes, dividers and vectors. Empty fields inherit from the shared master; entered values become explicit variant overrides.
- Added pre-save six-digit hex colour validation for variant colour fields. Invalid values keep the editor open and do not mutate project state.
- Preserved the component master and variant editor disclosure state after saving a master, adding a variant, or saving a variant.
- Expanded the local server MIME map for common image and font assets. HEAD requests now use file metadata and return without reading the complete file into memory.

## Automated verification

Run from the extracted project directory with Node.js 22 or newer:

```bash
npm run check
npm test
```

Results for this release:

- `npm run check`: passed.
- `npm test`: **86 passed, 0 failed**.
- New regression: safe shape-kind component variants survive normalization and appear in exported HTML.
- New UI regression: per-variant fields, save handling, invalid-colour guard and disclosure-state restoration are present.
- New server integration regression: starts a temporary local server, checks GET `/`, HEAD `/styles.css` (including content type and length), rejects POST with 405, and rejects an encoded traversal attempt.
- Server MIME map includes PNG, JPEG, WebP, GIF and WOFF2 (plus SVG, ICO, WOFF, TTF, OTF, webmanifest and XML).

## Package checks

- HTML IDs checked for duplicates.
- All local CSS/JS references checked against files in the release package.
- CSS parsed with `tinycss2`; parser errors checked.
- ZIP integrity checked after packaging.
- Tests rerun from the extracted ZIP.

## Manual checks still recommended

A real interactive browser session could not be completed in this environment: Chromium navigation is blocked with `ERR_BLOCKED_BY_ADMINISTRATOR`. Please manually verify in Chrome or Edge:

1. Open Components and expand a component master.
2. Expand a variant, change a colour or shape type, and save it.
3. Confirm the active variant editor remains open and linked instances update.
4. Enter an invalid colour and confirm saving is blocked with an error message.
5. Clear a variant field and confirm it inherits from the master.
6. Save/reload a project, export the multi-page site, and inspect its component output.
7. Repeat on a narrow/mobile viewport and test keyboard focus states.

## Known boundaries

- Variant values are style overrides, not independent component structures. Content overrides remain per-instance where v1.7 already supports them.
- Shape variants change the shape geometry preset; vector path geometry remains shared with the master unless an instance is detached.
- Font families remain system fallback stacks; no webfont binaries are bundled by this release.

### Extracted release audit details

- Extracted ZIP: `npm run check` passed; **86/86 tests passed** again.
- Editor HTML: **72 unique IDs**, 0 duplicate IDs.
- Local references in `index.html`: 2 checked, 0 missing.
- Stylesheet: 497 top-level rules parsed, 0 parser errors.
- Local server smoke check on an isolated port: GET `/` = 200; GET `/src/app.js` = 200; GET `/styles.css` = 200; HEAD `/styles.css` = 200 with `text/css` and a valid content length; POST `/` = 405; encoded path traversal = 403.
- ZIP: 26 files; archive integrity test passed. Package size: approximately 171 KB.
