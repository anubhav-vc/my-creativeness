# CanvasFlow v1.5.0 — QA and release verification

## Release scope

Vector Authoring: native SVG path layers, freehand and Pen drawing, rectangle/ellipse tools, editable anchors and Bézier control handles, fill/stroke styling, responsive section-relative positioning, and standalone SVG export. Existing v1.4 multi-page sites, shared navigation/footer, page metadata, design tokens, motion settings, responsive layout, history, backup import/export, and local website export are retained.

## Automated checks

- `npm run check` — **PASS**. Node v22.16.0 syntax checks completed for the local server and application modules.
- `npm test` — **PASS: 65 tests, 0 failures**.
- New v1.5 regression coverage includes:
  - Vector-node normalization, bounded anchor count/coordinates, bounded dimensions and stroke width, and safe hex-colour fallback.
  - Inline SVG path rendering and standalone SVG serialization with escaped accessible title text.
  - Bézier incoming/outgoing handle normalization and path-generation geometry.
  - Vector toolbar, editor drawing bridge, anchor inspector and standalone-export action wiring.
  - Generated preview bridge JavaScript compiles successfully through Node's `vm.Script` parser with the Pen tool enabled.

## Vector export smoke test

Generated a temporary website/export ZIP using the same model HTML/CSS generators and dependency-free ZIP writer used by CanvasFlow. The bundle contained:

- `index.html` with a real inline `<svg class="cf-vector">` and the expected cubic Bézier path data.
- `styles.css`.
- `vector-demo.svg` as a standalone SVG document.
- `README.txt`.

`unzip -t` reported **No errors detected in compressed data**. The standalone SVG was parsed with Python's XML parser and confirmed to be well-formed.

## Local server smoke test

Started the v1.5.0 project on port 4174 to avoid a pre-existing process using the default port 4173.

- `GET /` — HTTP 200; served the v1.5 editor document (20,553 bytes).
- `GET /src/app.js` — HTTP 200.
- `GET /styles.css` — HTTP 200.
- Encoded traversal probe — HTTP 404; no external file was served.

## Browser verification limitation

A Chromium binary is available in this environment, but a headless launch did not complete within the execution window and produced no DOM dump. Therefore this release **does not claim a completed interactive browser test**. Use the v1.5 vector-authoring checklist in `README.md` in Chrome or Edge before relying on a public deployment. In particular, manually verify pointer/touch drawing, Pen double-click/Enter/Escape behavior, anchor edits and blank-handle reset, undo/redo, resizing, multi-page SVG export, and narrow-screen toolbar/inspector access.

## Compatibility and known limits

- Editable project schema remains v7. Existing v1–v7 project backups continue to normalize; vector fields are additive and optional for older projects.
- Paths are normalized to a 1000 × 600 viewBox, have a maximum of 80 anchors, and use 24–600 px dimensions. The inspector displays the first 24 anchors at a time.
- Bézier control handles can be edited numerically in the Properties inspector. Direct on-canvas draggable control handles are not part of this release.
- Vectors are section-relative overlay layers; this release does not turn arbitrary text, cards, images, or buttons into free-positioned objects.
- The editor remains local-first. It has no accounts, cloud sync, collaboration, backend, or hosted publishing service.
- Automated checks, generated-output smoke tests, and server checks do not replace hands-on browser, accessibility, or real-device testing.
