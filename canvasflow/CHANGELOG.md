# Changelog

## v2.1.0 — Workspace & Design System

- Reframed the editor around the task hierarchy **Structure → Add → Canvas → Properties**, while retaining the existing project/design menus, Guide, Save/Export actions and stable action IDs.
- Consolidated editor UI variables into one canonical semantic `:root` token source: warm graphite surfaces, neutral text, focused indigo, semantic success/warning/error/info states, focus and canvas-guide roles. The new presentation layer lives in `styles/editor-experience.css`; legacy aliases/rules remain where needed to avoid a risky all-at-once CSS rewrite.
- Moved the existing Insert tool groups into a searchable Add dialog. All existing `data-insert` and `data-vector-tool` actions are retained; search matches both item text and category labels and shows a no-results state.
- Added desktop/tablet panel triggers, medium-width side drawers, and narrow/touch bottom-sheet patterns with a Structure/Add/Properties bottom navigation. The bottom navigation appears only on narrow layouts; duplicate Add triggers are hidden there. Opening one panel closes the other.
- Made inspector property groups collapsible using native details/summary; disclosure state is editor-local and does not dirty the project.
- Added an empty-canvas call to action and explicit preview Updating/Live/Error status communication.
- Improved drawer dismissal so Escape, backdrop and close actions restore focus to the appropriate Structure/Properties trigger.
- Kept project schema and storage identity at v12, preserved the sandboxed preview and model-first pipeline, and verified editor UI tokens do not enter generated website CSS.
- Added `EDITOR_EXPERIENCE_SPEC_v2.1.md` with architecture, semantic tokens, calculated contrast samples, interaction flows, release plan and full manual QA checklist.
- Automated verification: `npm run check` passes; `npm test` passes 104/104. Browser/device interaction testing is not marked complete because local headless Chromium could not be run successfully in this environment.


## v2.0.2 — Editor Workspace Experience Redesign

- Reorganised the Insert palette into labeled Content, Media & layout, Graphics, and Vector tool families while preserving every existing insert/draw action.
- Grouped viewport width, zoom and Fit into clear control clusters; moved less-frequent Hand, Centre, Guides, Grid and Rulers into an accessible Canvas Tools menu.
- Added a searchable Layer Explorer that filters recursively through nested containers while keeping matching ancestors visible; Escape clears the search.
- Refined the three-column editor workspace, page manager, layer tree, inspector property groups, canvas stage, controls, and responsive tablet/mobile layouts.
- Kept project schema v12 and all website export styling unchanged. This is an editor-interface release, not a change to user-generated website themes.
- Added UI regression coverage; full suite passes 102/102.

## v2.0.1 — Product Interface & Feature Discovery Refresh

- Refined the CanvasFlow editor shell with a clearer dark-surface hierarchy, calmer contrast, consistent controls, stronger panel labels, and an updated violet/mint product accent system.
- Grouped design-system, asset, and component tools into a discoverable **Design tools** menu. Grouped new/open/backup/import commands into a **Project** menu while keeping Save and Export visible as the primary project actions. Existing command IDs and handlers are retained.
- Added an on-demand **CanvasFlow Guide** that explains the Structure → Design → Refine → Export workflow, communicates the local-first ownership model, and links directly to the existing editor tools. It does not interrupt returning users with an automatic modal.
- Improved menu dismissal, responsive guide layouts, and reduced-motion behaviour. Product-interface CSS remains separate from CSS generated for user websites.
- Automated UI-structure, deep-link, responsive-style, and version checks added.

## v2.0.0 — Precision Canvas & Transform Studio

- Added the canvas camera: stepped 25–200% zoom, direct percentage entry, pointer-centred Ctrl/Cmd+wheel zoom, Fit (including Ctrl/Cmd+Shift+F), Hand tool, Space+drag panning, two-finger touch pan/pinch, stage-resize-aware fitting, and Centre selection. Editor zoom is separate from the live website viewport width.
- Added schema v12 Free-position settings for eligible content nodes and nested containers. Flow remains the default. Free-position geometry stores parent-relative X/Y, units, width, height, rotation, transform origin, and Tablet/Mobile overrides; existing v1.9 overlay layers remain on their dedicated legacy system.
- Added eight resize handles and a rotation handle for selected Free-position elements, exact transform fields, keyboard nudging, snap-aware drag movement, and transactional commit/cancel restoration.
- Added real parent-space geometry for alignment and distribution. Multi-selection alignment/distribution, Match width/height/size, and selection centring use computed element dimensions and the actual active-breakpoint parent layout, then save back into the project.
- Added page-level rulers, draggable vertical/horizontal guides, guide management (position, lock, visibility and delete), configurable grid/parent/sibling/guide/equal-spacing snapping with zoom-consistent screen-space tolerance, Alt snap bypass, and group-aware snap exclusion.
- Corrected coordinate handling for nested containers with padding/borders and for repeated transforms; corrected top-ruler X / left-ruler Y mapping. Free-position button hover styling no longer overrides its rotation.
- Free-position HTML exports as real parent-relative absolute CSS with responsive media-query overrides. Editor-only rulers, guides, handles, snap indicators and canvas grid are excluded from website exports.
- Bumped project and local-storage schema to v12. Imports support schema v1–v11. Old schema-5 compatibility saves are suppressed when precision-only settings or Free-position geometry would be lost.
- Added geometry, schema migration, responsive CSS, preview-bridge, parent-local transform, guide, snap, arrangement, and editor-wiring regression coverage.

## v1.9.0 — Advanced Layout Studio

- Added a recursive `container` node type. Containers can hold existing website elements and other containers, with import depth and per-container child limits to prevent unbounded trees.
- Added independent Stack, Flexbox, and Grid layout settings for containers. Flexbox supports direction, wrapping, main-axis distribution, and cross-axis alignment; Grid supports fixed 1–6 columns and auto-fit minimum widths.
- Added fine-grained layout spacing: general, row and column gaps; all-side, horizontal and vertical padding; max width; minimum height; surface/border colours; and corner radius.
- Added a nested Layers tree, parent-aware selection and insertion, nested duplication with regenerated descendant IDs, and recursive export/asset/component/interaction traversal.
- Added per-container Tablet/Mobile overrides. Fixed responsive CSS serialization so container-specific declarations (including layout, gap, padding, width and minimum height) are emitted into the correct breakpoint rule.
- Added five built-in layout presets and project-level custom presets (up to 12), with safe schema normalization and apply/save/delete controls.
- Bumped project and local-storage schema to v11. Imports support schema v1–v10 and migrate to v11. Older-format compatibility saves are skipped where nested containers or custom presets would be lost.
- Added recursive normalization, unique-ID, nested HTML/CSS export, breakpoint, preset and safe-import regression tests.

## v1.8.0 — Responsive Layout Engine

- Added a section-level Flexbox layout mode with direction, wrapping, main-axis distribution, and cross-axis alignment controls.
- Expanded Grid into a configurable layout: fixed 1–6 column templates or auto-fit columns with a bounded minimum card width.
- Flexbox and Grid settings can be overridden independently at Tablet and Mobile breakpoints; unset values inherit through the responsive cascade.
- Preserved Stack and legacy two-column layouts. Existing schema v1–v9 projects migrate into schema v10 with safe layout defaults; all v1.7 component and interaction data is retained.
- Increased the section gap range to 4–96 px and added bounded validation for every new layout property.
- Added automated tests for schema v9 migration, responsive Flexbox/Grid CSS, fixed and auto-fit Grid, hostile/invalid values, and the editor/storage wiring.

## v1.7.1 — Component Studio refinement

- Fixed shape component variants so the selected geometric shape (`circle`, `pill`, `triangle`, `diamond`, `hexagon`, `star`, or `ring`) survives project normalization and renders correctly in exports.
- Added direct per-variant style editing for button, card, text, image, shape, divider, and vector component variants. Empty fields inherit from the shared master; populated fields are validated and stored as explicit overrides.
- Added six-digit hex validation for colour overrides before saving a variant, preventing invalid entries from being silently discarded.
- Kept the component master and active variant editors expanded after save/add actions so the editing workflow does not unexpectedly collapse.
- Expanded the local server MIME map for image/font assets and made HEAD requests use file metadata without reading the full file.
- Added regression coverage for shape variant normalization/export, variant editor wiring, and live local-server GET/HEAD/POST/traversal behavior. Project schema v10 is introduced in v1.8; schema v1–v9 backups remain importable.

## v1.7.0 — Component & Interaction Studio

- Added schema v9 with up to 50 reusable component definitions and up to 8 validated visual variants per master. Schema v1–v8 imports migrate into v9.
- Added linked component instances for headings, paragraphs, buttons, images, cards, dividers, shapes and vectors. Shared master edits propagate across pages; supported content properties can be overridden per instance.
- Added Component Studio in the top bar, master editing, variant creation, use counts, protected deletion, detach-to-independent-element, and selection-to-component conversion.
- Added expanded master controls for text, typography, button visual states and actions, card styling, image library replacement/crop settings, shape geometry, divider sizing, and vector fill/stroke/dimensions.
- Added safe button interactions: scroll to a section, show, hide, and toggle. Exported interaction runtime updates `aria-hidden`, handles initially hidden sections, and respects reduced-motion preferences. No arbitrary code execution is supported.
- Added separate hover, keyboard-focus, and pressed states for buttons. Variant styles detach the matching design-token role so variant colours are not masked by shared tokens.
- Added component-aware HTML/CSS/asset export, including shared image-asset reuse across multiple linked instances and pages.
- Added regression coverage for linked master propagation, per-instance overrides, multi-page output, component variants, safe interactions, dynamic visibility, image asset reuse, and UI wiring.

## v1.6.1 — Stability and debugging release

- Added a reusable project-storage boundary with recovery from malformed newer saves by falling back to the next valid legacy save.
- Fixed save-status reporting so a successful v8 save remains successful when the optional schema-5 compatibility copy cannot be written due to quota pressure.
- Corrected the initial save indicator when browser storage is unavailable or all existing saves are corrupt.
- Added preflight checks for total asset count and aggregate file size before reading a multi-file upload batch, avoiding unnecessary memory pressure on oversized selections.
- Expanded asset export fingerprints from 32 to 64 bits (two independent 32-bit rolling hashes) to greatly reduce accidental filename collisions while keeping synchronous dependency-free exports.
- Aligned the browser tab title, package version and docs to v1.6.1; the project schema stays v8.
- Added four targeted regression tests for save recovery, save outcomes, fingerprint uniqueness and upload preflight. Full suite: 75 tests.
- Added `QA_v1.6.1.md` with the stability audit results, server/export smoke tests, and outstanding manual browser checklist.

## v1.6.0 — Asset & Typography Studio

- Added a project-wide reusable asset library for PNG, JPG/JPEG, WebP, GIF, and sanitized SVG uploads; supports filename/format search, insert, replace, usage counts, and protected deletion for referenced items.
- Added strict upload limits: 1 MB raster file, 350 KB SVG, at most 100 library entries, and 1.5 MB aggregate library payload. Raster MIME types are checked against file signatures; SVG uses an element/attribute allowlist and duplicate-attribute rejection.
- Image nodes can reference a central asset ID instead of embedding duplicate data. Project backup retains assets, preview resolves asset references, and site export copies only used assets with content-hash filenames so a shared asset is exported once across pages.
- Expanded typography with five font pairings, three scale presets, custom base size/ratio, linked H1/H2/H3/body/button sizes, live scale preview, and responsive per-element font-size overrides. Font stacks remain system fallbacks; no external font files are embedded.
- Added reusable crop presets and custom focal X/Y percentage controls. Custom desktop, tablet and mobile `object-position` values are preserved in normalized projects and exported CSS.
- Bumped editable project format to schema v8 and local storage key to v8. All v1–v7 backups remain importable; older builds reject v8 rather than silently dropping asset-registry data.
- Added 6 regression tests for typography, SVG safety, raster signatures, storage limits, multi-page asset deduplication, responsive crop output and editor UI wiring.

## v1.5.0 — Vector Authoring Studio
- Added a native SVG vector node type with bounded 1000 × 600 path geometry, selectable layer integration, responsive overlay positioning, and true SVG output in the editor preview and website export.
- Added Select, Freehand, Pen, Rectangle, and Ellipse authoring tools. Drag gestures create freehand and geometric paths; Pen clicks add anchors, double-click/Enter finishes, and Escape cancels.
- Added smooth cubic path generation for freehand/Pen paths and explicit incoming/outgoing Bézier control handles per anchor, with automatic smoothing when handles are left blank.
- Added vector inspector controls for path type, dimensions, fill/stroke, stroke thickness, closure, position, z-order, anchor coordinate editing, add/remove/reset, and standalone SVG download.
- Bounded vector imports to 80 anchors, 1000 × 600 path coordinates, 24–600 px dimensions and safe hex colours; retained schema v7 and v1–v7 backup compatibility.
- Added regression tests for vector import safety, path generation, standalone SVG export, Bézier control handles, toolbar/inspector wiring, and generated preview-script syntax.

## 1.4.0 — Multi-page sites
- Added a page manager to add, switch, duplicate, and delete pages (maximum 20; projects always retain at least one page). Each page stores its own name, route slug, browser title, SEO description, background, and content.
- Added optional project-wide shared navigation and footer with editable brand/footer text and automatically generated links to all project pages.
- Added an internal-page-link selector for buttons. Preview clicks switch the active editor page; exported links resolve to relative static HTML documents.
- Updated website export to create `index.html`, one HTML file per remaining page, shared CSS with per-page selectors, assets collected across every page, and an export README.
- Preserved schema v7 and legacy v1–v7 import compatibility. Added strict multi-page normalisation, unique slugs/IDs, an `index` slug reservation for secondary pages, and a 20-page import ceiling.
- Added eight v1.4 regression tests covering migration, route collisions, shared chrome, per-page metadata, internal links, preview navigation, all-page image collection, and page-manager UI wiring.

## 1.3.0 — Design Systems and reusable section components
- Added safe project-level design tokens for six colour roles, heading/body typography, font weights, radius scale, section spacing, element gap, and content/wide widths.
- Added a Design system editor with six presets (Studio, Ocean, Forest, Ember, Mono, Editorial), custom token controls, and explicit Save/Cancel behavior. Presets remain draft-only until saved.
- Exported design tokens as `--cf-*` CSS custom properties. Built-in default styles use shared variables while deliberately customised node values remain independent.
- Applied the active token palette to newly inserted elements and reusable section presets.
- Added insertable Navigation bar, Hero section, Feature grid, Call to action, and Site footer section templates. Navigation/footer templates export with semantic `nav` and `footer` tags.
- Added responsive layout rules for navigation/footer components and preserved project schema v7 with legacy v1–v7 import support.
- Added regression coverage for token validation, CSS export, token inheritance, semantic component export, and editor wiring.

## 1.2.1 — Blank page and page background
- Added a New project chooser with two starting points: a genuinely empty Blank page or the existing Northstar Starter website.
- Added page-level settings for page name, browser title, and background colour, accessible from the Home page card in the Structure panel.
- Added five quick background swatches alongside the native colour picker.
- Blank projects contain zero sections and zero elements. Their page background fills the full-height preview and is exported to `body` and `.cf-page` CSS.
- Inserting the first element on a blank page creates a clean content section using the current page background; image insertion follows the same path.
- Preserved schema v7; older backups without a page background field safely default to white.
- Added regression coverage for empty-page normalization, background CSS/HTML export, first-section creation, and New/Page Settings UI wiring.

## 1.2.0 — Motion Design Studio
- Added per-element animation duration (100–5000 ms), delay (0–3000 ms), easing, and forward/reverse direction settings across supported element types.
- Added load, viewport-entry, and hover/focus trigger modes, with the inspector's Preview motion control replaying the selected element in the editor iframe.
- Added a small fixed IntersectionObserver runtime to exports only when a viewport-triggered animation is configured. It animates once on entry and falls back to visible content when IntersectionObserver is unavailable.
- Preserved `prefers-reduced-motion` behavior, including not hiding viewport-triggered content when reduced motion is requested.
- Normalized and validated motion values against strict allow-lists and bounds; older schema v1–v7 backups receive defaults without a schema bump.
- Added four regression tests covering bounds/legacy normalization, motion CSS/hover trigger, viewport runtime/reduced motion, and inspector/replay wiring.


## 1.1.0 — Precision tools and reliability
- Added explicit per-element raise/lower controls; overlays reorder by z-stack without reordering normal flow content. The Properties inspector can send an overlay to front/back or move it one stacking level.
- Extended normalized overlay layer-order range to 0–100 and added a regression-tested stack reorder helper that preserves the section's flow-content order.
- Added optional editor-only 16 px grid and pixel rulers around the page preview, with labeled 100 px ruler marks.
- Replaced the image focal-point dropdown with a keyboard-accessible visual 3×3 picker while preserving the same safe nine anchors and CSS export behavior.
- Added shortcuts for duplicate, visibility, canvas lock, alignment, and shared-gap cycling, plus a visible shortcut reference. Existing save/undo/export shortcuts remain.
- Added a last-saved timestamp to the Save status tooltip and retained explicit storage-failure/backup messaging.
- Added regression tests for overlay stack order, flow-order preservation, grid/ruler controls, focal-point picker, and shortcuts.
- Kept schema v7 because no new required persisted fields were added; imported projects from schema v1–v7 remain supported.

## 1.0.0 — Layer-aware design studio
- Added per-layer visibility controls and canvas locking for sections and elements; hidden layers are not rendered in the exported site, while locked layers resist canvas selection, drag, resize, and reorder.
- Added 0–100% opacity controls, saved in the editable model and emitted as CSS custom properties so opacity remains compatible with the end state of entrance animations.
- Expanded the shape palette to rectangle, circle, pill, triangle, diamond, hexagon, star, and outlined ring, with actual CSS geometry.
- Added keyboard overlay nudging: arrows move by 1 percentage point, Shift + arrows by 5, and Alt + arrows by 0.1; groups move together with bounds and responsive breakpoint overrides.
- Enlarged canvas handles and layer controls for touch/coarse-pointer interaction and improved shape palette swatches.
- Bumped the editable project schema to v7, retaining v1–v7 project import compatibility.
- Added regression tests for visibility/opacity/locking, shape geometry, and preview controls.

## 0.9.0 — Constrained decorative overlays
- Added a separate Overlay insert action for section-relative decorative shapes, with percentage X/Y positioning and layer order. Normal content remains in responsive document flow.
- Added drag-to-position interactions for overlays with section edge/centre snap guides, an 8 px snapping rhythm, and Alt-to-bypass snapping. Pointer-cancel and Escape restore the original in-preview positions.
- Added overlay grouping/ungrouping. Grouped shapes remain independent model nodes and exported elements, while dragging one moves the group together within its section.
- Added responsive overlay X/Y overrides for tablet/mobile. The exported breakpoint selector matches the base overlay selector specificity, so mobile position rules reliably override desktop values.
- Allowed pointer hits to pass through the transparent preview container so overlay shapes behind content can still be directly selected and dragged; direct content elements remain selectable.
- Bumped the project schema to v6 while retaining schema 1–6 import support; documented overlay interaction and manual verification steps.
- Added regression tests for overlay normalization, safe group relationships, responsive CSS specificity, and the preview drag bridge.

## 0.8.1 — Gesture verification and mobile guide fix
- Fixed optional guide overlay sizing so it derives width/height from page content and can shrink when the preview changes from desktop to mobile.
- Added a regression test for guide sizing and viewport narrowing.
- Verified the preview bridge in Chromium for multi-select, keyboard resize, pointer resize, pointer-cancel rollback, sibling reorder messages, no page errors, and no horizontal overflow at 390 px.

## 0.8.0 — Precision gestures and arrange tools
- Added Shift/Ctrl/Cmd multi-selection for elements in the same section, with matching selection outlines in the preview and layer list.
- Added batch align controls (left, centre, right, stretch) using responsive `align-self` / `justify-self` CSS rather than fixed coordinates.
- Added equal-spacing presets when all sibling elements in a section are selected; presets update the section's responsive `gap` value.
- Resize handles now snap dimensions to an 8 px rhythm and nearby sibling dimensions; hold Alt to bypass snapping and Shift to preserve aspect ratio for resizable images/shapes.
- Added keyboard arrow resizing, pointer capture for reliable gestures, Escape/pointer-cancel rollback, and grouped history state for canvas edits.
- Bumped editable project schema to v5 while retaining schema 1–4 import support.
- Expanded regression tests for multi-selection, alignment CSS, snapping, history selection state, and gesture cancellation.

## 0.7.0 — Canvas precision, image focal points, and guides
- Added a custom responsive preview width control (320–1920 px) and fit-to-canvas scaling.
- Added optional in-editor content alignment, center, dimensions, and nearby gap guides; guides are not exported.
- Added image cover/contain crop mode and nine safe focal-point positions, including tablet/mobile overrides.
- Bumped the project schema to version 4, normalizing missing focal points to center and preserving schema 1–3 import support.
- Added tests for custom viewport controls, guide bridge syntax, and focal-point normalization/export.

## 0.6.0 — Canvas control and responsive overrides

- Added a resize handle to selected preview elements, mapping drag changes back to supported width, max-width, and height properties.
- Added direct canvas drag-to-reorder for siblings in the same section.
- Added tablet and mobile style overrides with inherited values and a reset action.
- Added responsive section layout/spacing export rules and normalized defaults for inserted nodes.
- Improved the layer navigator's ARIA parent/child structure and keyboard guidance.
- Kept schema 1 and 2 project backups importable through schema 3 normalization.
- Added tests for responsive section layout CSS, inserted-element defaults, safe exports, preview bridge syntax, and layer-tree keyboard hooks.

## Earlier prototype

Earlier versions introduced the local-first editor, section and element editing, image packaging, basic entrance motion presets, local project backups, website ZIP export, and GitHub Pages workflows.
