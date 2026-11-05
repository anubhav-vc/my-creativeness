# CanvasFlow v1.3.0 — QA & Debug Assurance Report

## Release scope

v1.3.0 delivers the roadmap's Design Systems milestone on top of the supplied v1.2.1 codebase. It adds project-level style tokens, a custom/preset token editor, and insertable semantic section components. The existing schema remains v7 to preserve backup compatibility.

## Implemented

- Design tokens: primary, text, muted, surface, border and page colours; heading/body font families and weights; small/medium/large radius; section padding and element gap; content and wide widths.
- Presets: Studio, Ocean, Forest, Ember, Mono and Editorial.
- Draft-safe preset selection: selecting a preset updates the dialog fields only. The project is mutated only after Save design system; Cancel closes the dialog without committing the draft.
- Export parity: tokens are emitted to `styles.css` as `--cf-*` custom properties. Legacy page/section/node styles matching v1.2.1 defaults are linked once; manually customised styles keep their literal values.
- New content inherits the current design system for headings, paragraphs, buttons, cards and dividers.
- Reusable section presets: Navigation bar, Hero section, Feature grid, Call to action and Site footer. Navigation and footer export as semantic `nav` and `footer` elements.
- Component kind values, colors, font keys, font weights and numeric token ranges are normalized through allow-lists and bounds.
- Old schema v1–v7 projects import with default design tokens when no designSystem object exists.

## Automated verification

| Check | Result |
|---|---|
| `npm run check` | Passed |
| `npm test` | 52 passed, 0 failed |
| Legacy project receives default tokens | Automated test passed |
| Invalid colors/fonts/weights/numeric values are bounded | Automated test passed |
| CSS custom properties are emitted | Automated test passed |
| Token-linked default node styles reference CSS variables | Automated test passed |
| Newly inserted elements inherit tokens | Automated test passed |
| Semantic nav/footer component HTML is generated | Automated test passed |
| Invalid component metadata is discarded | Automated test passed |
| Legacy styles are linked once, then same-value manual overrides remain detached | Automated test passed |
| Design System dialog/preset/component controls are wired | Automated test passed |

## Manual browser checklist still required

The current environment has not completed a full Chrome/Edge interaction session for this release. Before relying on the release, verify:

1. Open **Design system**, load each of the six palettes, and inspect all token fields.
2. Load a preset and Cancel. Make another edit and save; confirm the cancelled palette did not leak into the project.
3. Load a preset, save it, refresh the page, then reopen Design system. Confirm the token values persisted.
4. In a starter project, change the primary/text/surface/border colors and fonts. Confirm styles linked to the built-in defaults update in the live preview.
5. Manually customise one button or card colour, then change the shared tokens. Confirm that custom value remains unchanged.
6. Add a heading, paragraph, button, card, and divider after changing tokens. Confirm the new elements inherit the active values.
7. Add Navigation bar, Hero section, Feature grid, CTA, and Site footer. Check ordering, selection, editing, duplication, deletion and responsive preview behavior.
8. Export the site. Inspect `styles.css` for `--cf-*` variables and `index.html` for semantic `<nav>` and `<footer>` elements. Open the exported site at desktop and mobile widths.
9. Download a `.canvasflow.json` backup, refresh, and re-import it. Confirm the design system and components survive.
10. Import an older v1.2.1 backup. Confirm it receives the default token set and opens without errors.
11. Manually set an element colour back to the original default colour, then change the project token again. Confirm the manually edited property stays detached.

## Known limitations

- Section presets are reusable starting components, not linked instances. Editing one does not automatically update other sections.
- Navigation links begin with placeholder destinations (`#top`, `#about`, `#contact`). Update them and the matching section anchor IDs for your actual site.
- Token linking is explicit: legacy values that match known v1.2.1 defaults are assigned token roles once during migration. Inspector edits detach only the edited property (including page and section backgrounds), even when the selected value happens to equal the original token value.
- The current project remains a single-page site. Multi-page routing, a synced global component library, and advanced asset management remain later milestones.
- Full real-browser interaction and accessibility audits remain outstanding; automated model/export tests do not prove every visual interaction.

## Local verification

```bash
npm run check
npm test
npm start
```

Node.js 22 or newer is specified by the project. There are no runtime npm dependencies to install.
