# CanvasFlow — Visual Website Studio (v2.1.0)

> **v2.1.0 Workspace & Design System:** A cohesive editor experience built around Structure → Add → Canvas → Properties. Includes a canonical semantic editor token layer, a dedicated `styles/editor-experience.css` presentation layer, searchable Add dialog, responsive Structure/Properties panels, contextual inspector disclosure groups, empty-canvas and preview status states, and improved panel focus restoration. Project schema remains v12; the model, local-first storage, sandboxed preview and generated website styling remain unchanged.

CanvasFlow is a local-first visual builder for expressive, scrolling websites. Create pages from real webpage elements, edit responsive styling, arrange content visually, save an editable project, and export the HTML/CSS/assets you own.

This is a personal-development prototype designed to be easy to keep in GitHub while the core workflow is being validated. It does not have accounts, a backend, billing, telemetry, or hosting for users' websites.

## Current release: v2.1.0 — Workspace & Design System

### Editor experience update (v2.1.0)

- **Visual foundation:** one canonical semantic editor token source with warm graphite surfaces, focused indigo action/selection, and restrained semantic status colours.
- **Workspace architecture:** the main workflow is made explicit as Structure → Add → Canvas → Properties; project and design tools remain grouped in the global bar.
- **Add experience:** searchable categorized insertion dialog reuses existing content and vector actions.
- **Contextual inspector:** property groups are collapsible and their open/closed state remains editor-local.
- **Responsive workspace:** medium widths use side drawers; narrow/touch widths use a single canvas with Structure/ Add/ Properties bottom navigation and sheets.
- **State communication:** blank canvas invitation and live preview Updating/Ready/Error status are clearer; drawer dismissal restores focus to the relevant trigger.
- **Isolation:** editor tokens and presentation state remain outside project schema v12 and generated website styles.

See [EDITOR_EXPERIENCE_SPEC_v2.1.md](EDITOR_EXPERIENCE_SPEC_v2.1.md) for the full implementation specification and validation plan, and [QA_v2.1.0.md](QA_v2.1.0.md) for automated results and outstanding manual checks.

## Previous release: v2.0.2 — Editor Workspace Experience Redesign

### Editor workspace update (v2.0.2)

- **Insert palette:** tool families now read as Content, Media & layout, Graphics, and Vector tools.
- **Canvas controls:** viewport width, zoom, and Fit are grouped; additional canvas aids are available from Canvas Tools.
- **Layer Explorer:** search across sections and nested elements; matching child layers keep their parent context visible. Press Escape to clear.
- **Inspector:** controls use clearer property cards, stronger labels and more consistent spacing.
- **Responsive workspace:** intermediate tablet widths and narrow mobile layouts have dedicated panel arrangements.


The v2.0.2 update redesigns the **actual CanvasFlow editor workspace**: the Insert palette is separated into Content, Media & layout, Graphics, and Vector tools; canvas width and zoom are grouped; secondary canvas aids live in a dedicated Tools menu; the nested layer tree can be searched; and Properties controls are easier to scan. The top-level project/design menus and on-demand Guide from v2.0.1 remain. These changes affect the editor only, not websites created and exported by users.

All v2.0 Precision Canvas & Transform Studio capabilities remain included. See [QA_v2.0.2.md](QA_v2.0.2.md) for verification results and the remaining manual browser checklist.

v2.0 adds a precision canvas workspace without changing the website's actual viewport dimensions. Zoom from 25% to 200%, zoom toward the pointer, use Fit or Ctrl/Cmd+Shift+F, centre the current selection in the canvas, pan with the Hand tool or Space+drag, and use two-finger pinch/pan on touch devices. Desktop/Tablet/Mobile preview widths remain independent of editor zoom.

Normal content remains in responsive Flow (Stack, Flexbox, or Grid). Switch an individual eligible element or nested container to **Free position** to place it with parent-relative X/Y coordinates, dimensions, and rotation. Free-position settings have independent Tablet and Mobile values. The transform frame provides eight resize handles and a rotation handle; numeric fields remain available for exact values. Returning an element to Flow preserves its previous Free-position values in the project but restores normal layout participation.

The precision tools include page rulers, draggable vertical/horizontal guides, configurable grid/parent/sibling/guide/equal-spacing snapping, modifier-key snap bypass, arrow-key nudging, and multi-selection alignment/distribution plus Match width, Match height, and Match size. Snapping keeps an approximately 8-screen-pixel acquisition tolerance across editor zoom levels. Alignment and centring are measured in the live preview at the active responsive breakpoint. Editor-only handles, guides, rulers, and snap indicators are not included in website exports.

The editable project format is now **schema v12**. CanvasFlow v2.0 imports schema v1–v11 and migrates them to v12 while retaining existing sections, nested containers, assets, vectors, components, pages, design tokens, interactions, layout presets, and responsive overrides. Older builds cannot safely open v12 backups; export a backup before downgrading. The local storage key is now v12, and v11–v1 keys remain available for migration. The optional schema-5 compatibility save is skipped whenever Free-position geometry or non-default precision-editor settings would be lost.

### v2.0 precision workflow
- Use the zoom controls for stepped zoom, enter a percentage directly, or hold Ctrl/Cmd while scrolling to zoom toward the pointer. **Fit** scales the canvas to the available editor width without changing the webpage viewport; Ctrl/Cmd+Shift+F invokes Fit. Use **Hand** or hold Space while dragging to pan. On touch devices, two fingers pan and pinch-zoom the editor canvas; a single finger remains available for normal element interaction or Hand-tool panning.
- Select an element and open **Properties → Precision positioning**. Flow is the default. Choose **Free position** to capture its current size and location inside its parent. The element becomes absolutely positioned relative to its parent container and no longer participates in normal flow.
- Use the eight corner/edge handles to resize. Hold Shift while resizing to preserve the aspect ratio. Drag the circular handle above the selection to rotate. Use numeric X, Y, width, height, rotation, and transform-origin controls for exact values.
- Switch to Tablet or Mobile before editing a Free-position value to create a breakpoint override. Unset values inherit from the next wider breakpoint. Changing the editor zoom never changes the CSS coordinates or responsive viewport width.
- Turn on **Grid**, **Rulers**, and **Guides** as needed. Drag from the top ruler to create a vertical X guide; drag from the left ruler to create a horizontal Y guide. Manage, position, hide, lock, unlock, or delete guides in Page Properties.
- Configure snapping in **Page Properties → Canvas precision**. Hold Alt while dragging to bypass snapping. Snap tolerance is scaled against editor zoom to stay close to 8 screen pixels. Equal-spacing snapping uses neighbouring sibling gaps when enabled. Group movement excludes the other selected elements from sibling snap targets.
- Shift-click or Ctrl/Cmd-click elements in the same parent to multi-select. Use **Centre** above the canvas to centre the selected bounds in the current stage. Free-position selections expose geometric alignment, distribution, Match width, Match height, and Match size commands. Distribution requires at least three elements; matching and alignment require compatible siblings. The preview measures their actual parent and dimensions before applying positions.
- Free-position geometry exports as parent-relative CSS absolute positioning and responsive media-query overrides. Rulers, selection handles, grid, snap lines and guide overlays are editor-only and never appear in the exported website.
- Flow and Free-position are intentionally separate. Prefer Flow for regular content and responsive page structure; reserve Free position for deliberate composition, decorative elements, and precise visual arrangements.


v1.9 adds **nested layout containers** inside a section. Containers are real recursive nodes in the project model and export as ordinary HTML `div` elements with independent Flexbox, Grid, or vertical Stack layout. Add a Container from the insert toolbar, select it in the canvas or Layers tree, then add elements while it is selected to place them inside. Select a nested container to build another level; nesting is bounded to four editable container levels to keep projects manageable.

Each container has its own layout mode, Flexbox direction/wrapping/distribution, Grid fixed or auto-fit columns, item alignment, general/row/column gaps, all-side/horizontal/vertical padding, maximum width, minimum height, background/border colours, and corner radius. Layout values are bounded during editing and import. Tablet and Mobile overrides can independently change layout and spacing; unset properties inherit from wider breakpoints.

The new **Layout presets** controls include five ready-to-apply layouts (Balanced row, Two-column content, Three-column cards, Centered stack, and Balanced split). Save up to 12 named custom presets in a project and apply them to any container. Preset values are stored in the editable project backup.

The editable project format is now **schema v11**. CanvasFlow v1.9 imports schema v1–v10 and migrates them to v11 while retaining existing sections, assets, vectors, components, pages, design tokens, interactions, and responsive overrides. Older builds cannot safely open v11 backups; keep an exported backup before downgrading. The local storage key is now v11, and the editor retains v10–v1 keys for migration. The optional schema-5 compatibility save is skipped for projects containing nested containers or custom layout presets, as those features cannot be represented faithfully in that older format.

### v1.9 nested layout workflow (retained)
- Choose **Container** in the insert toolbar. A new container is added after the selected layer, or inside the selected container. Select the container in Layers or the canvas to edit it.
- Add headings, paragraphs, buttons, cards, shapes, vectors, dividers, or additional containers while the container is selected. The Layers panel displays nested children with indentation; child layers remain individually selectable, movable, duplicable, and removable.
- Use **Layout engine** to choose Stack, Flexbox, or Grid. Flexbox includes direction, wrapping, and main-axis distribution. Grid supports fixed column counts from 1–6 or auto-fit columns with a minimum width of 120–480 px. Cross-axis alignment is adjustable for all layouts.
- Use **Spacing & size** for general, row, and column gaps; all-side, horizontal and vertical padding; maximum width; minimum height; and corner radius. Use **Appearance** for surface and border colours.
- Switch the canvas to Tablet or Mobile before changing a responsive property. Changes are saved as breakpoint overrides and exported as CSS media queries. Container spacing and layout values are independently adjustable at each breakpoint.
- Choose a built-in layout preset or save the selected container's current layout as a named project preset. The project holds up to 12 custom presets; deleting a saved preset does not affect containers that have already used it.
- Container nesting and child counts are capped during import. Unsafe CSS values are normalized; arbitrary CSS or JavaScript is not accepted.
- Website export writes nested semantic content as real HTML and emits per-container CSS, including nested child styles and Tablet/Mobile overrides. The generated website remains independent of CanvasFlow.

### v1.8 responsive section layout engine
- Select a section, then use **Properties → Layout engine**. Stack keeps content in a vertical column. Flexbox lays children out along a row or column, with wrapping and alignment controls. Grid supports a fixed column count or auto-fit columns sized by minimum card width.
- Use **Desktop**, **Tablet**, or **Mobile** above the canvas before changing the layout. Desktop edits the base layout. Tablet and Mobile save only the properties changed at that breakpoint; Mobile inherits Tablet values when it has no explicit value.
- Fixed Grid columns are bounded to 1–6. Auto-fit minimum width is bounded to 120–480 px. Section spacing is bounded to 4–96 px. Unsafe imported values are normalized to safe defaults.
- Website export uses standard CSS Flexbox/Grid and media queries. The exported website does not need CanvasFlow or runtime layout scripts. Existing canvas alignment guides and snapping remain available for the editor's positioning tools.

### v1.7 component workflow
- Select a heading, paragraph, button, image, card, divider, shape, or vector layer. Choose **Create component** in Properties and give the master a name. The selected element becomes its first linked instance.
- Open **Components** in the top bar to manage the library. **Use** inserts another linked instance into the active section. A component can have up to 50 masters per project and 8 named variants per master.
- Expand **Edit shared master** to update the shared element. Existing instances follow those changes. Per-instance text, card title/body, button label/link, or image alternative text can be overridden without detaching the instance.
- Switch the **Visual variant** from Properties to use a different style while keeping the instance linked. Add a variant from the current master form; CanvasFlow saves the current master edits first so they are not lost. Expand any saved variant to edit its style overrides; leave a field blank to inherit that property from the master. Invalid colour values are rejected before save.
- Choose **Detach this instance** to turn one instance into a regular independent element. Detached elements can be resized and repositioned independently; linked instances inherit master geometry and structure. The component master remains available for other instances.
- For button interactions, select a button (or edit a button component master), choose **On click**, then set a section anchor. Supported actions are scroll, show, hide, and toggle. Dynamic visibility updates `aria-hidden`, respects initially hidden sections, and scroll honors reduced-motion preferences.
- Button hover colour, hover label, keyboard focus outline, and pressed scale are independent styles. Exported actions use a small declarative runtime; project imports reject unsupported actions and invalid target IDs.
- Component image masters can select another item from the shared Assets library. Vector masters can change fill, stroke, width, height and stroke weight; path geometry remains shared and can be edited after detaching an instance.
- Website export resolves linked instances into semantic HTML, generates per-instance CSS, includes master image assets, and keeps every page self-contained. Component definitions and instance overrides remain in the editable CanvasFlow backup.

## What's new in v1.6.0

This release introduces the **Asset & Typography Studio**. The project now has a reusable asset library for PNG, JPG, WebP, GIF, and a deliberately restricted, sanitized SVG subset. Assets are uploaded once, can be reused across pages, and are written into website exports only when referenced; identical library assets share one exported file. Image properties include reusable crop presets and numeric focal-point controls, with independent desktop, tablet, and mobile positions. The Design System now supports five font pairings, three scale presets, custom base size and ratio, linked H1/H2/H3/body/button sizes, and a live sample preview.

The editable project schema is now **v8** because image nodes can refer to centralized asset IDs. CanvasFlow v1.6 imports older v1–v7 backups and migrates them into v8. Older releases do not understand the new asset registry and will reject schema v8 backups rather than silently discarding those assets; keep a v1.5 backup if you need to reopen a project in an older build. The v1.6.1 maintenance release keeps schema v8 unchanged.

### v1.6 asset and typography workflow
- Open **Assets** in the top bar to upload multiple image files. Search the library by filename or format, insert an asset into the active page, replace the selected image, or remove an unused asset. Referenced assets cannot be deleted until no image layer uses them.
- Supported uploads are PNG, JPG/JPEG, WebP, GIF, and a safe SVG subset. Each raster file is limited to 1 MB, each SVG to 350 KB, the project library to 100 items and 1.5 MB total payload. These limits help keep project backups and browser-local saves manageable.
- SVG uploads are sanitized against an allowlist of basic geometric/vector elements and attributes. Script, event handlers, external references, embedded images, CSS, filters, masks, patterns, text, and other unsupported content are rejected. Some complex SVG files from illustration tools may need to be simplified or exported as PNG/WebP first.
- Select an image layer to edit its **Crop and sizing** properties. Choose a preset or set exact horizontal/vertical focal percentages. Switch to Tablet or Mobile before adjusting to store separate breakpoint overrides. The same `object-position` values are included in exported CSS.
- In **Design system → Typography**, choose Modern, Editorial, Friendly, Technical, or Classic font pairings, then choose Compact, Balanced, or Expressive type scale. Base size and scale ratio are adjustable. The live preview shows the selected fonts and hierarchy before saving.
- New headings, paragraphs, and buttons use linked type tokens; H1/H2/H3 roles and body/button sizes follow the project scale. Existing per-element typography customisations are preserved. Switch to Tablet or Mobile to make explicit breakpoint-specific font-size overrides.
- Font families are system fallback stacks, not embedded font files. The exact font appearance can differ between devices if the selected family is unavailable on that device.
- Website export includes only referenced assets, uses content-fingerprint filenames to deduplicate shared-library assets, and preserves real multi-page HTML documents and shared CSS.

## What's new in v1.5.0

This release introduces **Vector Authoring**. CanvasFlow can now create editable, resolution-independent SVG paths directly on the page. Draw freehand, place Bézier anchors with the Pen tool, or drag vector rectangles and ellipses. Each vector remains a selectable layer in the existing editor, can be styled with fill and stroke, resized and repositioned, and is exported as real SVG—not a screenshot. The editable project schema for that release was v7, and its backups continue to import into v1.6.

### v1.5 vector-authoring workflow
- Choose **Select**, **Freehand**, **Pen**, **Rect**, or **Ellipse** in the VECTOR group of the insert toolbar. Freehand, rectangle, and ellipse tools use drag gestures. The Pen tool adds one anchor per click; double-click or press **Enter** to finish, and press **Escape** to cancel.
- Select a vector in the preview or Layers panel to open its Properties. Set its path type, width/height, fill, stroke, stroke thickness, position, and layer order.
- In **Path anchors**, edit X/Y coordinates, add or remove anchors, or reset the path. The editor displays up to 24 anchors at once; imported and saved paths are safely capped at 80 anchors.
- For Bézier paths, expand **Curve handles** on an anchor to set its incoming and outgoing control-point coordinates. Leave a handle blank to use CanvasFlow's automatic smooth-curve calculation.
- Use **Download standalone SVG** to download the selected vector as an independent `.svg` file. Website export also embeds the vector as semantic inline SVG, and the same editable vector remains in your project backup.
- Vector geometry is normalised to a 1000 × 600 viewBox. Coordinates, dimensions, colours, stroke thickness and anchor count are bounded during project import; only validated hex colours are accepted for fill and stroke.

## What's new in v1.4.0

This release turns a CanvasFlow project into a **multi-page website**. The editor now manages up to 20 pages in one project, keeps shared site navigation and footer settings consistent, lets buttons link to other project pages, and exports a real collection of HTML documents with shared CSS and image assets. Each page keeps its own name, URL slug, browser title, SEO description, background, sections, and responsive styling. That release used project schema v7; older one-page backups still migrate into a one-page site automatically.

### v1.4 multi-page upgrades
- Use **Site pages** in the Structure panel to add pages, switch the active page, duplicate the current page, and delete a page. At least one page is always retained; the current limit is 20 pages per project.
- Page settings include a unique URL slug, browser title, SEO description, and background colour. The first page exports as `index.html`; every other page exports as `<slug>.html`. The slug `index` is reserved for the home document.
- Open **Shared site chrome** to enable or disable one project-wide navigation header and footer, set the brand label and footer text, and automatically include all pages in both navigation lists.
- Select a button and use **Internal page link** to route it to another page in the project. The preview intercepts these links and switches the editor to the selected page; exported links become ordinary relative HTML links.
- **Export website** creates one HTML file per page, a shared `styles.css`, every referenced image asset from every page, and a README with the page/file list and local preview instructions.
- Each exported page has its own title/description metadata and page-specific background selector. Shared design tokens and responsive CSS remain consistent across the site.
- Imported v1–v7 one-page backups remain supported. Duplicate page/node IDs and duplicate slugs are normalised safely; imports over 20 pages are rejected rather than silently truncated. The editable schema remains v7.

## What's new in v1.3.0

This release introduces **Design Systems**: reusable project-level tokens for colour, typography, corner radius, spacing, and content widths. Tokens are saved in editable backups and exported as readable CSS custom properties. Styles that use CanvasFlow's shared defaults follow the tokens; deliberately customised values remain independent. New elements and insertable component sections inherit the active design system.

### v1.3 design-system and component upgrades
- Open **Design system** in the top bar to edit six colour roles, heading/body font families and weights, three radius values, section padding, element gap, and content/wide widths.
- Load one of six starting palettes: Studio, Ocean, Forest, Ember, Mono, or Editorial. Preset selection is a draft until **Save design system** is clicked; Cancel does not alter project data.
- Exported `styles.css` includes safe `--cf-*` CSS custom properties for the shared tokens. Existing node styles that match the built-in shared defaults use these variables; other manually selected values stay fixed.
- Newly inserted headings, paragraphs, buttons, cards, dividers, and section presets inherit the active token values.
- Add reusable section building blocks from the Structure panel: Navigation bar, Hero section, Feature grid, Call to action, and Site footer. Navigation and footer components export as semantic `nav` and `footer` elements. Update their placeholder labels and anchor destinations for your site.
- Design-system data and component metadata are normalised with strict colour/font/number allow-lists. The project remains schema v7, so older v1–v7 backups continue to import.

## What's new in v1.2.1

This patch release adds a genuine **Blank page** start option alongside the existing Starter website. A blank project opens with zero sections or elements, so the preview is a clean white page. Select the page card in Structure to edit the page name, browser title, and page background colour. The background is saved in the editable project and exported to the standalone website. That release used schema v7; older backups without the page background field default to white.

### Blank page workflow
- Click **＋ New** and choose **Blank page** or **Starter website**.
- Click the **Home page** card in Structure to open Page settings.
- Choose any colour with the colour input or one of the preset swatches.
- Insert your first element directly; CanvasFlow creates a content section automatically using the current page background. You can also add a normal section from the Structure panel.
- Export a blank project and it stays a full-height page with the chosen background colour and no placeholder sections.

## What was introduced in v1.2.0

This release turns the existing entrance presets into a configurable motion studio. Per-element timing, easing, direction, and trigger settings are saved in the editable project model and exported to real CSS. Viewport-triggered animations use a small self-contained IntersectionObserver script in the exported HTML only when needed. The editor remains dependency-free, and the project schema stays at v7 so earlier backups continue to open.

### v1.2 motion upgrades
- Configure **duration (100–5000 ms)** and **delay (0–3000 ms)** for each supported element, plus easing (including a smooth cubic-bezier preset) and direction (forward or reverse).
- Choose **On page load**, **When scrolled into view**, or **On hover / focus**. Viewport-triggered animations play once when they enter the viewport; browsers without IntersectionObserver fall back to immediate visibility rather than leaving content hidden.
- Use **Preview motion** in the Properties inspector to replay the selected element's animation in the live preview.
- Respect `prefers-reduced-motion`: viewport triggers do not hide content or run when reduced motion is requested, and other animations are reduced to a near-instant transition.
- Timing and trigger values are allow-listed and bounded during project normalization. Imported v1–v7 backups without v1.2 fields receive safe defaults. No arbitrary user JavaScript is evaluated.

## What was introduced in v1.1.0

The previous release added explicit stacking-order controls, keyboard-driven editing, pixel grid and rulers, a visual image focal-point picker, and improved save feedback. Normal website content remains responsive and flow-based; canvas aids are editor-only, while design changes persist in the structured model and export to actual HTML/CSS.

### v1.1 precision upgrades
- Raise/lower controls in the layer tree; overlay shapes reorder through their z-stack instead of disturbing normal flow content. Overlay stacking can also be sent to the back, brought to the front, or adjusted one level at a time. Z-index values are normalized to a 0–100 range.
- Optional 16 px canvas grid and pixel rulers around the preview. These tools are visual editor aids only and are not written into exported website files.
- Visual 3×3 image focal-point buttons alongside cover/contain cropping. The selected focal point updates the live preview and exported `object-position` CSS; nine standard anchors are supported.
- Selection-aware keyboard shortcuts: Alt+Shift+D duplicate; Alt+Shift+H toggle visibility; Alt+Shift+K toggle canvas lock; Alt+Shift+L/C/R/S align; Alt+Shift+G cycle shared section-gap presets when all siblings are selected. Alt+Up/Down raises or lowers a selected layer. Ctrl/Cmd+S saves, Ctrl/Cmd+Z undoes, and Ctrl/Cmd+Shift+E exports.
- Save status exposes a timestamp in its tooltip; storage failures continue to prompt a project backup. Project schema stays at v7 because v1.1 adds no new required serialized fields, and older v1–v7 projects remain importable.

### Visual editing
- A dark studio interface with a structured page/layers panel, responsive preview canvas, element insertion toolbar, and contextual Properties inspector.
- A starter website with three editable sections and a feature-card grid.
- Add headings, paragraphs, buttons, images, cards, CSS shapes, and dividers.
- Select elements in the preview or layer tree. Shift/Ctrl/Cmd-click can multi-select sibling elements in the same section.
- Batch-align selected siblings left, centre, right, or stretch using CSS layout alignment, not screen coordinates.
- When every sibling in a section is selected, apply equal section-gap presets of 16, 24, 32, 40, or 48 px.
- Drag selected elements to reorder within the same section, or use the structure tree's move actions. Resize supported elements using the bottom-right handle.
- Resize snapping uses an 8 px rhythm and can snap to sibling dimensions. Hold **Alt** to bypass snapping and **Shift** to lock aspect ratio for supported image/shape resizes. Arrow keys on the resize handle change its dimensions in 8 px steps.
- A resize/reorder is handled as one document mutation. Escape and pointer-cancel roll back a resize gesture instead of leaving a partial edit.
- Add **Overlay** shapes that can be positioned using section-relative X/Y percentages, layer order, and snap guides for section boundaries, centre lines, and nearby shape edges/centres. Hold Alt while dragging to bypass snapping. Arrow keys move a selected overlay by 1 percentage point; Shift + arrows use 5 points and Alt + arrows use 0.1 point. Grouped shapes move together.
- Select two or more decorative overlays and group/ungroup them. Grouped overlays move together but remain separate shape nodes in the project and exported HTML.
- Overlay dragging starts from the effective tablet/mobile position and writes the moved coordinates at the active responsive breakpoint. Normal flow elements are never converted to absolute coordinates automatically.
- Control every layer’s visibility, canvas lock, and 0–100% opacity from the layer tree or inspector. Hidden layers are omitted visually from the exported site; locked layers cannot be accidentally selected, dragged, resized, or reordered on the canvas. Layer-list controls remain available to unlock or show an item.
- Choose eight CSS shapes: rectangle, circle, pill, triangle, diamond, hexagon, star, and outlined ring. The shape palette provides visual swatches rather than a text-only selector.
- Touch-friendly handles and controls are sized for coarse pointers; the preview bridge supports keyboard overlay repositioning and snap bypass.
- Duplicate/delete elements and sections; undo/redo document changes (up to 50 session-history states).
- Edit content, links, colour, typography, alignment, image crop/focal point, card styling, shape dimensions, spacing, section backgrounds, and layout presets.
- Section layouts: stack, two-column, and three-column grid. Multi-column layouts collapse to one column on narrow screens.
- Entrance animation presets include fade, rise, slide left/right, zoom, and blur-to-clear. In v1.2, timing, easing, direction and trigger are editable per element; exports respect `prefers-reduced-motion`.

### Responsive preview and export
- Desktop, tablet (768 px), and mobile (390 px) presets, plus custom preview widths between 320 and 1920 px.
- **Fit** scales the preview to the available canvas without changing the page's actual CSS viewport width.
- Optional **Guides** show content edges, centre alignment, selected dimensions, and nearby spacing in the editor preview only. Guide overlay sizing follows the current page content so it can shrink when the preview switches from desktop to mobile.
- Tablet and mobile style overrides inherit from wider breakpoints when no override is set. Supported layout, spacing, alignment, sizing, color, and image focal-point settings export as responsive CSS.
- The structured project model is the source of truth for editor preview and website generation. Export does not use a screenshot or scrape the preview DOM.
- Export a standalone website ZIP containing semantic `index.html`, responsive `styles.css`, and a README. Uploaded PNG/JPG/WebP/GIF images are copied into `assets/`. SVG upload and arbitrary imported JavaScript are not supported.
- Exported sites have no CanvasFlow runtime dependency and work offline when their assets are local.

### Save and development workflow
- Autosave/manual Save and Open saved project use browser-local storage.
- Download/import a portable `.canvasflow.json` editable backup. Uploaded image data is embedded in the backup; keep large backups outside Git if they contain private material.
- Keyboard shortcuts include `Ctrl/Cmd+Z` to undo, `Ctrl/Cmd+Shift+Z` or `Ctrl/Cmd+Y` to redo, `Ctrl/Cmd+S` to save, and `Ctrl/Cmd+Shift+E` to export.
- Project schema v7 imports schema v1–v7 backups and normalizes older data. New visibility, opacity, and locking fields receive safe defaults when old projects are opened. Recent changes are also kept in a bounded in-memory history for the current session.
- GitHub Actions workflows run the syntax checks/tests and deploy the static editor to GitHub Pages.
- No npm runtime packages are required; the ZIP writer and local Node server use built-in APIs. Exported motion triggers use only a small, fixed IntersectionObserver script generated by CanvasFlow; no arbitrary project text is executed as code.

## Run locally on Windows

1. Install Node.js 22 or newer.
2. Download/extract the repository or clone it with Git.
3. Open the `canvasflow-mvp` project folder in VS Code.
4. Open a terminal in that folder and run:

   ```powershell
   npm start
   ```

5. Open `http://127.0.0.1:4173` in Chrome or Edge.
6. Stop the server with `Ctrl+C`.

No `npm install` is needed.

## Run checks

```powershell
npm run check
npm test
```

The automated suite covers model normalization, schema compatibility, safe motion timing/trigger values, animation CSS, reduced-motion behavior, viewport observer output, preview replay messaging, visibility/opacity/locking export, geometric shape CSS, safe URLs and escaped content, responsive CSS, alignment, image asset packaging, history state, ZIP structure, and the preview interaction bridge. GitHub Actions runs the same checks on pushes and pull requests.

### Browser checklist for a release candidate

### v1.5 vector-authoring browser checklist

1. Select **Freehand**, draw a multi-point stroke, and confirm it is added as a selected vector layer. Undo and redo the operation.
2. Select **Pen**, click to add at least three anchors, double-click to finish, and repeat with Enter. Press Escape during a separate path and confirm it is cancelled.
3. Draw a rectangle and ellipse by dragging from top-left to bottom-right, then repeat in the opposite direction. Confirm each shape stays inside its section and can be selected from the Layers panel.
4. Edit anchor X/Y values, add and remove anchors, and reset the path. For a Bézier path, expand Curve handles, enter incoming/outgoing values, then clear one field to restore automatic smoothing.
5. Change fill, stroke, stroke width, width/height and canvas position. Confirm the vector remains crisp when resized and that undo/redo restores each change.
6. Download a standalone SVG and open it in a browser or vector editor. Export a multi-page website containing vectors on more than one page; inspect each HTML file and verify the inline SVG paths render.
7. Repeat the drawing and inspector workflow at desktop, tablet, mobile and touch/coarse-pointer widths. Confirm the toolbar can scroll horizontally and vector controls remain reachable.

### v1.4 multi-page browser checklist

1. Add a page, rename it, change its slug, browser title, SEO description, and background; save, refresh, and reopen the backup.
2. Duplicate a page that contains sections and internal page links. Confirm the duplicated content has unique element IDs and self-links now target the duplicate.
3. Select a button and route it to another page using **Internal page link**. Click it in the editor preview and confirm the editor switches pages without leaving the editor.
4. Enable shared navigation and footer. Confirm both show the current page and all pages in the same order; disable each independently and confirm the export follows the toggles.
5. Add an image to a non-home page. Export the site and verify its HTML file, image asset, relative image path, navigation links, and SEO description.
6. Set a secondary page slug to `index`; confirm the editor rejects it. Try duplicate slugs and confirm the editor keeps each route unique.
7. Delete a page referenced by a button. Confirm the remaining site still exports and the now-invalid page link safely becomes `#`.
8. Export a three-page site. Extract the ZIP, open `index.html`, navigate between pages, then run `python -m http.server 8000` and test direct navigation to each `.html` file.
9. Test the page manager, inspector, shared chrome dialog, and preview navigation in desktop, tablet, mobile, and touch/coarse-pointer layouts.

1. Select an animated element. Change its duration/delay/easing/direction; use Preview motion, then test each trigger in the live preview and exported site. Turn on the OS/browser reduced-motion preference and verify content remains visible.
2. Click a page element; confirm the Properties inspector and layer selection follow it.
3. Shift/Ctrl/Cmd-click two elements in the same section. Confirm both are outlined and the inspector reports a multi-selection. Try selecting elements from different sections and confirm it does not make an invalid mixed selection.
4. Apply Left/Centre/Right/Stretch alignment. Select every sibling in a section and apply a gap preset. Export the site and inspect the responsive CSS.
5. Drag the selected element's bottom-right handle. Confirm the size property updates. Try **Alt** to disable snapping and **Shift** to preserve aspect ratio on an image or shape.
6. Cancel a resize with Escape or pointer-cancel and confirm the element returns to its original size without an edit being committed.
7. Drag an element above/below another sibling and confirm the content order changes. Use Undo and Redo; one gesture should be one history action.
8. Switch through desktop, tablet, mobile, and a custom viewport width (for example 1024 px and 390 px). Confirm responsive overrides do not leak into desktop styles.
9. Toggle Guides and resize the preview from desktop to mobile. Confirm the guide overlay shrinks too and causes no horizontal overflow.
10. Add two Overlay shapes. Drag one; confirm it moves within its section and snap guides appear near the section edge/centre. Hold Alt and confirm snapping is bypassed.
11. Shift-click both overlay shapes, group them, and drag one. Confirm both keep their relative spacing. Ungroup and verify each can be moved independently.
12. Change one overlay X/Y position on mobile, switch back to desktop, and confirm only the mobile position changed. Export and inspect the mobile media query for a selector specific enough to override the base positioned rule.
13. Export a website ZIP, extract it into a separate folder, and inspect it at 390 px and 1440 px. Confirm local images load, responsive CSS is present, and no editor bridge script is included. A small generated motion runtime appears only when viewport-triggered animation is configured.
14. Toggle **Grid** and **Rulers**; confirm the 16 px grid and 100 px pixel labels appear in the editor preview only and do not enter the exported site.
15. Create two decorative overlays and use their raise/lower buttons plus Send to back/Bring to front. Confirm their z-stack changes while the normal-flow text/buttons/cards retain their content order. Undo and redo the change.
16. Select an image and choose different points in the 3×3 focal-point picker. Confirm the live preview changes and the exported CSS contains the chosen `object-position`.
17. Select a layer and try Alt+Shift+D (duplicate), Alt+Shift+H (visibility), Alt+Shift+K (lock), and Alt+Shift+L/C/R/S (alignment). To test Alt+Shift+G, select every sibling in a section first. Avoid these shortcuts while typing in an input.
18. Hide a section and an element from the layer tree. Confirm the editor preview and exported site both hide them; show them again without losing their other settings.
19. Lock a layer, try selecting or moving it on the preview, and confirm it stays put. Unlock it from the layer tree or inspector. Lock a section and confirm its children cannot be moved.
20. Set element opacity to 35%. Confirm the preview and exported CSS preserve transparency. Combine opacity with each entrance animation and confirm the final rendered opacity stays correct.
21. Cycle the shape palette through rectangle, circle, pill, triangle, diamond, hexagon, star, and ring. Confirm the ring is outlined and the polygon shapes render as their chosen geometry.
22. In a touch/coarse-pointer viewport, confirm resize handles and layer action buttons are comfortably tappable. On a selected overlay, use arrow keys, Shift + arrows, and Alt + arrows; confirm small/medium/fine changes and that grouped shapes move together.
23. Try snap guides when placing overlays near each other and the section boundaries; hold Alt to bypass snapping. Confirm guide overlays are editor-only and never appear in exported HTML.

The v1.1 baseline had an isolated Chromium-harness pass for overlay hit-testing, snap labels, grouped drag, mobile position overrides, and ZIP inspection; its save/reopen test used an in-memory storage shim. For v1.2, the motion runtime and editor wiring are covered by the automated suite and a simulated IntersectionObserver test, but this environment did not complete a full interactive Chrome session. Manually verify the new Motion inspector controls, Preview motion, scroll triggers, reduced-motion behavior, and persistent browser storage in your own Chrome or Edge sessions before relying on a public deployment.

## Publish the editor to GitHub Pages

24. Create a repository and put the contents of this folder at its root (`index.html` should be at the root).
25. Commit and push the files to the `main` branch, including `.github/workflows/`.
26. In GitHub, open **Settings → Pages** and set the source to **GitHub Actions**.
27. Open **Actions** and inspect the CI and deployment runs.
28. Find the published URL in Settings → Pages or the deployment summary.

The editor uses relative script/style paths and supports repository subpaths such as `https://USERNAME.github.io/REPOSITORY/`. See [GitHub's Pages custom-workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

GitHub Pages hosts the **CanvasFlow editor**, not the websites users create. Users download the website ZIP and choose where to host it.

## Editable project vs website export

- **`.canvasflow.json` backup:** structured project data for reopening and continuing visual edits. Uploaded image bytes may be embedded in this file.
- **Website ZIP:** an independent set of HTML/CSS files plus local assets, for viewing, code editing, or deployment. It is not a fully editable CanvasFlow project.

Browser storage is scoped to the browser origin. A project saved at `127.0.0.1` will not sync automatically with the GitHub Pages origin or another device. Download backups when changing browser or machine.

## Public repository safety

- Never commit project backups containing private text or images. `.gitignore` excludes `*.canvasflow.json` by default.
- There are no secrets, accounts, backend, cloud sync, or access controls. Anyone who can visit a public Pages deployment can use the editor in their own browser.
- Imported projects are normalized before opening. Uploaded images are limited to PNG/JPG/WebP/GIF and 1 MB each in this prototype. SVG uploads and arbitrary JavaScript are not supported.
- A public repository exposes the source. Choose a source license and check the name/trademark before inviting reuse or making commercial claims. There is intentionally no `LICENSE` file yet.

## Current limitations

- The editor supports up to 20 pages, local internal routes, shared navigation/footer, and static multi-page ZIP export. It still has no collaboration, accounts, cloud sync, or hosted publishing service.
- Multi-selection is limited to sibling elements in one section. Decorative overlay groups are also section-local and support only overlay shapes.
- Free positioning is deliberately constrained to decorative shapes inside a section. Content text, buttons, cards, and images remain in responsive flow; there is no unrestricted absolute-positioning mode for regular content, rotation, full direct-manipulation Bézier handles on the canvas, or 3D authoring yet. Vector anchors and their Bézier control handles are edited numerically in the Properties inspector.
- There is no full presentation-style animation timeline, multi-step scroll sequencing, or arbitrary event logic. v1.7 interactions are intentionally limited to button scroll/show/hide/toggle actions on section anchors.
- Project persistence uses browser localStorage. Image-heavy projects can reach browser storage limits; keep portable backups.
- Export generates HTML/CSS and, only when a viewport-triggered animation is used, a small built-in observer script. It does not generate arbitrary user JavaScript interactions or export designs into Python/C++/Java.
- Linked component instances share master geometry and structure; resize or reposition the master to update all instances, or detach an instance for independent editing. Direct per-instance canvas transforms are not yet supported.
- Component button actions use one shared target anchor. For page-specific interaction targets, use separate detached buttons or keep the target anchor consistent on each page.
- The editor is a prototype. Inspect the generated code and test real exports at multiple widths before public use.

## Next milestones

29. **v1.2 Motion Design Studio:** configurable animation duration, delay, easing, entry direction, preview replay, and carefully scoped viewport triggers while preserving reduced-motion behavior and editor/export parity.
30. **v1.3 Design Systems:** implemented in this release; includes six token presets and insertable semantic section components.
31. **v1.4 Multi-page websites:** implemented in this release; includes page management, shared site chrome, internal page links, per-page metadata, and multi-page ZIP export.
32. **v1.5 Vector Authoring:** implemented in this release; includes SVG shapes, Freehand and Pen tools, editable anchors and Bézier control handles, and standalone SVG export.
33. **v1.6 Asset and Typography Studio:** implemented; includes a reusable asset library, sanitized SVGs, type pairings/scales, and responsive crop controls.
34. **v1.7 Component & Interaction Studio:** implemented; includes linked masters, per-instance content overrides, variants, safe button actions, and hover/focus/pressed states.
35. **v1.8 Responsive Layout Engine:** implemented; includes configurable Flexbox and fixed/auto-fit Grid with separate tablet and mobile layout overrides.
36. Continue improving storage recovery, import/export security, keyboard accessibility, and mobile touch behavior.
37. Consider React + TypeScript + Vite when the dependency-free prototype becomes difficult to maintain; do not migrate only for fashion.

Before a commercial release, revisit licensing, branding/trademarks, privacy, accessibility, import security, storage/recovery, export testing, and the need (or lack of need) for a backend.

## Project structure

```text
canvasflow-mvp/
├── index.html
├── styles.css              # Base editor styles + canonical --ui-* tokens
├── styles/
│   └── editor-experience.css # v2.1 workspace/panel presentation layer
├── src/
│   ├── app.js        # Editor UI, inspector, state and save/import/export
│   ├── model.js      # Versioned data model, preview bridge, HTML/CSS exporter
│   ├── history.js    # Bounded session undo/redo
│   └── zip.js        # Dependency-free ZIP writer
├── tests/
│   └── model.test.js
├── .github/workflows/
│   ├── ci.yml
│   └── pages.yml
├── server.mjs
└── package.json
```


## v1.8 manual verification checklist

Before publishing a site, select a section and test Stack, Flexbox row/wrap, Flexbox column, fixed Grid (2–4 columns), and auto-fit Grid at desktop width. Then set a different layout on Tablet and another on Mobile, confirm that Mobile inherits Tablet properties it does not override, save/reopen the project, and export the website. Inspect the exported HTML/CSS at wide, tablet, and phone widths. Also import a v1.7.1 project backup and confirm its sections, reusable components, variants, and interactions remain intact.

## v1.6 manual verification checklist

Before a public deployment, open the v1.6 project in Chrome or Edge and verify: upload one PNG and one SVG, search each in Assets, insert one asset on the Home page and reuse it on another page, ensure Delete is disabled while in use, remove the image and then delete the unused asset, reload the editor to confirm local persistence, change a font pairing and type scale then save/reopen, and set different crop positions on desktop/tablet/mobile before checking the exported website at all three widths. Also test a legacy v1.5 backup import and confirm the new project downloads as schema v8.
