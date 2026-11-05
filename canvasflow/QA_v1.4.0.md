# CanvasFlow v1.4.0 — QA and release verification

## Release scope

Multi-page sites: page management, per-page metadata, shared site navigation/footer, internal page links, and multi-document static-site ZIP export. Existing v1.3 design-system features, motion controls, responsive styling, editing tools, history and schema-v7 project backups are retained.

## Automated checks

- `npm run check` — **PASS**. Node syntax checks completed for the static server and all application modules.
- `npm test` — **PASS: 60 tests, 0 failures**.
- New v1.4 regression coverage includes:
  - Legacy one-page project migration into the normalized `pages[]` model.
  - Unique page IDs/slugs and cross-page section/node IDs.
  - Per-page HTML, title/description metadata and page-specific CSS background selectors.
  - Shared header/footer and correct active-page navigation state.
  - Button links to another internal page and safe fallback for deleted/missing page targets.
  - Preview bridge navigation events.
  - Image collection from all pages, not only the active page.
  - Presence/wiring of page manager and shared site-chrome controls.
  - Reserved `index` filename and maximum 20-page import guard.
  - Duplicated pages remap self-links to the duplicated page; internal links can be cleared back to the default section anchor.

## Export bundle smoke test

Created a temporary two-page website bundle using the same model HTML/CSS generators, the shared asset collector and the dependency-free ZIP writer used by the editor export. The generated archive contained:

- `index.html`
- `about.html`
- `styles.css`
- `assets/image-image-9ebddf79d85f.png`
- `README.md`

`unzip -t` reported **No errors detected in compressed data**. The home document contained the relative link to `about.html`, and the secondary document included its own title and description metadata.

## Local server smoke test

- `GET /` — HTTP 200.
- `GET /src/app.js` — HTTP 200.
- `GET /src/model.js` — HTTP 200.
- `GET /styles.css` — HTTP 200.
- Encoded traversal probe was rejected with HTTP 403. A normalized dot-segment probe returned HTTP 404 rather than a file outside the app. The server resolves and checks every decoded filesystem path against the application root before reading it.

## Browser verification limitation

A Chromium binary is present, but headless startup did not complete in this execution environment within the 12-second command window. It emitted missing DBus/system-bus errors and produced no DOM dump. Therefore this release **does not claim a completed interactive browser test**. Before public use, follow the v1.4 multi-page browser checklist in `README.md` in Chrome or Edge, especially save/reopen, preview page switching, page duplication/deletion, touch layout, and opening exported pages directly.

## Compatibility and known limits

- Editable project schema remains v7. Existing v1–v7 one-page backups normalize to one page and continue to open.
- The current project limit is 20 pages.
- The editor is still local-first and has no accounts, cloud sync, collaboration, or hosted publishing service.
- Navigation and footer are shared project settings; they are not fully synchronized editable component instances.
- A button can link to an internal page or an external URL/section anchor. Arbitrary page-to-page link behavior is not generated as user JavaScript.
- Full browser testing, screen-reader review, and testing with real exported websites on multiple static hosts remain manual release checks.
