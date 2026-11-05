# CanvasFlow v1.6.0 — Release QA report

**Release:** Asset & Typography Studio  
**Project schema:** v8  
**Runtime:** Node.js 22 or newer (dependency-free)  
**QA status:** Automated, static, local-server, and export-package checks passed. Full hands-on browser QA remains outstanding.

## Automated checks

- `npm run check` — passed. Syntax checks cover `server.mjs`, `src/model.js`, `src/history.js`, `src/zip.js`, and `src/app.js`.
- `npm test` — **71 tests passed, 0 failed**.
- The suite covers legacy schema imports (v1–v7), the v8 project model, design-system and typography tokens, responsive style export, SVG/vector editing, asset validation, asset deduplication across pages, focal-position export, and editor control wiring.
- The v1.6 UI wiring regression test also verifies the v8 local-storage key and v7 legacy-key migration path.

## Static source checks

- `index.html` parsed successfully; 68 element IDs found and no duplicate IDs.
- All local script and stylesheet references in the HTML resolve to files in the release folder.
- `styles.css` parsed with `tinycss2`: 461 top-level rules and no parser errors.

## Asset and website-export smoke test

A fresh two-page fixture was normalized and exported with the same sanitized SVG asset referenced on both pages.

- Generated documents: `index.html` and `about.html`.
- Shared stylesheet: `styles.css`.
- Shared asset: one content-hash-named SVG under `assets/` (deduplicated rather than copied twice).
- Both HTML documents reference the same exported SVG asset.
- Generated ZIP passed `ZipFile.testzip()` with no corrupt entries.

## Local-server checks

Started the included local server and checked these routes:

| Request | Result |
|---|---:|
| `/` | HTTP 200 |
| `/src/app.js` | HTTP 200 |
| `/src/model.js` | HTTP 200 |
| `/src/history.js` | HTTP 200 |
| `/src/zip.js` | HTTP 200 |
| `/styles.css` | HTTP 200 |
| Encoded path-traversal probe | HTTP 404 |

## Browser QA limitation

A headless Chromium launch was attempted in this environment, but it stalled during startup and did not yield a usable DOM or interaction run. Therefore this release does **not** claim a completed real-browser test. Manually verify the checklist below in current Chrome or Edge, including on a touch device where possible.

## Manual release checklist

1. Open Asset Library; upload PNG/JPEG/WebP/GIF and a basic SVG; confirm thumbnails, names, format/search, usage counts, insert and replace work.
2. Try a corrupt raster file, an SVG containing script/event attributes, an unsupported SVG feature, a file over the per-file limit, and a library over the aggregate limit; confirm each is rejected with a clear message.
3. Save a project with a shared asset, refresh, reopen it, and confirm image references resolve. Delete an unused asset and confirm referenced assets cannot be removed.
4. Change typography pairing and scale; inspect live preview and confirm linked H1/H2/H3/body/button roles update while manually customised node styles remain independent.
5. Change desktop, tablet and mobile crop focal positions; switch breakpoints and confirm each value remains correct after save/reload and in exported CSS.
6. Export a multi-page site that reuses an asset; extract it and confirm every page loads its images and shared stylesheet.
7. Import a v1.5.0 (schema v7) backup and confirm it migrates to schema v8 without losing page content. Keep the v1.5 backup if you need to reopen it in an older app build; older builds should not open v8 projects.
8. On Android or another touch device, check modal sizing, upload selection, scrolling, breakpoint controls, and general touch usability.

## Known limits

- The asset library is capped at 100 entries, 1 MB per raster, 350 KB per SVG, and 1.5 MB total encoded asset payload to reduce local browser-storage pressure.
- SVG import supports a restricted geometry-focused subset. Unsupported SVG features are rejected rather than kept as active/embedded content.
- Typography pairings use system font stacks; font files are not bundled or downloaded.
- Full interactive Chrome/Edge and mobile touch testing remains a manual task.

## Release recommendation

The automated, source, local-server, and generated-export checks passed. Before using the editor for important work or deploying it publicly, complete the manual browser checklist and retain a separate v1.5.0 backup.
