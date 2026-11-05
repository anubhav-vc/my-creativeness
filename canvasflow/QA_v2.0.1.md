# CanvasFlow v2.0.1 — Product Interface & Feature Discovery QA

## Release intent

This update refreshes the **CanvasFlow application interface itself**—the editor shell, tool/action hierarchy, and how users discover features. It does not alter the appearance, layout, content model, or styling of websites created inside CanvasFlow. The project schema remains v12.

## Interface changes

- Updated the product visual system with deeper blue-charcoal surfaces, a restrained violet/mint accent palette, clearer surface contrast, more consistent radii and controls, and improved panel hierarchy.
- Added short descriptions to the Structure and Properties panels so users can understand the purpose of each workspace area at a glance.
- Grouped Design system, Asset library, and Components into a **Design tools** menu.
- Grouped New project, Open saved project, Backup, and Import into a **Project** menu.
- Kept **Save** and **Export website** visible as prominent, separate actions. Existing command IDs and event handlers are preserved.
- Added an on-demand **Guide** dialog. It introduces a four-step Structure → Design → Refine → Export workflow, presents the Asset library, Components, Precision canvas, shortcuts and local-first ownership benefits, and provides direct actions into the existing controls.
- Guide does not auto-open; returning users are not interrupted. Feature actions close the dialog before activating the destination control.
- Action menus close after a command is selected or after an outside click.
- Responsive styling covers desktop, tablet, and mobile guide layouts; reduced-motion preferences are respected.

## Automated verification

| Check | Result |
|---|---:|
| `npm run check` | Passed |
| `npm test` | **101/101 passed** |
| HTML IDs | 80 unique; 0 duplicates |
| Local HTML references | 2 checked; 0 missing |
| CSS parser | 759 top-level rules; 0 nested parse errors |
| Existing v2.0 regression suite | Passed |
| New v2.0.1 interface/guide regression | Passed |
| Project schema | Unchanged at v12 |
| Export model | Unchanged; user website generation remains separate from editor UI styling |

## Manual browser checks still required

- Open the application in current Chrome and Edge at common desktop widths (1440, 1280, 1024) and check the top action menus for clipping or overlap.
- Keyboard-open both action menus, tab through their items, press Escape, select each command, and verify the menu dismisses.
- Open the Guide and test each workflow action (New project, Design system, Tablet preview, Export) and each feature action (Assets, Components, Guides, shortcuts).
- At 740 px, 390 px and 320 px widths, verify that the guide scrolls vertically without horizontal overflow and that top actions remain reachable.
- Test touch interaction on a physical Android device.
- Perform a real Save, Backup, Import, and website ZIP export from the updated UI.

Headless Chromium screenshot capture did not complete in this execution environment. Consequently interactive visual rendering across browsers and physical Android is not marked as passed. Syntax, automated regression, HTML structure, CSS parsing, and local-server checks passed.
