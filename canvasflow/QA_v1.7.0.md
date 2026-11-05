# CanvasFlow v1.7.0 — QA and Release Verification

**Release:** 1.7.0 — Component & Interaction Studio  
**Project schema:** v9  
**Runtime:** Node.js 22 or newer for the included development server and checks  
**Dependencies:** No third-party npm runtime dependencies

## Release summary

The v1.7.0 build adds a project-level component registry and a bounded, declarative button interaction model on top of the v1.6.1 stability release. This report records automated tests, source/markup checks, a local-server smoke test, and an exported multi-page website fixture. It does not claim full browser-based interaction testing.

## Implemented scope

- Up to 50 component masters per project and up to 8 validated visual variants per master.
- Supported masters: headings, paragraphs, buttons, images, cards, dividers, shapes, and vector paths.
- Linked instances can be reused across pages. Shared master updates propagate to instances; supported content properties can be overridden per instance.
- Instances can be detached and edited independently. Linked instances intentionally share master geometry and structure; they do not expose per-instance canvas resize/move handles. Edit the master or detach the instance.
- Component Studio supports insert/use, master editing, variants, instance counts, protected deletion, and component creation from a selected element.
- Button interactions are restricted to `none`, `scroll`, `show`, `hide`, and `toggle`, with validated section anchor targets. No arbitrary JavaScript is evaluated.
- Exported interaction behavior keeps `aria-hidden` synchronized, handles initially hidden sections, and respects reduced-motion preferences for scrolling.
- Button output includes separate hover, keyboard focus, and pressed states.
- Component masters can reuse shared image-library assets. Website export resolves linked instances into semantic HTML and shared page-specific CSS.
- Project schema v9 imports/migrates schema v1–v8.

## Automated checks

Run from the project directory:

```bash
npm run check
npm test
```

Results from the release workspace:

- `npm run check`: passed; syntax checks for `server.mjs`, model, history, ZIP writer, project storage, and app modules.
- `npm test`: **83 passed, 0 failed**.
- The suite includes regression cases for linked component propagation across pages, per-instance content overrides, semantic export, variant sanitization and design-token detachment, image asset reuse, safe action validation, dynamic show/hide/toggle behavior, accessible state updates, editor wiring, linked shape/vector pointer handling, and overlay-layer placement for vector/shape masters.

## Static source audit

- `index.html`: 72 IDs, all unique; no duplicate IDs found.
- All local `src` and `href` references in the editor HTML resolve to files in the release directory.
- `styles.css` parsed with `tinycss2`: zero top-level parser errors.
- `node --check` passed for generated interaction runtime scripts in the export smoke fixture.

## Local server smoke test

Started with `npm start` and checked the following on `http://127.0.0.1:4173`:

| Request | Result |
|---|---:|
| `GET /` | HTTP 200 |
| `GET /styles.css` | HTTP 200 |
| `GET /src/app.js` | HTTP 200 |
| `GET /src/model.js` | HTTP 200 |
| `GET /src/history.js` | HTTP 200 |
| `GET /src/zip.js` | HTTP 200 |
| `GET /src/project-storage.js` | HTTP 200 |
| `POST /` | HTTP 405 (expected) |
| Encoded traversal probe | HTTP 404 (rejected) |

## Export smoke test

Generated a two-page fixture with a linked button master, different instance text overrides, visual variants, and a declarative `toggle` action. Then verified:

- `index.html` and `about.html` are both present.
- Both pages render the linked button component and interaction attributes.
- Both pages reference page-specific component CSS from the combined `styles.css` output.
- ZIP archive integrity check passes.
- Embedded JavaScript runtime snippets pass `node --check`.

Additional automated tests verify shared library image assets are exported once and referenced by linked instances.

## Known limitations / manual QA required

Full interactive browser testing was not completed in this environment. Please verify in Chrome or Edge before relying on the editor for a public project, and repeat the key touch checks on Android.

Manual checklist:

1. Open **Components** and confirm the library dialog appears, closes, and remains usable at a narrow viewport.
2. Select a heading, paragraph, button, image, card, divider, shape, and vector in turn; use **Create component** and confirm the selected element becomes a linked instance.
3. Edit each master, save, and confirm every linked instance updates. Test text/card/image-alt overrides and verify they remain local to their instances.
4. Add a visual variant, switch variants from Properties, and confirm the expected appearance exports. Try invalid variant names and confirm they are rejected.
5. Insert a component on a second page, edit the master, and verify the second page preview reflects the change.
6. Try protected deletion while instances exist, then detach or remove instances and delete the unused master.
7. Test button `scroll`, `show`, `hide`, and `toggle` actions in preview and in exported files. Confirm missing targets do not break the page.
8. Verify hover, keyboard focus, and pressed button states using a mouse and keyboard.
9. Confirm linked shape/vector components do not show per-instance resize/move controls; detach one and verify independent editing is available.
10. Export a two-page site and test both HTML files, shared CSS, image assets, and navigation at desktop, tablet, and mobile widths.

Known product constraints:

- Linked instances share master dimensions and geometry. Detach an instance for independent canvas resizing or positioning.
- A button component has one shared interaction target anchor. For page-specific targets, use page-consistent anchors or separate/detached buttons.
- Interactions are intentionally limited to safe built-in button actions. There is no arbitrary event scripting or user-authored JavaScript execution.
- Component paths are shared at master level; detach a vector instance to edit its path geometry independently. Overlay-positioned shape/vector components are exported into the same dedicated overlay layer as ordinary overlay nodes.

## Release recommendation

The automated/model/export/server verification is clean. Treat v1.7.0 as ready for hands-on acceptance testing, not as fully browser-certified. Keep a copy of the v1.6.1 project backup before migrating an important project to schema v9; older builds cannot safely retain linked component definitions.
