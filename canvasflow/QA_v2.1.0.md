# CanvasFlow v2.1.0 — QA and Release Verification

**Release:** Workspace & Design System  
**Baseline:** v2.0.2  
**Project schema:** v12 (unchanged)  
**Manual browser/device status:** Not verified in this environment

## 1. Automated test results

- `npm run check` — **PASS**. Node syntax checks for `server.mjs`, `src/model.js`, `src/geometry.js`, `src/history.js`, `src/zip.js`, `src/project-storage.js` and `src/app.js`.
- `npm test` — **PASS: 104 passed, 0 failed**.
- The final packaged ZIP was extracted into a clean directory and both commands were rerun there: **104/104 tests passed**.
- The existing model, migration, component, vector, layout, history, persistence, export and local-server regression tests remain in the suite.
- v2.1 tests cover the versioned editor shell, canonical semantic editor token source, Add dialog, Structure/Properties responsive workspace hooks, contextual inspector groups, schema/storage identity preservation, and editor-token isolation from generated site CSS.

## 2. Source and structural audit

- `index.html`: **101 unique IDs; 0 duplicate IDs**.
- Local script and stylesheet references: **2 checked; 0 missing**.
- Editor CSS: one canonical `:root` token block in `styles.css`; presentation-only workspace rules are in `styles/editor-experience.css` (zero token-root duplication).
- HTML: 101 unique IDs, 0 duplicates; `src/app.js`, `styles.css` and `styles/editor-experience.css` all resolve locally (3/3).
- CSS parsing: `styles.css` — 1,185 rules, 0 errors; `styles/editor-experience.css` — 327 rules, 0 errors (1,512 total rules) (including nested at-rules/declarations).
- Project schema and local storage key: remain v12; no migration introduced.
- Preview iframe: remains sandboxed with `allow-scripts`; no sandbox permission expansion.
- Editor UI state (panel visibility, search query and inspector disclosure state) is not written into the website project model.

## 3. CSS and contrast checks

A `tinycss2` parser audit traversed **1,477 stylesheet rules** (35 at-rules and 1,442 qualified rules), including nested media/supports rule content: **0 parser/declaration errors**. This is a syntax audit, not a visual browser audit.

Calculated contrast examples for the semantic token set (sRGB relative luminance):

| Pairing | Ratio | Reference threshold |
|---|---:|---:|
| Primary text on darkest canvas | 16.88:1 | 4.5:1 normal text |
| Secondary text on raised surface 3 | 7.59:1 | 4.5:1 normal text |
| Muted text on raised surface 3 | 4.73:1 | 4.5:1 normal text |
| Accent on raised surface 3 | 4.90:1 | 4.5:1 if used as text |
| Focus colour on raised surface 3 | 6.74:1 | 3:1 non-text focus indicator |
| Strong border on raised surface 3 | 3.31:1 | 3:1 meaningful non-text boundary |
| White text on primary button | 5.46:1 | 4.5:1 normal text |
| Guide line on canvas | 10.38:1 | Supplement with label/shape cue |

These calculations verify selected exact hex pairings only. They do **not** establish full WCAG 2.2 AA conformance. Actual hover/disabled/opacity/overlay pairings, component geometry, rendered focus, high zoom, forced-colour, screen-reader and colour-vision checks still require browser validation.

## 4. Local-server smoke test

The working release was smoke-tested locally with:

- `GET /` → **200**, `text/html; charset=utf-8`.
- `GET /styles.css` → **200**, `text/css; charset=utf-8`.
- `GET /src/app.js` → **200**, `text/javascript; charset=utf-8`.
- `HEAD /styles.css` → **200**, correct MIME and content length.
- `POST /` → **405**.
- Encoded path traversal attempt → **403**.

(The project's automated local-server integration test also exercises MIME, HEAD, rejected write and traversal behavior.)

## 5. Manual testing — outstanding release gate

Local headless Chromium navigation could not be completed successfully in this execution environment (browser startup/navigation blocked or hung). Therefore the following are **NOT VERIFIED**, not Passed:

- Chrome desktop and Firefox desktop visual and interaction checks.
- Chrome on a physical Android device; pinch/pan, sheets, orientation changes and ≥44 px touch target checks.
- Safari/iOS if available.
- Dialog/menu focus entry and restoration using keyboard and screen reader.
- Real-world layer search, Add findability, inspector disclosure behaviour and responsive panel usability.
- Full save/reopen, storage failure, backup/import and multi-page export through actual browser UI.

Use the manual checklist in `EDITOR_EXPERIENCE_SPEC_v2.1.md`, section 7.4. Record device/browser versions, tester, date, pass/fail and evidence. Do not mark blocked tests as passed.

## 6. Release conclusion

**Automated gate: PASS.** Source checks, 104 automated tests, structural checks, schema invariance and editor/site styling separation pass.

**Full experience release gate: OPEN.** Real-browser, physical-touch, screen-reader and moderated usability validation remain required before claiming v2.1 experience quality is fully verified.
