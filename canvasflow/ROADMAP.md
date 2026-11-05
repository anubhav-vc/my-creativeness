# CanvasFlow roadmap — v2.1.0 Workspace & Design System

## Product direction

CanvasFlow is a local-first visual website builder that exports readable HTML/CSS and local assets. The structured project model remains the source of truth for editor, preview, and export. Normal content uses responsive document flow, configurable Flexbox, and fixed or auto-fit Grid with independent tablet/mobile overrides. A separate, explicit parent-relative Free-position mode supports precise composition without making absolute positioning the default for website content.

## v2.1 — Workspace & Design System (implemented; manual validation pending)

- Reframed the editor as Structure → Add → Canvas → Properties while preserving current model and action boundaries.
- Consolidated semantic editor UI variables into one canonical root; the token layer is separate from site design tokens and export CSS. New workspace/panel recipes are isolated in `styles/editor-experience.css`.
- Added searchable Add dialog for existing content, layout, media, graphic and vector insertion actions; search can match both tool names and category labels.
- Added medium-width side drawers and narrow/touch bottom sheets with a single-canvas mobile navigation pattern; bottom navigation is reserved for narrow layouts.
- Added collapsible contextual inspector groups with editor-local disclosure state, plus empty-canvas and explicit preview status states.
- Improved focus return when dismissing responsive panels and kept schema v12/storage identity unchanged.
- Automated suite: 104/104 passed. Real-browser, Android touch, screen-reader and moderated usability validation remain outstanding; see `QA_v2.1.0.md` and `EDITOR_EXPERIENCE_SPEC_v2.1.md`.

## Shipped milestones

### v2.0.2 — Editor Workspace Experience Redesign

- Rebuilt the Insert palette into clear Content, Media & layout, Graphics, and Vector groups without removing direct access to tools.
- Created a focused canvas control hierarchy: viewport width, zoom/Fit, and a secondary Canvas Tools menu.
- Added recursive searchable Layers navigation, including nested container descendants and ancestor context. Escape clears the query.
- Refined panel hierarchy, interactive states, spacing, contrast, inspector property cards, page management and small-screen workspace layout.
- Project schema remains v12; editor-only styling is not part of generated website CSS.

### v2.0.1 — Product Interface & Feature Discovery Refresh

- Refined the CanvasFlow application interface with a clearer dark-surface hierarchy, cohesive violet/mint accents, stronger panel descriptions, and more consistent control styling.
- Grouped tools into Design tools and Project menus while keeping Save and Export prominent.
- Added an on-demand feature guide with a Structure → Design → Refine → Export workflow and direct links to the existing tools.
- Kept product-interface styling separate from the generated website styles; project schema remains v12.

### v2.0.0 — Precision Canvas & Transform Studio

- Canvas camera with 25–200% zoom, direct entry, pointer-centred wheel zoom, Fit (Ctrl/Cmd+Shift+F), Hand tool, Space+drag panning, two-finger touch pan/pinch, selection centring, and stage-aware refitting. Camera zoom is independent of the website viewport width.
- Schema v12 Free-position mode for eligible nodes and nested containers, with parent-relative coordinates, dimensions, rotation, transform origin, and Tablet/Mobile overrides. Flow remains the default and legacy section overlay layers remain compatible.
- Eight resize handles, rotation handle, exact numeric transform controls, keyboard nudging, and pointer cancellation that restores original inline styles.
- Live-parent-measured geometric alignment/distribution and Match width/height/size for multi-selected Free-position elements, plus group-aware drag snapping and zoom-consistent screen-space tolerance.
- Page rulers, draggable user guides and guide management; adjustable grid, parent, sibling, guide and equal-spacing snap settings; Alt bypass.
- Responsive Free-position CSS is emitted into website exports; editor-only guides, rulers, handles and snap overlays stay out of exports.
- Schema v1–v11 migration to v12. Schema-5 compatibility autosaves are skipped if precision-only settings would be lost.

### v1.9.0 — Advanced Layout Studio

- Recursive layout-container nodes with safe depth/child limits and nested Layers navigation.
- Independent Stack, Flexbox, and Grid controls inside containers, including distribution, alignment, fixed/auto-fit columns, and precise gap/padding/size/surface controls.
- Tablet and Mobile overrides for nested container layout and spacing, exported as ordinary CSS media queries.
- Five built-in layout presets plus up to 12 user-saved project presets.
- Recursive node lookup, duplication, ID regeneration, content export, asset collection and component/interaction processing.
- Schema v11 migration from schema v1–v10 with bounded imported values.

### v1.8.0 — Responsive Layout Engine

- Section layout modes: Stack, Flexbox, fixed Grid, auto-fit Grid, plus retained legacy two-column layout.
- Flexbox direction, wrap, main-axis distribution, and cross-axis alignment controls.
- Grid fixed column count (1–6) or auto-fit minimum card width (120–480 px).
- Desktop base styles plus independent Tablet and Mobile overrides, with Mobile inheriting Tablet when not explicitly overridden.
- Schema v10 migration from schema v1–v9; new layout fields are normalized and bounded.
- Existing component/interaction features, design tokens, assets, vector editing, multi-page sites, and local-first storage retained.

### v1.7.1 refinement shipped

- Direct editing of saved component variant overrides, with blank values inheriting from the shared master.
- Fixed safe shape-kind variant persistence and export.
- Improved component-studio state retention after save actions and colour-input validation.


## v1.2.1 implemented before v1.3

- New project chooser: Blank page or existing starter website.
- A blank page begins with no sections or elements; page settings are available from the Home page card.
- Page background colour, page name, and browser title are saved in the existing project model and included in website export.
- First inserted content automatically gets a clean section, so the blank canvas remains simple but can immediately become a normal editable website.
- Existing v1–v7 backups remain compatible; absent page background values normalize to white.

## v1.2.0 implemented

- **Motion timing:** per-element duration (100–5000 ms) and delay (0–3000 ms), validated easing presets, and normal/reverse direction.
- **Triggers:** on page load, when scrolled into view, or on hover/focus. Viewport animations play once after entering the viewport.
- **Preview replay:** the Motion inspector can request a replay of the currently selected element through the sandboxed preview bridge.
- **Export parity:** generated CSS includes per-element custom timing properties. Exports add a small fixed IntersectionObserver script only when viewport-triggered motion is used; this is generated behavior, not arbitrary user code.
- **Accessibility and fallback:** `prefers-reduced-motion` prevents viewport content from being hidden and reduces animation intensity. Browsers without IntersectionObserver reveal content and allow the animation to run immediately.
- **Compatibility:** project schema remains v7; schema v1–v7 backups still import and old missing motion options normalize to safe defaults.

## Verification status (v1.2.1)

- `npm run check` passes (Node syntax checks for the server and application modules).
- `npm test`: 46 tests passed, 0 failed. The suite includes blank-project creation (zero sections), page background normalization and export, first-section creation, and new-project/page-settings UI wiring, alongside the existing motion, responsive layout, import compatibility, history, layer, and ZIP-export tests.
- Blank-page export assertions confirm a full-viewport minimum height and the chosen background on both `body` and `.cf-page`; the generated HTML contains no content sections until the user adds content.
- Local static server smoke check: `GET /` returned HTTP 200.
- Environment limitation: an attempted headless Chromium navigation to the local server was blocked with `ERR_BLOCKED_BY_ADMINISTRATOR`; therefore no full real-browser interaction test is claimed. Manually verify new-project selection, page background controls, save/refresh/reopen, first-element insertion, and blank-page export in Chrome or Edge. Also repeat motion preview/scroll/reduced-motion checks from v1.2.0.

## v1.3 — Design Systems (implemented)

- Project-level colour, typography, radius, spacing, and width tokens, stored in the editable model and emitted as CSS custom properties.
- Six starter palettes and a custom Design system editor with explicit Save/Cancel behavior.
- Existing styles that match the shared default roles use CSS tokens; deliberate custom values remain standalone. Newly inserted elements and component presets inherit the active tokens.
- Insertable Navigation, Hero, Feature grid, CTA, and Footer section components. Navigation and footer output use semantic `nav` and `footer` tags.
- Strict token normalization and legacy schema v1–v7 compatibility; no schema bump required.

## Verification status (v1.3.0)

- `npm run check` passes.
- `npm test`: 52 tests passed, 0 failed, including six new v1.3 regression tests.
- CSS token bounds, one-time legacy token migration, explicit token detachment, theme inheritance, semantic navigation/footer output, component validation, and editor wiring are covered by automated tests.
- Full interactive browser testing is still required in Chrome or Edge; automated tests validate the model/export and source wiring but are not a substitute for touch, modal, responsive, or live-iframe checks.

## v1.4 — Multi-page sites (implemented)

- Page manager with add, switch, duplicate, delete, at-least-one-page protection, and a 20-page project limit.
- Per-page name, unique URL slug, browser title, SEO description, background, sections, and responsive styles.
- Project-wide optional shared navigation header and footer with configurable brand/footer text and links to every page.
- Internal page links from buttons. In the editor preview, these switch the active editor page; in exports, they become ordinary relative links.
- Multi-page website ZIP containing `index.html`, one HTML document per secondary page, shared stylesheet, images collected from every page, and a README.
- Legacy v1–v7 one-page backups migrate into one-page sites; the project schema remains v7.
- Import normalization de-duplicates page slugs and IDs, ensures globally unique section/node IDs for the shared stylesheet, reserves `index` for the home page, and rejects imports over 20 pages.

## Verification status (v1.4.0)

- `npm run check` passes (server, model, history, ZIP, and application JavaScript syntax checks).
- `npm test`: 60 tests passed, 0 failed. New regression cases cover legacy migration, multiple-page ID/slug normalization, HTML and CSS per-page output, shared header/footer, internal link resolution, preview navigation, all-page image collection, editor wiring, the reserved `index` filename, and the 20-page import limit.
- Local-server smoke checks are recorded in `QA_v1.4.0.md`.
- Automated model/export tests do not replace a complete hands-on browser test of pointer/touch editing, modals, storage persistence, and live preview navigation. Follow the v1.4 browser checklist in `README.md` before relying on a public deployment.

## v1.5 — Vector authoring (implemented)

- Added a separate SVG vector layer type with bounded 1000 × 600 path geometry; vectors coexist with regular responsive website content and remain independent overlay layers.
- Added toolbar modes for Select, Freehand, Pen, Rectangle, and Ellipse. Freehand and geometric tools use pointer drag; Pen adds anchors by click and finishes with double-click or Enter (Escape cancels).
- Added Catmull–Rom-derived smooth curves for freehand/Pen paths plus explicit incoming/outgoing Bézier control handles per anchor. Blank control handles retain automatic smoothing.
- Added vector properties for path kind, dimensions, fill, stroke, stroke width, section-relative position, z-order, path closure, and anchor coordinates. Add/remove/reset operations are bounded; up to 80 anchors are stored and 24 displayed in the inspector at once.
- Added standalone SVG download and inline SVG output in every exported page. Project backups preserve vector path and Bézier-handle data; schema stays v7 and older v1–v7 projects remain compatible.
- Added regression coverage for safe path normalization, hostile colours, bounded coordinates/anchors, SVG serialization, Bézier handle geometry, tool wiring, and generated preview-script syntax.

## v1.6 — Asset and typography studio (implemented)

- Reusable project-level asset library with multi-file upload, filename/format search, insert/replace, use counts, protected deletion, and data-backed project backups.
- Supports PNG, JPG/JPEG, WebP, GIF, and a restricted SVG subset. Raster signatures are checked and SVGs are sanitized through a basic geometry allowlist. Limits: 1 MB per raster, 350 KB per SVG, 100 assets and 1.5 MB total payload.
- Asset-backed image nodes store an asset ID rather than repeated image data. Multi-page website export includes only used assets and deduplicates identical library assets by content hash.
- Typography: Modern, Editorial, Friendly, Technical, and Classic pairings; Compact, Balanced, and Expressive scales; custom base size and ratio; linked H1/H2/H3/body/button sizes; and a live preview. Font stacks are local system fallbacks, not webfont embeds.
- Crop studio adds preset and exact focal-position controls. Desktop, tablet and mobile focal values are normalized and emitted to responsive CSS.
- Bumped project and local-storage schema to v8. Imports continue to accept v1–v7; old app versions reject v8 to avoid silently losing asset registry references.
- Added regression coverage for typography values, SVG safety, raster signatures, storage caps, reuse/deduplication across pages, custom responsive cropping and UI wiring.

## Verification status (v1.6.0)

- `npm run check` passes for server, model, history, ZIP writer and app syntax.
- `npm test`: 71 tests passed, 0 failed. Six v1.6 regression cases cover typography pairing and scale, safe SVG/raster import, library limits, multi-page asset reuse/deduplication, custom responsive focal-point export, and new editor controls.
- Website export fixture confirms a reused SVG is written once and referenced from multiple page HTML files.
- Local server, ZIP-integrity and full manual-browser results are recorded in `QA_v1.6.0.md`. Full pointer, dialog, responsive preview and mobile touch testing remains a manual browser checklist.


## Next planned milestone

### v2.1 — Motion & Interaction Timeline (proposed)

- Build a richer timeline/keyframe editor on top of the existing safe motion presets, without introducing arbitrary user JavaScript.
- Add sequence timing, per-property keyframes, easing curves, preview scrubbing, and responsive/reduced-motion validation.
- Keep the exported runtime lightweight, declarative, accessible, and independent of CanvasFlow.

## Explicitly later

True 3D authoring, collaboration, accounts/cloud, hosted publishing, marketplace, AI generation, arbitrary user-code execution, and full round-tripping of arbitrary hand-written HTML/CSS are later projects, not v1.1 features.

## Before commercial use

Choose a license, confirm branding/trademark availability, write privacy/data-handling language, review font/image licensing, strengthen import/export security and accessibility testing, define backup/recovery behavior, and decide whether a backend is actually needed. CanvasFlow remains a personal-development prototype, not a commercial-grade hosted platform.

## Verification status (v1.5.0)

- `npm run check` passes for the local server and all application modules.
- `npm test`: 65 tests passed, 0 failed. The v1.5 cases cover vector normalization bounds, safe colours, SVG output, editable Bézier handles, drawing-tool/inspector wiring, and generated preview-bridge script syntax.
- Website-export smoke tests verify that vector markup remains inline SVG and the standalone SVG file is well-formed XML.
- Local-server smoke checks and the remaining manual-browser limitation are recorded in `QA_v1.5.0.md`.
- A full hands-on browser test of pointer/touch drawing, the Pen finish/cancel gesture, undo/redo, handle editing, and mobile layout is still recommended before public deployment.


## Verification status (v1.6.1 stability release)

- `npm run check` passes, including the new project-storage module.
- `npm test`: 75 tests passed, 0 failed. Four new tests cover fallback from a corrupt current save, optional compatibility-copy failure, longer asset fingerprints, and upload preflight limits.
- HTML validation: 68 unique IDs, no duplicate IDs, and all local script/style references resolve. The browser tab title was corrected from the stale v1.5 label.
- CSS parsed with `tinycss2`: 461 top-level rules and zero parser errors.
- Local-server requests for the editor and every JavaScript module returned HTTP 200; traversal returned HTTP 403 and unsupported POST returned HTTP 405.
- Chromium was attempted but the headless process stalled even on a simple data URL in this runtime; no real interactive browser result is claimed. Run the manual v1.6.1 stability and v1.6 browser checklists in Chrome/Edge, including Android touch testing.


## v1.7 — Component & Interaction Studio (implemented)

- Added schema v9 component definitions with a validated allowlist of element types, bounded master/variant counts, safe instance overrides, and migration from v1–v8.
- Supported content elements can be converted into a linked component master; linked instances can be inserted across pages, edited through shared master controls, assigned visual variants, and detached individually.
- Component master controls cover shared content and available styles for text, buttons, cards, images, shapes, dividers and vectors. Image masters can select an item from the shared asset library.
- Component variants merge validated style overrides onto the master. Explicit variant style values detach corresponding design-token roles so a token-linked default cannot mask the variant.
- Button click interactions support only `none`, `scroll`, `show`, `hide` and `toggle`. The export runtime uses section anchors, updates `aria-hidden`, supports initially hidden sections, and respects reduced motion. Arbitrary JavaScript is not accepted.
- Button states include hover background/text, keyboard focus outline and pressed scale. All colours, actions, IDs and scale values are normalized before export.
- Preview selection bridge allows interaction clicks to reach the declarative interaction runtime without selecting the element; normal clicks continue to use the editor bridge.
- Website export resolves linked instances to their actual semantic element markup and per-instance CSS, including responsive styling and image assets. Overlay-positioned shape/vector components remain in the dedicated overlay layer. Linked instances share master geometry; detach an instance to edit its own position or size.

## Verification status (v1.7.0)

- `npm run check` passes for server, model, history, ZIP writer, project-storage and app modules.
- `npm test`: 83 tests passed, 0 failed. New regression cases cover multi-page shared component propagation, instance overrides, semantic HTML/CSS export, token-safe variants, safe interactions, dynamic visibility, image master asset reuse, UI wiring, linked vector/shape pointer behavior, and overlay-layer classification for vector/shape components.
- HTML audit: 72 unique IDs, no duplicates, and all local CSS/JS references resolve. `tinycss2` reports zero top-level stylesheet parse errors.
- Local server: editor and all local modules return HTTP 200; unsupported POST returns HTTP 405; encoded traversal probe returns HTTP 404.
- Export smoke test: two HTML pages, shared master variants, declarative action runtime, combined per-page CSS, and ZIP integrity pass; generated runtime scripts pass `node --check`.
- Manual browser checks remain required for Component Studio dialog behaviour, master saves/variant creation, prompt-based component creation, preview interaction click flow, and mouse/touch interaction in Chrome/Edge/Android. No browser pass is claimed until that has been completed.
