# CanvasFlow — Editor Experience Redesign Specification

**Release target:** v2.1 — Workspace & Design System  
**Implementation baseline:** CanvasFlow v2.0.2  
**Implemented build:** v2.1.0  
**Project schema:** v12 (unchanged)  
**Product model:** local-first, model-first visual website builder; editable project data is authoritative, preview/export are derived.

> This specification refines the supplied *CanvasFlow — Editor Experience Redesign Plan*. The plan is the source for product constraints and architectural direction. This document turns it into concrete information architecture, visual rules, interaction contracts, phased delivery and acceptance criteria. Statements labelled **implemented** describe the current v2.1.0 code; statements labelled **target/validation** describe work that must still be confirmed or completed in real browsers and usability sessions.

---

## 1. Design direction — Warm Graphite Drafting Studio

### Product character

CanvasFlow should feel like a focused creative instrument: closer to a well-organised drafting studio than a generic analytics dashboard. Its identity comes from a warm graphite workbench, precise alignment, legible typography and a single focused indigo action colour. The user's website is the visual centre of gravity; editor panels are quiet tools around it.

The mood is:

- **Calm and deliberate:** low-noise surfaces, few persistent accents, predictable panel boundaries.
- **Craft-oriented:** measurements, hierarchy, guides and selection geometry feel precise, not decorative.
- **Creative but restrained:** colour is used for selected/active/action states, not ambient glow or ornament.
- **Trustworthy and local-first:** save state and export ownership are visible in plain language.

Avoid a neon control-room look, large gradients, glowing borders around ordinary cards, gratuitous glass effects and competing accent colours. Canvas grid and ruler details should be lower contrast than the webpage being edited.

### Experience rule

Organise the product around the actual work sequence:

**Build → Arrange → Style → Inspect → Export**

This is a mental model, not a mandatory wizard. A returning user can work in any order. The canvas stays visible, the inspector responds to selection, and advanced features appear at the point of need.

### Key decisions

| Decision | Specification | Rationale / trade-off |
|---|---|---|
| Product theme | Dark graphite in v2.1; semantic tokens structured so light mode could be added later | Avoids a second theme multiplying the first release's QA surface. Light mode remains an open product decision. |
| Default layout | Flow (Stack/Flexbox/Grid) | Predictable responsive layout is safer for normal website content. |
| Precision layout | Free position is explicit and visibly identified | Absolute positioning is powerful but can create breakpoint-specific maintenance. |
| Canvas | Quiet neutral surround; website preview dominates | The design being created should have the strongest visual hierarchy. |
| Feature discovery | Searchable Add surface, contextual inspector, grouped project tools, on-demand guide | Users discover features while doing the job rather than learning a long catalogue first. |
| Architecture | Incremental refactor; preserve IDs, action handlers and model contracts | `app.js` is tightly coupled. A rewrite adds unnecessary migration and regression risk. |

---

## 2. Workspace and feature architecture

### 2.1 Global application bar

**Persistent content**

- CanvasFlow mark and product name.
- Editable project name.
- Save state: `Not saved yet`, `Unsaved changes`, `Saved locally`, `Save failed`.
- Undo and redo, disabled when unavailable.
- `Design tools` menu: Design system, Asset library, Components.
- `Project` menu: New, Open saved project, Download backup, Import backup.
- Explicit `Save` and primary `Export website` actions.
- On-demand `Guide`.

The live preview is permanently present in the central workspace, so a second global Preview button would duplicate the main work surface. The viewport switcher is labelled Desktop/Tablet/Mobile and must never be confused with editor zoom.

**Hierarchy**

`Export website` is the single strongest global action. `Save` is secondary but always visible. Undo/redo remain adjacent as a pair. Project/design utilities are grouped by ownership and purpose. Do not split the same task family across unrelated menus.

### 2.2 Structure panel — Pages and Layers

The left panel is the user's map of the site, not a general tool drawer.

1. **Current page card:** page identity, output filename and Page settings entry.
2. **Site pages:** add, switch, duplicate, delete; page count and current-page state.
3. **Shared site chrome:** shared navigation/footer settings.
4. **Page sections:** add section through a compact template chooser.
5. **Layer Explorer:** searchable semantic hierarchy with nested containers, visibility and canvas lock controls.
6. **Local-first note:** project is saved in this browser; export is a separate portable site.

**Search rules**

- Search is recursive through nested container descendants.
- A matching child keeps its ancestor path visible so the user can locate it.
- `/` focuses Layer search only when focus is not already in an input, textarea, select or editable region.
- `Escape` clears the search when the search field owns focus; the global layer-search shortcut must not steal Escape from dialogs.
- Clearing search restores the full tree and normal expanded/collapsed state.

**Insertion is separate from structure.** `+ Add` opens the Add experience; it does not insert a default element immediately and is not embedded in the Layers tree.

### 2.3 Add / Insert experience

A searchable dialog is the single home for page-building and drawing actions. It reuses the existing `data-insert` and `data-vector-tool` action contracts; no element factory or vector behavior is replaced.

**Categories**

- Content: Heading, Text, Button.
- Media & layout: Image, Card, Container and existing layout-capable elements.
- Graphics: Shape, Divider and supported graphic blocks.
- Vector tools: Select, Freehand, Pen/Bézier, Rectangle, Ellipse and existing vector tools.

**Behaviour**

- Search filters item labels/titles and category names, and hides empty categories. The Add dialog focuses its search field on open; `/` remains the global Layers-search shortcut.
- No results shows a useful message and an easy way to edit the query.
- The dialog explains the insertion destination: selected section/container or current page context.
- Selecting a building block closes the dialog and runs the pre-existing insertion/drawing action.
- `Escape`, close button and backdrop dismissal close the dialog; focus returns to the Add trigger.
- Recent/favourite tools are a future enhancement only if task testing demonstrates a need. They are not required for this release.

### 2.4 Central canvas workspace

The canvas remains the primary work surface and the live preview iframe remains the preview authority for rendered geometry. The iframe stays sandboxed with the existing `allow-scripts` permission; redesign must not loosen the sandbox or accept arbitrary code.

**Canvas toolbar**

- Select/Hand tool state.
- Desktop/Tablet/Mobile/custom viewport controls.
- Zoom out, numeric zoom, zoom in and Fit.
- Secondary Canvas Tools popover: Hand, Centre selection, Guides, Grid and Rulers.
- Preview status: Updating preview, Live preview, Preview unavailable.

**Separation of dimensions**

- Website viewport width controls responsive CSS evaluation.
- Canvas zoom controls only the editor's visual scale.
- Pan offsets the editor viewport and does not mutate page geometry.

**Selection action bar**

The current selection should expose a small contextual action surface for common operations only (e.g. duplicate, align/arrange when valid). Do not mirror every Inspector field in a floating toolbar. Multi-selection actions must explain why an operation is unavailable rather than silently doing nothing.

### 2.5 Contextual inspector

The right panel is a context-sensitive property inspector. Its first visible content depends on what is selected:

| Context | Inspector content |
|---|---|
| No element selected | Page settings, page background, canvas precision/page-scoped settings and page metadata. |
| One section/container selected | Layout/Position, Size, Appearance, Responsive, Advanced. |
| One content element selected | Relevant Layout/Position, Size, Appearance, Typography/Content, Responsive, Motion/Interaction and Advanced groups only where supported. |
| Multiple elements selected | Shared valid geometric/layout operations; clearly explain disabled or incompatible operations. Avoid showing misleading single-item fields. |
| Free-position element selected | Explicit Flow/Free mode, parent/reference name, active breakpoint, X/Y/W/H/rotation and transform origin. |
| Unsupported or locked selection | Read-only explanation and path to unlock or select from Layers. |

Inspector groups use stable names and collapsible disclosure. Open/closed state is editor UI state, not project content. Preserve the state while the selection remains relevant; do not serialize it into the website or project document.

**Recommended group order**

1. Layout / Position
2. Size
3. Appearance
4. Typography / Content
5. Responsive
6. Motion / Interaction (only for supported elements)
7. Advanced

Essential, high-frequency values stay visible. Rare controls belong in a named advanced group—not buried several dialogs deep.

### 2.6 Feature placement map

| Feature family | Primary home | Secondary discovery |
|---|---|---|
| Pages, sections, nested layers | Structure | Contextual canvas selection |
| Add content/media/layout/graphics/vectors | `+ Add` searchable dialog | Empty-canvas CTA |
| Live website preview | Central canvas | Viewport switcher |
| Desktop/Tablet/Mobile/custom width | Canvas toolbar | Responsive inspector group |
| Canvas zoom, pan, fit | Canvas toolbar | Keyboard shortcuts / Hand tool |
| Guides, grid, rulers, snap | Canvas Tools and Page precision settings | Contextual guide hint |
| Flow/Free-position, transforms | Inspector Layout/Position | Contextual selection bar |
| Design tokens / typography | Design system | Styling context and project menu |
| Assets | Asset library | Image insertion/replacement |
| Components | Components library | Insert and selection context |
| Motion/interaction | Inspector for supported selection | Prototype/motion contextual group |
| Save / undo / redo / export | Global bar | Keyboard shortcuts |
| Project import / backup / reopen | Project menu | Save/recovery status |

### 2.7 Required workspace states

| State | Expected presentation and action |
|---|---|
| Empty project | Canvas invitation with `Add an element` and `Page background`; Structure still exposes Pages and Add. No false selection handles. |
| Empty layers/section | Helpful empty message and Add action; do not leave a blank tree with no instruction. |
| No selection | Page settings is the inspector context; clear statement that no element is selected. |
| Single selection | Name/type, parent, active breakpoint and relevant property groups. Canvas outline/handles plus text/label; not colour alone. |
| Multi-selection | Count and common parent context; only valid shared operations; compatibility explanation for disabled actions. |
| Breakpoint edit | Active viewport label remains visible in toolbar and inspector; show inherited/base versus overridden values; reset-to-inherit control where implemented. Flow remains default. |
| Loading preview | `Updating preview…` and `aria-busy=true`; avoid stale status suggesting latest change is rendered. |
| Preview error | `Preview unavailable`, non-modal notice and retry/re-render path; selection/model remains intact. |
| Saving | `Unsaved changes` while autosave is pending; `Saved locally` after persistence succeeds. |
| Save failure | `Save failed`, error toast, clear instruction to download a project backup before leaving. Never imply a failed save succeeded. |
| Recovery | Explain when a damaged newer save was skipped and a valid older save restored; preserve the error context in a non-blocking notice. |
| Validation error | Inline field error and `aria-invalid`; toast only for cross-field/action-level failure. Preserve entered values where safe. |
| Dialog open | Focus enters dialog; Escape/backdrop/close dismiss appropriately; focus returns to opener. Destructive project replacement remains explicitly confirmed. |

### 2.8 Responsive workspace patterns

Do not shrink three columns into three unusable strips.

| Width / context | Workspace behaviour |
|---|---|
| Wide desktop (approx. ≥1101 CSS px) | Structure + canvas + inspector. Panels remain persistent; canvas flexes into remaining width. |
| Medium (approx. 761–1100 px) | Canvas owns the page. Structure and Properties open as independent side drawers with a backdrop. Toolbar exposes panel toggles; the narrow-screen bottom navigation is hidden. Opening one drawer closes the other. |
| Narrow/touch (≤760 px) | One main canvas. Structure and Properties open as bottom sheets; a fixed bottom navigation provides Structure / Add / Properties. Add opens a full-width/bottom-sheet dialog; the duplicate toolbar Add trigger is hidden at this width. No three-column layout. |
| Very narrow (≤380 px) | Compress labels, not touch targets. Keep Add, viewport and Export reachable. Move secondary controls into menus. Avoid hiding Save/Export without an obvious route. |

Touch targets should be at least 44×44 CSS px for primary touch controls. Sheets must respect safe-area insets, allow internal scrolling and leave enough canvas context visible. A single finger should not unexpectedly pan when the user is editing a control; pinch/pan must be multi-touch and cancel safely on pointer loss/orientation changes.

---

## 3. Visual design system

### 3.1 Semantic colour tokens

The implementation uses one canonical `:root` token source for editor UI. These tokens are not project design tokens and are not included in generated website CSS.

| Semantic token | HEX | Use |
|---|---|---|
| `--ui-canvas` | `#111318` | Outer application/canvas surround |
| `--ui-surface-1` | `#191C23` | Main panels and default controls |
| `--ui-surface-2` | `#20242D` | Raised cards, fields and popovers |
| `--ui-surface-3` | `#292E39` | Hover/neutral active surfaces |
| `--ui-border-subtle` | `#303642` | Decorative separators only |
| `--ui-border-strong` | `#737E8E` | Meaningful control/panel boundary where needed |
| `--ui-text-primary` | `#F3F4F6` | Main text and headings |
| `--ui-text-secondary` | `#BBC2CE` | Supporting text and labels |
| `--ui-text-muted` | `#9099A8` | Secondary metadata; not the sole source of essential instructions |
| `--ui-accent` | `#9A8CFF` | Selected tool, active state, accent outlines |
| `--ui-accent-strong` | `#6455D9` | Solid primary action surface with white label |
| `--ui-accent-tint` | `#29243F` | Selected/active tinted background |
| `--ui-focus` | `#B6ADFF` | Keyboard focus ring |
| `--ui-selection` | `#9A8CFF` | Canvas selection outline/handles, paired with geometry/label |
| `--ui-success` | `#63C9A5` | Saved/completed/success state |
| `--ui-warning` | `#F0BC70` | Caution, storage/recovery warning |
| `--ui-danger` | `#F07D86` | Error/destructive state |
| `--ui-info` | `#79BCEB` | Informational/loading state |
| `--ui-guide` | `#F2B84B` | Canvas guides only; pair line with label or distinct pattern |

**Colour-use rules**

- Keep most of the screen neutral. Use one accent for the current action/selection, not all accents at once.
- Indigo means active/action/focus; teal means positive completion; amber means caution; red means error/destructive; blue means information. Do not swap meanings between panels.
- Selection must include an outline, handles or label; colour is supplementary.
- Focus must be a visible outline, not the same treatment as hover.
- `--ui-border-subtle` is for separators, never the only boundary for a required control.
- Guide gold belongs on the canvas only. It should not be reused as a general warning badge.
- Editor UI tokens must never be mapped into user-site design-token names or exported CSS.

### 3.2 Contrast verification

Ratios below were calculated from the specified sRGB hex pairs using the WCAG relative-luminance method. They are a useful source-token audit, not a declaration that every rendered state of the app conforms.

| Foreground / role | Lowest ratio against listed dark surfaces | Result against threshold |
|---|---:|---|
| Primary text `#F3F4F6` | 12.36:1 | Above 4.5:1 normal-text target |
| Secondary text `#BBC2CE` | 7.59:1 | Above 4.5:1 |
| Muted text `#9099A8` | 4.73:1 | Above 4.5:1, small margin; use sparingly |
| Accent `#9A8CFF` | 4.90:1 | Above 4.5:1 on listed surfaces |
| Focus `#B6ADFF` | 6.74:1 | Above 3:1 non-text target |
| Success `#63C9A5` | 6.75:1 | Above 4.5:1 on listed surfaces |
| Warning `#F0BC70` | 7.86:1 | Above 4.5:1 |
| Danger `#F07D86` | 5.17:1 | Above 4.5:1 |
| Info `#79BCEB` | 6.61:1 | Above 4.5:1 |
| Strong border `#737E8E` | 3.31:1 | Above 3:1 non-text target |
| Guide `#F2B84B` on canvas | 10.38:1 | Strong line contrast; still add label/shape cue |
| White text on primary button `#6455D9` | 5.46:1 | Above 4.5:1 |
| Accent on accent tint | 5.34:1 | Strong distinction |

**Validation still required before a full WCAG claim:** verify actual component pairings (including disabled, hover, opacity, overlay/backdrop and selected states), rendered focus indicators, browser antialiasing, text size/weight, high zoom, forced-colour mode and colour-vision simulations. Ratios alone do not prove WCAG 2.2 AA conformance. Full manual keyboard and screen-reader testing is also required.

### 3.3 Type, spacing, shape and elevation

| Foundation | Rule |
|---|---|
| Typeface | System UI sans stack (Inter only if locally/system available); avoid a remote font dependency for local-first operation. |
| Type ramp | 12 / 14 / 16 / 20 / 24 / 32 px. Default editor body 14 px; essential metadata ≥12 px. |
| Numeric text | Tabular numerals/monospace for X/Y/W/H, percentages, zoom and token values. |
| Spacing | 4 px base: 4 / 8 / 12 / 16 / 24 / 32 px. |
| Control radius | 8 px. |
| Card radius | 12 px. |
| Dialog/sheet radius | 16 px. |
| Elevation | Three levels only: panel, popover/dialog, canvas/page frame. Avoid shadow on every card. |
| Motion | Short, purposeful panel transitions; respect `prefers-reduced-motion`. No looping decorative motion. |
| Icons | Consistent 16–18 px stroke/fill weight; pair unfamiliar icons with visible labels. Use `aria-label` for icon-only controls. |

### 3.4 Component recipes

Build and maintain one shared recipe for: Button, IconButton, SegmentedControl, Field, SearchField, Menu/Popover, Dialog, BottomSheet, Status, LayerRow, InspectorGroup, Toast, EmptyState and SelectionBar.

Each component must define default, hover, active, selected, focus-visible, disabled, loading, error and forced-colour states as applicable. The v2.1 presentation layer is isolated in `styles/editor-experience.css` and loaded after the legacy base stylesheet. Older release-specific component declarations remain in `styles.css` for compatibility; move them into canonical component sections only in separately tested cleanup slices.

---

## 4. Core interaction flows

### 4.1 First-time: blank project to export

1. User chooses **New project** and selects Blank or Starter. Confirm replacement only when an existing project could be lost.
2. Empty page opens with a concise canvas invitation: Add an element or set Page background.
3. User opens `+ Add`; category labels and search show the available building blocks.
4. Selecting an item inserts it into the selected section/container or creates the appropriate first content structure.
5. The inserted node becomes selected; Properties opens in the relevant context. User edits text, size, colour or layout.
6. User switches to Tablet and Mobile; the active breakpoint remains visible. Flow remains the default unless the user explicitly chooses Free position.
7. User selects Export website. Export summary states that a portable ZIP of HTML/CSS/assets is being generated; it is not hosted or published.
8. User retains the editable project in browser storage and can separately download a CanvasFlow backup.

**Acceptance:** a novice can create one page, add a heading and button, style them, inspect mobile, save/reopen and export without using the long Guide.

### 4.2 Routine editing

1. Select a layer from the canvas or Structure.
2. Confirm the selected item name/type and parent in Properties.
3. Change a common property; preview refreshes from normalized project state.
4. Use Undo/Redo to reverse one logical action.
5. Selection and panel state remain stable where possible; selection changes update the contextual inspector.

### 4.3 Responsive editing

1. Choose Desktop, Tablet or Mobile in the canvas toolbar.
2. Read the active viewport label before editing.
3. Change a supported responsive property; write to the active breakpoint override rather than overwriting the base style.
4. Show inherited/base versus explicitly overridden values, and provide a reset-to-inherit affordance where implemented.
5. Check neighbouring breakpoints before export. Do not use editor zoom as a proxy for website viewport size.

### 4.4 Precision positioning

1. Select a supported element/container.
2. In Properties → Layout/Position, choose **Free position** explicitly; Flow is the initial/default mode.
3. Show the parent/reference and breakpoint being edited before exposing coordinates.
4. Transform with handles or numeric X/Y/W/H/rotation; guides and snap indicators provide non-colour geometry cues.
5. A pointer gesture is one history transaction. Escape, pointer cancellation or lost capture restores the pre-gesture model and visual state.
6. Switch breakpoints to check independent overrides. Return to Flow only after reviewing the layout consequences.

### 4.5 Design-system editing

1. Open Design tools → Design system.
2. Edit project tokens (site colours, typography, spacing, radius); preview a sample before saving.
3. Apply token-linked styles intentionally; manual per-element overrides remain separate from shared tokens.
4. Verify exported CSS contains user-site token names/values only, never editor `--ui-*` variables.

### 4.6 Undo, save, dialogs and shortcuts

- **Undo/redo:** Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z (and Ctrl/Cmd+Y if already mapped). Each discrete command is one history entry. A drag/resize/rotate gesture is a single compound transaction, committed on pointer-up and rolled back on Escape/cancel.
- **Autosave:** current app debounces autosave after edits (850 ms). Status moves to Unsaved changes while pending and Saved locally only after successful local persistence. Keep manual Save. Save failure must clearly say Save failed and offer Download backup.
- **Local-first wording:** browser storage is not cloud storage. User-site export is a separate portable ZIP; no hosting/publishing is implied.
- **Dialogs:** native `<dialog>` remains the preferred primitive. On open, focus moves inside; Escape and close button dismiss; backdrop dismissal is supported for non-destructive dialogs; focus returns to the opener. Destructive overwrite/deletion uses explicit confirmation and never silently closes with uncommitted work.
- **Menus:** click, keyboard activation, Escape and outside click dismiss; focus remains predictable. Do not introduce shortcut conflicts with browser defaults.
- **Keyboard:** `/` focuses Layers search only when not typing; `Space+drag` pans where applicable; `Alt` snap bypass; arrow keys nudge selection; existing save/undo/export/fit shortcuts remain discoverable in shortcut help. Shortcuts must not fire inside editable fields.
- **Touch:** ≥44 px main targets; pinch/pan is distinct from element editing; panel sheets scroll internally; orientation change cancels active gesture safely; no destructive action relies on a hover-only affordance.

---

## 5. Implementation map and state boundaries

### 5.1 Preserve the model-first pipeline

`User intent → UI command → validated domain mutation → history transaction → persistence → derived preview/export`

The project model remains authoritative. Preview measurements and iframe bridge events are inputs to geometry operations only after validation; they do not become a second document store.

### 5.2 Existing code ownership

| Existing file | Responsibility in this redesign | What must not happen |
|---|---|---|
| `index.html` | Semantic shell, landmarks, dialogs, stable IDs and control hooks | Do not replace working event IDs without a compatibility map. |
| `styles.css` | Editor UI token source, workspace layout, shared component/state recipes and responsive patterns | Do not let editor tokens leak into generated website CSS. |
| `src/app.js` | UI orchestration, selection projection, dialog/panel state, preview bridge, user commands and notifications | Do not rewrite wholesale; isolate new/changed concerns in tested slices. |
| `src/model.js` | Project normalization, schema migration, generated HTML/CSS, safe content and recursive model operations | Do not add hover/open accordion/focus/temporary panel state to the project model. |
| `src/geometry.js` | Pure coordinate/transform math | No DOM ownership or visual styling. |
| `src/history.js` | History snapshots and transaction boundaries | Do not split one gesture into many undo steps. |
| `src/project-storage.js` | Browser persistence and recovery | Save UI must consume this boundary rather than duplicating localStorage logic. |
| `src/zip.js` | Backup/export packaging | Editor chrome and guides must not be included in site ZIP. |

### 5.3 State domains

| Domain | Examples | Persistence / undo |
|---|---|---|
| Document/project | Pages, sections, nodes, components, assets, design tokens, responsive site overrides | Persisted; model mutations use history where appropriate. |
| Existing page precision settings | Project's current page-scoped guide/grid/snap settings under the existing v12 model | Preserve their existing v12 behavior; do not migrate solely for UI redesign. |
| Editor/workspace | Active page selection, active inspector panel, layer query, expanded inspector groups, editor camera/zoom, selected item(s) | UI-local unless already intentionally project-scoped. Not emitted to website. |
| Ephemeral | Hover, focus, open popover, toast, pointer gesture, temporary selection handles | Never serialized. |
| Editor theme | Current dark appearance preference | Separate from project site tokens and export. |

### 5.4 Incremental command boundary

Do not convert every existing listener at once. For new or reworked operations, document: preconditions, selection requirements, document/editor/ephemeral state impact, undo boundary, normalization, preview refresh and accessible name/keyboard path. Preserve `data-*` actions and current IDs until each related feature slice has regression coverage.

### 5.5 Preview safety and export isolation

- Keep the iframe sandbox as-is (`allow-scripts` only in the current preview contract).
- Validate bridge messages against allowlisted action names, known node IDs, parent, breakpoint, bounds, lock state and active gesture token.
- Export only project-derived site HTML/CSS/assets and narrowly scoped supported runtime already defined by the product.
- Test explicitly that `--ui-*`, `.app-shell`, inspector, dialog, guide, grid and selection styles are absent from generated website output.

---

## 6. Prioritized delivery plan

The supplied plan's five phases are retained. This table distinguishes implementation already present in v2.1.0 from validation work still outstanding.

| Phase / release | User-facing outcome | Implementation tasks | Dependencies / risks | Testable exit criteria | Status |
|---|---|---|---|---|---|
| **0 — Audit & baseline** | No feature regression or unexplained navigation loss | Inventory visible controls and IDs; map task/frequency/selection context; baseline schema/export tests; identify CSS token debt | Requires the v2.0.2 source and QA notes. Screenshot/task timing baseline still needs real-user capture. | All actions mapped; existing test suite passes; CSS roots/overrides inventoried; desktop/tablet/mobile baseline recorded. | Source/test audit completed; real user and screenshot baseline pending. |
| **1 — Visual foundation** | A consistent, calm editor with clear semantic states | Consolidate to one canonical semantic `:root`; add focus, selected, status, forced-colour and reduced-motion recipes; preserve legacy aliases while migrating components | Risk of broad CSS specificity regressions; contrast must be checked per rendered pairing. | Single canonical token source; no editor token in export; core text/control contrast and focus verified; reference state gallery/manual snapshots approved. | Core semantic tokens and UI recipes implemented. Reference gallery and full rendered audit still pending. |
| **2 — Workspace architecture** | Clear Structure / Add / Canvas / Properties boundaries and usable tablet/mobile patterns | Searchable Add dialog; stable Structure and Properties entry points; layer search; collapsible inspector sections; tablet drawers and mobile bottom sheets; empty and preview status states | Dialog and drawer focus, scroll and stacking may vary by browser; preserve existing handlers and iframe layout. | Common task ≤2 navigation layers; no three-column mobile; ≥44 px touch targets; Escape/backdrop/focus-return works; no clipped controls. | Implemented in v2.1.0; real-browser/touch verification pending. |
| **3 — Guided workflows** | First-time user can reach first content and export without a long tour | Empty states, contextual instructions, save/recovery and export summary; surface Assets/Components/Tokens at point of need; keyboard help | Avoid modal tutorial overload; save failure and recovery must be tested with storage quota errors. | 90% task completion in moderated test; recovery path clear; no false Saved state; export ownership clear. | Empty canvas, preview status and existing guide/project status integrated; usability testing pending. |
| **4 — Stabilize / release** | Reliable release across browsers and devices | Fresh extraction, regression, migration, save/reopen, backup, multi-page export; manual Chrome/Firefox/Android and iOS where available; release notes and rollback | Automated tests do not prove pointer, focus, touch or visual usability. Current environment blocks successful headless Chromium navigation. | All automated gates pass; manual checklist completed on named browsers/devices; zero critical/high issues unresolved or explicit documented exceptions. | Automated gates pass 104/104; manual browser/device validation remains open. |

### Essential scope for v2.1

- Semantic editor tokens and stable component styling.
- Structure vs Add separation and searchable insertion.
- Contextual inspector with stable disclosure groups.
- Clear canvas controls and active breakpoint visibility.
- Dedicated medium and narrow interaction patterns.
- Save/recovery/preview/empty states.
- Keyboard and touch accessibility foundations.
- Export/model isolation and regression QA.

### Deferred / optional

- Light theme (semantic architecture supports it, but it multiplies visual QA).
- Recent/favourite Add tools (only after task testing).
- Dedicated component state-gallery route or Storybook-like system (useful when component count grows; not a release blocker).
- Broad modular rewrite of `app.js` (defer; only extract modules where a change needs it).
- Cloud accounts, collaboration, publishing/hosting, marketplace, AI generation, arbitrary JS/CSS and unrelated project features (explicitly out of scope).

### Risks and mitigations

| Risk | Mitigation |
|---|---|
| Existing app handlers depend on IDs and DOM placement | Preserve IDs and action data attributes; test every moved action. |
| Add dialog hides advanced tools | Search all existing insert/vector tools; empty-search state; user-test findability. |
| Drawer/sheet causes focus loss | Restore focus to the correct opener on Escape, backdrop and close; use keyboard/device manual QA. |
| CSS cleanup changes editor or generated site | Keep editor tokens in `styles.css`; add generated CSS leakage assertions. |
| Mutating project state for UI conveniences | Keep panel/search/disclosure state outside model; schema remains v12. |
| Responsive mobile feels like a squeezed desktop | Use canvas-first + sheets + bottom navigation; test actual touch device. |
| Contrast looks good only in token table | Audit actual rendered pairings including states, opacity and forced colors. |

---

## 7. Validation and release QA

### 7.1 Usability test plan

Run 5–8 moderated sessions in the first round, including at least 3 novice visual-builder users and 2 experienced web/design users. Include touch-oriented users if the Android path is a target use case. This is a formative sample, not a statistically representative study.

**Tasks**

1. Create a blank project and add a heading, paragraph and button.
2. Find a particular layer in a nested structure and rename/select it.
3. Change typography and a project colour token.
4. Preview Mobile and identify which breakpoint is active; make one responsive change.
5. Change one supported element to Free position, place it precisely, then undo.
6. Save, reload/reopen the project and confirm the changes remain.
7. Export a multi-page site and identify the files in the ZIP.

**Directional targets (compare with a measured baseline; not achieved claims)**

- Median time to first visible content: improve by ≥25%.
- ≥90% complete insert → edit → export without moderator intervention.
- ≥85% find a requested common capability within 20 seconds.
- All participants correctly identify the active breakpoint before making a responsive edit.
- 100% of tested cancelled gestures leave no persistent unintended mutation.
- No critical accessibility or data-loss issue.
- Startup, selection-to-preview and export latency do not regress >10% from baseline without an agreed reason.

Record task success, time, misclicks, backtracking, assistance, confidence rating and participant comments. Avoid leading questions such as “Do you like the new design?”; ask what they expected and what they would do next.

### 7.2 Automated checks

Current v2.1.0 automated status:

- `npm run check` — passed (Node syntax checks for server and source modules).
- `npm test` — 104 passed, 0 failed.
- Schema v12 and storage identity unchanged; imports and prior schema migrations remain covered by existing tests.
- New tests cover canonical editor token source, Add/Structure/Properties UI structure, editor tokens not leaking into generated site output, and current version wiring.

Automated tests do **not** prove pointer feel, visual hierarchy, real focus traversal, screen-reader announcements, touch gestures, layout at physical pixel density, or user findability.

### 7.3 Browser/device matrix

Test at CSS widths **320, 375, 768, 1024, 1366 and 1920 px**. Minimum browser matrix:

- Chrome desktop (current stable at test time).
- Firefox desktop (current stable).
- Chrome on Android (real device, not only emulator if available).
- Safari on iOS if available.

Record device model, OS, browser version, tester, date, evidence and pass/fail. Current execution environment did not complete headless Chromium navigation (local navigation was blocked/hung); therefore browser-driven interaction and physical Android/iOS tests are **not verified** by this build.

### 7.4 Manual QA checklist

**Visual / responsive**

- [ ] Check 320/375 px widths: no unintended horizontal page overflow; Add, viewport and Export remain reachable.
- [ ] Check 768/1024 px widths: side drawers do not cover all usable canvas; backdrop closes; both panels do not remain open together.
- [ ] Check 1366/1920 px: persistent three-column workspace and canvas priority are balanced.
- [ ] Check long project names, 20 pages, deep nested layers, long labels, empty pages and many inspector fields.
- [ ] Verify focus ring, selected, hover, disabled, loading, error and saved states at actual rendered size.

**Structure / Add / inspector**

- [ ] Add every existing content/layout/media/graphics/vector action; confirm exact insertion/drawing behavior.
- [ ] Search Add by partial terms, case variants and no-result query; clear and retry.
- [ ] Search nested layers; verify ancestor context; `/` does not fire while typing; Escape clear/dismiss behavior is correct.
- [ ] Collapse/expand inspector groups and change selections; confirm state is stable and no document dirty flag is triggered solely by disclosure.
- [ ] Test no selection, one selection, multi-selection, locked and hidden selection states.

**Canvas / responsive / precision**

- [ ] Confirm viewport width and editor zoom are independent.
- [ ] Switch Desktop/Tablet/Mobile and inspect inherited/overridden values.
- [ ] Exercise Flow and explicit Free-position on supported elements.
- [ ] Exercise select, pan, zoom, Fit, centre, resize, rotate, guides, rulers, grid and snap.
- [ ] Escape/pointer-cancel during drag, resize and rotation; confirm transaction rollback.
- [ ] Test touch pinch/pan, single-finger edit, orientation change and interrupted pointer capture.

**Save / recovery / export**

- [ ] Autosave after edit; verify Unsaved → Saved locally only after storage success.
- [ ] Simulate unavailable/full browser storage; verify Save failed and backup instruction.
- [ ] Reload/reopen current project; import older backup; verify migration without loss.
- [ ] Test corrupted newest save recovery and notice clarity.
- [ ] Export a blank, simple, deeply nested and multi-page project with image assets, vectors, components and interactions.
- [ ] Inspect extracted HTML/CSS/assets; confirm no editor shell, `--ui-*` tokens, guides, rulers or handles leak into the site.
- [ ] Confirm export remains a portable website package and is not hosted or published.

**Accessibility / input**

- [ ] Complete the core flow using keyboard only.
- [ ] Verify focus visible and returned to opener after menu/dialog/sheet dismissal.
- [ ] Verify meaningful names/roles/state for tree rows, dialogs, toolbar groups, status and selection.
- [ ] Test 200% browser zoom and enlarged text without clipped critical controls.
- [ ] Test prefers-reduced-motion and forced-colour mode.
- [ ] Run screen-reader spot checks (NVDA/Firefox or NVDA/Chrome; TalkBack/Android; VoiceOver/Safari if available).
- [ ] Confirm touch targets ≥44 CSS px and gestures have non-gesture alternatives.

### 7.5 Release decision

Do not call v2.1 visually/accessibly complete until manual browser/device checks and at least one formative usability round are recorded. If a test is blocked, mark it **Not verified / Blocked**, not Passed. Critical data-loss, project corruption, export corruption, keyboard trap, or inaccessible primary action is a release blocker.

---

## 8. Assumptions and open decisions

1. **Theme:** dark-only is the v2.1 implementation decision; should light mode be a separate follow-up after the semantic system stabilizes?
2. **Tablet threshold:** current CSS uses an approximate 1100 px cutover; usability testing may justify moving it based on actual panel and canvas minimum widths.
3. **Inspector tabs:** current v2.1 retains a single inspector with collapsible groups. Add a Design/Prototype tab only if testing shows clear separation is needed; motion is already contextual.
4. **Recent/favourite Add tools:** defer until search and category findability are measured.
5. **Editor-state persistence:** panel visibility, search, open inspector groups and camera are not added to project serialization. Decide separately if users need workspace restoration across browser restarts.
6. **Screenshot baseline:** the supplied plan did not include a captured state gallery or user task-time baseline. Capture them on supported browsers before claiming the proposed 25% improvement.
7. **Browser verification:** this build's automated tests pass, but local headless Chromium was blocked/hung in the execution environment. A real local browser/device session is still required.

---

## 9. Recommended first sprint

**Sprint objective:** prove that users can find the next action and complete a simple responsive page without learning the entire feature catalogue, while preserving all v2.0.2 behaviour.

1. **Capture a real baseline:** screenshots at 1366, 1024 and 375 px; run three short tasks (Add a heading, find a layer, switch to Mobile and export) with 5 users if available. Record time, misclicks and confusion.
2. **Finish the visual foundation audit:** inspect every actual text/control pairing and all focus/selected/error states against the semantic token system. Replace any hard-coded exceptions that fail; do not bulk-rewrite every legacy selector at once.
3. **Validate Structure vs Add:** observe users locating Page settings, a nested layer, a Container, an Image and a Vector tool. Keep Add search and ancestor-preserving layer search if users succeed; revise categories if findability is poor.
4. **Validate the responsive workspace on an Android device:** open Structure and Properties sheets, add an element, close by backdrop/Escape, rotate the device, pinch/zoom the canvas and confirm the bottom navigation never obscures the only route to Save/Export.
5. **Run a save/reopen/export regression:** use a multi-page schema-v12 project with nested containers, assets, components, responsive overrides and one Free-position item. Save, reload, reopen, backup, import and export; compare project and generated site output.
6. **Close only verified blockers:** record screenshots, browser/device versions, test results and any remaining issue. Do not bundle light theme, user accounts, cloud features or a broad `app.js` rewrite into this sprint.

**Sprint exit:** novice task completion ≥90% in the small observed cohort, common feature findability ≥85% within 20 seconds, no critical accessibility/data-loss/export issue, and all manual browser/touch checks either passed or explicitly recorded as blocked with owner and follow-up.
