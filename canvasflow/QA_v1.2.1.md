# CanvasFlow v1.2.1 — Blank Page Update

## Release summary

This release adds a genuine blank-page starting option while preserving the existing starter website. A blank project contains zero sections and zero elements. Page-level settings let the user change the page name, browser title, and background colour. The background is stored in the existing project model, appears across the full exported page, and is retained when a project is normalized or backed up.

When the user inserts the first normal element or image into a blank project, CanvasFlow creates a content section using the current page background colour. Users can also add a section directly. The project schema remains v7; older project backups without a page background default safely to white.

## Implemented

- **New project chooser:** `＋ New` opens a chooser with Blank page and Starter website options. The existing starter experience remains available.
- **Blank model:** `createBlankProject()` creates a valid project whose page has `sections: []` and a white `#ffffff` background.
- **Page inspector:** page name, browser title, a colour picker, and five quick background swatches (white, lavender, soft grey, midnight, warm ivory).
- **Accessible starting point:** the page card opens Page settings; the empty layer panel explains how to begin and links to page settings.
- **First content insertion:** adding a heading, paragraph, button, shape, or image creates the first section with the page's current background.
- **Persistence and export:** the selected background survives project normalization and is emitted on `body` and `.cf-page`; `.cf-page` has `min-height: 100vh` so an empty page fills the viewport.
- **Compatibility:** no schema bump; imported v1–v7 projects without `page.backgroundColor` default to white.
- **Responsive UI:** the page settings entry remains available on narrow/mobile editor layouts.

## Verification performed

| Check | Result |
|---|---|
| `npm run check` | Passed |
| `npm test` | 46 passed, 0 failed |
| Blank model has zero sections | Covered by automated test |
| Safe page background normalization | Covered by automated test |
| Blank HTML contains no `<section>` elements | Covered by automated test |
| Full-height exported blank page uses selected background | Covered by automated test |
| First section inherits page background | Covered by automated test |
| New-project chooser and Page settings controls are wired in editor source | Covered by automated test |
| Local server `GET /` | HTTP 200 |
| Source and sample ZIP integrity | Verified with ZIP CRC/integrity check |

## Manual checks still required

The environment blocked headless Chromium navigation to the local server with `ERR_BLOCKED_BY_ADMINISTRATOR`. Accordingly, this report does **not** claim a full real-browser interaction pass. On a normal Chrome or Edge installation, please manually verify:

1. Click **＋ New** and choose **Blank page**. Confirm there are no preloaded sections or elements.
2. Open **Page settings** from the page card. Change the background using both the colour picker and quick swatches.
3. Refresh the editor, then close and reopen it. Confirm the page and its background remain saved in browser storage.
4. Add a heading and an image to the blank page. Confirm the first content section is created and that the page remains editable.
5. Export the untouched blank page and open its `index.html`. Confirm the visible page background fills the viewport.
6. Export a page after adding content and confirm the selected background is retained.
7. Recheck the v1.2.0 motion preview, viewport triggers, and reduced-motion behavior in a real browser.

## Known limits

- The blank page begins white; users can choose any supported six-digit hex colour through the colour control. The editor does not yet include gradients or background images at page level.
- Page-level background controls set the page background. Existing section backgrounds remain independent and may visually cover it where sections exist.
- This is a local-first visual editor. This release does not add cloud sync, accounts, hosted publishing, or collaboration.
- No GitHub publication was performed as part of this release.

## Local verification commands

```bash
npm run check
npm test
npm start
```

Node.js 22 or newer is specified by the project. The application has no runtime npm dependencies to install.
