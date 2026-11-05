# CanvasFlow v1.6.1 — Stability and debugging report

## Release summary

This is a maintenance/debugging release built on the v1.6.0 Asset & Typography Studio codebase. It does not add a new product milestone or change the editable project schema (still v8). The work focuses on safer project recovery, accurate save reporting, upload preflight, and more collision-resistant asset export names.

## Defects fixed

1. **Damaged newest local save could prevent recovery.** Startup and “reopen saved project” now try the current schema and each supported legacy key in order. Malformed JSON or an invalid project is skipped, and the first valid backup is restored. Skipped keys are logged for diagnosis.
2. **Optional compatibility-copy failure could misreport a successful save.** The current v8 save is written first. A quota or write failure when updating the optional schema-5 compatibility copy no longer changes the outcome of the committed v8 save; the UI exposes a warning instead.
3. **Oversized multi-file upload batches were read before the total limits were checked.** The UI now checks the 100-item count and 1.5 MB aggregate input limit before reading the files into memory. It still validates each file's actual contents after reading.
4. **Asset export used a short 32-bit fingerprint.** Export filenames now use two independent 32-bit rolling hashes (64 bits total) to make accidental collisions much less likely without adding dependencies or asynchronous hashing.
5. **Browser tab title still advertised v1.5.** The title, package version and documentation now consistently identify v1.6.1.

## Automated checks

- `npm run check` — passed. Checks `server.mjs`, `src/model.js`, `src/history.js`, `src/zip.js`, `src/project-storage.js`, and `src/app.js`.
- `npm test` — **75 passed, 0 failed**.
- Four new regression tests cover damaged-save fallback, primary-vs-compatibility save outcomes, fingerprint separation, and upload preflight limits.
- Existing tests cover project schema migration (v1–v8), editor wiring, undo/redo, responsive styling, vectors and Bézier geometry, safe SVG/raster ingestion, asset-library limits, multi-page routing, export contents, and design-system tokens.

## Structural checks

- HTML parser: 68 IDs; no duplicate IDs.
- Local HTML CSS/JS references: all resolved.
- Browser tab title: v1.6.1.
- CSS parse via `tinycss2`: 461 top-level rules; 0 parser errors.

## Local-server checks

Run with a temporary local port:

- `GET /` — HTTP 200.
- `GET /src/app.js` — HTTP 200.
- `GET /src/model.js` — HTTP 200.
- `GET /styles.css` — HTTP 200.
- `HEAD /` — HTTP 200.
- `POST /` — HTTP 405 with `Allow: GET, HEAD`.
- Encoded traversal attempt using an encoded slash — HTTP 403. A dot-segment-normalized attempt returned 404 and did not expose a file.

The development server binds to `127.0.0.1` by default. It is a local preview server, not a public production host.

## Export smoke test

Generated an actual multi-page export fixture from the current model, containing `index.html`, `about.html`, shared CSS, a single shared SVG asset referenced by both pages, and an export README. The ZIP integrity check passed; both HTML files reference the same one-copy asset; the SVG parsed as well-formed XML.

## Package verification

The release ZIP is checked for archive integrity and then extracted into a clean directory. `npm run check` and `npm test` are rerun from that extracted directory. The package includes the app, local server, stylesheet, modules, tests, README, roadmap, changelog, and QA history.

## Manual checks still required

A real interactive browser session could not be run in this container. Chromium headless stalled even on a minimal `data:` URL page and timed out, so no real-browser pass is claimed. Before public sharing, open the extracted package in current Chrome or Edge and test:

- Initial startup, project save, reload, reopen and download backup.
- Recovery with a damaged current save and a valid older save (use a disposable browser profile/test copy).
- Create/edit/move/resize/delete elements; undo and redo; keyboard shortcuts.
- Page manager, internal links, global navigation and footer, multi-page export.
- Vector tools, anchor editing and standalone SVG download.
- Asset uploads, search, insert/replace, protected deletion and export.
- Typography tokens and tablet/mobile font-size overrides.
- Desktop/tablet/mobile preview, touch drawing/resize, dialogs and keyboard focus.
- Open the exported website and test every internal link and asset in a browser.

## Known limitations

- This release is a local-first prototype: no accounts, cloud sync, collaboration, authentication, or hosted publishing.
- Font stacks use system fallbacks; fonts are not bundled.
- SVG uploads intentionally support a restricted safe subset; complex SVGs may need simplification or raster conversion.
- Browser-local storage limits vary by browser/device. Download project backups regularly.
- Full interactive browser and Android touch QA remains outstanding as noted above.
