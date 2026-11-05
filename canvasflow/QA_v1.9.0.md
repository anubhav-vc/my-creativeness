# CanvasFlow v1.9.0 — QA report

Date: 2 November 2026  
Baseline: user-supplied CanvasFlow v1.8.0 Responsive Layout Engine ZIP  
Release: v1.9.0 Advanced Layout Studio  
Project schema: v11  
Runtime used: Node.js v22.16.0

## Summary

The v1.9.0 source was built from the supplied v1.8.0 archive. Existing editor capabilities were retained while the project model, layer navigator, inspector, preview renderer, and website exporter were extended to support nested layout containers and reusable layout presets.

## Automated checks

| Check | Result |
|---|---:|
| `npm run check` | Pass |
| `npm test` | **95 passed, 0 failed** |
| CSS parsing with tinycss2 | 505 top-level rules, 0 parse errors |
| HTML ID audit | 72 IDs, 0 duplicates |
| Local HTML references | 2 checked, 0 missing (`styles.css`, `src/app.js`) |
| ZIP integrity | Pass (`testzip() is None`) |
| Extracted-release syntax/tests | Pass; see final package verification |

## v1.9-specific coverage

- Schema v10 backups migrate to schema v11 without losing pre-existing section responsive settings or component definitions.
- Container nodes normalize with safe allowed layout modes, bounded numbers, safe colours, a bounded child count, and a bounded nesting depth.
- Nested container trees render recursively to HTML and CSS; inner heading/paragraph/card content is retained in the export.
- Each nested node can be found with its parent, containing section, and depth.
- Nested container duplication and section duplication regenerate descendant IDs to avoid collisions.
- Container Tablet/Mobile layout and spacing overrides serialize into the correct CSS media queries. A responsive declaration-order defect discovered during testing was corrected.
- Custom layout presets are limited to 12, IDs are de-duplicated, and imported settings are normalized. Built-in and custom preset actions are wired in the inspector.
- Preset application respects the currently selected viewport: Desktop updates base values, while Tablet/Mobile updates that breakpoint only. Saving a preset captures the effective values at the active viewport.
- v1.8 section Flexbox/Grid and breakpoint tests continue to pass.

## Compatibility and safety notes

- Imports support schema v1–v10 and normalize into v11.
- The local save key is `canvasflow.mvp.project.v11`; older keys v10 through v1 are consulted for migration.
- The optional schema-5 compatibility copy is intentionally not written when nested containers or custom layout presets exist, preventing silent loss of those features in an older-format save.
- Container depth and child count are bounded; layout values and colours use allowlists/limits. No arbitrary user CSS or JavaScript is introduced.

## Manual verification still required

This environment could not complete a genuine interactive Chrome/Edge/Android session, so no manual browser pass is claimed. Before relying on the editor for a real project, verify:

1. Add a container, then add elements inside it; select nested children from the Layers tree and confirm selection stays on the intended layer.
2. Create several nested levels, change Stack/Flexbox/Grid settings, and confirm the preview matches the inspector.
3. Change Tablet and Mobile layouts separately; switch back to Desktop and confirm its base layout was not overwritten.
4. Apply a built-in preset on Desktop, then separately apply a preset on Tablet/Mobile and verify other breakpoints remain unchanged.
5. Save a custom preset, apply it to a second container, delete the saved preset, and confirm already-applied containers retain their values.
6. Duplicate a container and a section containing nested containers; verify children, images, links, components, and IDs remain correct.
7. Save, refresh, reopen, import a v1.8.0 backup, and export a multi-page website containing nested content. Inspect the exported site at desktop/tablet/mobile widths.
8. Test pointer/touch interactions, undo/redo, nested drag-reordering, keyboard navigation, and the export ZIP in Chrome/Edge and Android.

## Run locally

Use Node.js 22 or newer. Extract the release ZIP, open a terminal in the project folder, run `npm start`, and visit `http://localhost:4173`. Run `npm run check` and `npm test` to repeat the automated checks.
