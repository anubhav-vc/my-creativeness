import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import {
  collectExportAssets, createBlankProject, createBlankSection, createElementNode, createSection, createStarterProject, decodeImageDataUrl,
  duplicateNode, duplicateSection, escapeHtml, findNode, generateCss, generateHtml, generatePreviewDocument, groupOverlayNodes, moveNode, moveSection, reorderNode, reorderOverlayLayer, reorderSection,
  generateVectorSvg, getTypographyScale, normalizeHref, normalizeProject, sanitizeSvgDataUrl, applyDesignTokensToNode, createComponentDefinition, resolveComponentInstance, removeNode, removeSection, ungroupOverlayNodes, vectorPathData
} from '../src/model.js';
import { HistoryManager } from '../src/history.js';
import { createZipBytes } from '../src/zip.js';
import { loadFirstValidProject, writeProjectSaves } from '../src/project-storage.js';
import { CANVAS_ZOOM_LEVELS, normalizeFreePositioning, resolveFreePositioning, pointerToDocumentPoint, resizeRectFromHandle, snapCoordinate, alignRects, distributeRects } from '../src/geometry.js';

const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=';

test('starter project is a realistic multi-section site using semantic elements', () => {
  const project = createStarterProject();
  assert.equal(project.schemaVersion, 12);
  assert.equal(project.page.sections.length, 3);
  assert.deepEqual(project.page.sections[0].children.map((node) => node.type), ['heading', 'paragraph', 'button']);
  assert.equal(project.page.sections[1].layout, 'grid');
  assert.equal(project.page.sections[1].children.filter((node) => node.type === 'card').length, 3);
});


test('blank projects are truly empty and preserve a safe page background through preview and export', () => {
  const blank = createBlankProject();
  assert.equal(blank.page.sections.length, 0);
  assert.equal(blank.page.backgroundColor, '#ffffff');
  assert.equal(blank.page.designTokens.backgroundColor, 'page');
  blank.page.backgroundColor = '#e9edff';
  delete blank.page.designTokens.backgroundColor;
  const normalized = normalizeProject(blank);
  assert.equal(normalized.page.sections.length, 0);
  assert.equal(normalized.page.backgroundColor, '#e9edff');
  const html = generateHtml(normalized);
  const css = generateCss(normalized);
  assert.match(html, /<main class="cf-page">\s*<\/main>/);
  assert.equal((html.match(/<section\b/g) || []).length, 0);
  assert.match(css, /body \{[^}]*background: #e9edff/);
  assert.match(css, /\.cf-page \{[^}]*min-height: 100vh;[^}]*background-color: #e9edff/);
  const preview = generatePreviewDocument(normalized, null, 'desktop');
  assert.match(preview, /background: #e9edff/);
  const legacy = normalizeProject({ schemaVersion: 7, id: 'old-empty', name: 'Old blank', page: { id: 'page-home', name: 'Home page', title: 'Old blank', sections: [] } });
  assert.equal(legacy.page.backgroundColor, '#ffffff');
});

test('first content section can be created with the page background colour', () => {
  const blank = createBlankProject();
  const section = createBlankSection(0, '#123456');
  assert.equal(section.children.length, 0);
  assert.equal(section.backgroundColor, '#123456');
  section.children.push(createElementNode('heading', section.anchor));
  blank.page.sections.push(section);
  const normalized = normalizeProject(blank);
  assert.equal(normalized.page.sections.length, 1);
  assert.equal(normalized.page.sections[0].backgroundColor, '#123456');
  assert.equal(normalized.page.sections[0].children[0].type, 'heading');
});

test('new-project and page-background controls are connected in the editor UI', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(html, /id="newProjectBtn"/);
  assert.match(html, /data-new-project="blank"/);
  assert.match(html, /data-new-project="starter"/);
  assert.match(html, /id="pageSettingsBtn"/);
  assert.match(appSource, /function renderPageInspector\(\)/);
  assert.match(appSource, /pageBackgroundColor/);
  assert.match(appSource, /function createNewProject\(kind\)/);
  assert.match(appSource, /createBlankProject\(\)/);
});

test('HTML is semantic and linked to an external stylesheet', () => {
  const html = generateHtml(createStarterProject());
  assert.match(html, /<h1\b/);
  assert.match(html, /<h2\b/);
  assert.match(html, /<p\b/);
  assert.match(html, /<article\b[^>]*class="cf-card/);
  assert.match(html, /<a\b[^>]*class="cf-button/);
  assert.match(html, /href="styles\.css"/);
  assert.equal((html.match(/name="description"/g) || []).length, 1, 'export has one description meta tag');
  assert.doesNotMatch(html, /<script\b/i);
});

test('CSS includes responsive Grid/Flex layouts, motion presets, and reduced-motion support', () => {
  const css = generateCss(createStarterProject());
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /display: flex/);
  assert.match(css, /display: grid/);
  assert.match(css, /@keyframes cf-fade-in/);
  assert.match(css, /@keyframes cf-rise-in/);
  assert.match(css, /@keyframes cf-slide-left/);
  assert.match(css, /@keyframes cf-slide-right/);
  assert.match(css, /@keyframes cf-zoom-in/);
  assert.match(css, /@keyframes cf-blur-in/);
});

test('user content is escaped, never interpreted as markup', () => {
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  const project = createStarterProject();
  project.page.sections[0].children[0].text = '<script>alert("x")</script>';
  const html = generateHtml(normalizeProject(project));
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
});


test('image focal points are normalized, exported, and supported by breakpoint overrides', () => {
  const project = createStarterProject();
  const image = createElementNode('image', 'hero');
  image.src = TINY_PNG;
  image.objectPosition = '0% 0%';
  image.responsive = { mobile: { objectPosition: '100% 100%' }, tablet: { objectPosition: 'left; } body { display:none' } };
  project.page.sections[0].children.push(image);
  const normalized = normalizeProject(project);
  const savedImage = findNode(normalized, image.id).node;
  assert.equal(savedImage.objectPosition, '0% 0%');
  assert.deepEqual(savedImage.responsive, { mobile: { objectPosition: '100% 100%' } });
  const css = generateCss(normalized);
  assert.match(css, new RegExp(`\\.node-${image.id} \\{[^}]*object-position: 0% 0%`));
  assert.match(css, new RegExp(`\\.node-${image.id} \\{ object-position: 100% 100%`));
  assert.doesNotMatch(css, /display:none/);
});

test('editor exposes bounded custom viewport, fit-to-canvas, guides, and object focal-point controls', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const modelSource = await readFile(new URL('../src/model.js', import.meta.url), 'utf8');
  assert.match(html, /id="customWidthInput"[^>]*min="320"[^>]*max="1920"/);
  assert.match(html, /id="fitCanvasBtn"/);
  assert.match(html, /id="guidesBtn"/);
  assert.match(html, /id="gridBtn"/);
  assert.match(html, /id="rulersBtn"/);
  assert.match(html, /shortcuts-panel/);
  assert.match(appSource, /function focalPointPicker/);
  assert.match(appSource, /data-focal-point/);
  assert.match(appSource, /function changeLayerOrder/);
  assert.match(html, /Alt\+Shift/);
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(css, /mobile-stage \.frame-wrap \{ width: 402px/);
  assert.match(css, /mobile-stage #sitePreview \{ width: 402px/);
  assert.match(appSource, /function applyCustomPreviewWidth\(\)/);
  assert.match(appSource, /Math\.min\(1920, raw\)/);
  assert.match(appSource, /function applyFitToCanvas\(\)/);
  assert.match(appSource, /showGuides, selectedIds, userGuides/);
  assert.match(appSource, /Focal point/);
  assert.match(modelSource, /object-position: \$\{node\.objectPosition/);
});

test('project imports support schema 1 through 12 while sanitizing property values', () => {
  const project = createStarterProject();
  project.schemaVersion = 1;
  project.page.sections[0].backgroundColor = 'red; } body { display:none';
  project.page.sections[0].paddingY = 100000;
  delete project.page.sections[0].layout;
  const normalized = normalizeProject(project);
  assert.equal(normalized.schemaVersion, 12);
  assert.equal(normalized.page.sections[0].backgroundColor, '#ffffff');
  assert.equal(normalized.page.sections[0].paddingY, 200);
  assert.equal(normalized.page.sections[0].layout, 'stack');
  assert.throws(() => normalizeProject({ schemaVersion: 99 }), /not a supported CanvasFlow project/);
});

test('v2.0 migrates schema v9 sections to safe layout-engine defaults without losing content', () => {
  const legacy = createStarterProject();
  legacy.schemaVersion = 9;
  for (const section of legacy.page.sections) {
    delete section.flexDirection;
    delete section.flexWrap;
    delete section.justifyContent;
    delete section.alignItems;
    delete section.gridMode;
    delete section.gridColumns;
    delete section.gridMinColumnWidth;
  }
  const migrated = normalizeProject(legacy);
  assert.equal(migrated.schemaVersion, 12);
  assert.equal(migrated.page.sections[0].children[0].text, legacy.page.sections[0].children[0].text);
  assert.equal(migrated.page.sections[0].flexDirection, 'row');
  assert.equal(migrated.page.sections[0].flexWrap, 'wrap');
  assert.equal(migrated.page.sections[0].justifyContent, 'start');
  assert.equal(migrated.page.sections[0].alignItems, 'center', 'legacy contentAlign is carried into the new cross-axis alignment');
  assert.equal(migrated.page.sections[1].gridColumns, 3);
  assert.equal(migrated.page.sections[1].gridMinColumnWidth, 240);
});

test('v2.0 nested layout containers normalize safely and export as recursive HTML and CSS', () => {
  const project = createStarterProject();
  const outer = createElementNode('container');
  outer.id = 'layout-outer'; outer.layout = 'flex'; outer.flexDirection = 'row'; outer.gridMode = 'fixed'; outer.gridColumns = 2;
  outer.gap = 24; outer.rowGap = 18; outer.columnGap = 28; outer.paddingX = 32; outer.paddingY = 24;
  const inner = createElementNode('container');
  inner.id = 'layout-inner'; inner.layout = 'stack'; inner.backgroundColor = '#f4f1ff';
  inner.children = [createElementNode('heading'), createElementNode('paragraph')];
  inner.children[0].id = 'nested-title'; inner.children[0].text = 'Nested layout heading';
  inner.children[1].id = 'nested-copy'; inner.children[1].text = 'Nested content remains editable';
  outer.children = [inner, createElementNode('card')]; outer.children[1].id = 'layout-card';
  outer.responsive = { tablet: { layout: 'flex', flexDirection: 'column', gap: 12, paddingX: 16, minHeight: 240 }, mobile: { layout: 'stack', paddingY: 10 } };
  project.page.sections[0].children.push(outer);
  project.layoutPresets = [{ id: 'preset-test', name: 'My layout', settings: { layout: 'grid', gridColumns: 3, gap: 18, padding: 14, backgroundColor: '#eeeeee' } }];
  const normalized = normalizeProject(project);
  const saved = findNode(normalized, 'layout-outer');
  assert.equal(saved.depth, 0);
  assert.equal(saved.section.id, 'section-hero');
  assert.equal(findNode(normalized, 'nested-title').parent.id, 'layout-inner');
  assert.equal(findNode(normalized, 'nested-title').depth, 2);
  assert.equal(normalized.layoutPresets[0].settings.gridColumns, 3);
  const html = generateHtml(normalized);
  assert.match(html, /class="cf-layout-container node-layout-outer/);
  assert.match(html, /class="cf-layout-container node-layout-inner/);
  assert.match(html, /Nested layout heading/);
  assert.match(html, /Nested content remains editable/);
  const css = generateCss(normalized);
  assert.match(css, /\.node-layout-outer \{[^}]*display:flex;[^}]*flex-direction:row/);
  assert.match(css, /\.node-layout-outer > \.cf-layout-container, \.node-layout-outer > \.cf-card \{ flex: 1 1 240px; width: auto; \}/);
  assert.match(css, /\.node-layout-inner \{[^}]*flex-direction:column/);
  assert.match(css, /@media \(max-width: 1024px\)[\s\S]*\.node-layout-outer \{[^}]*display: flex;[^}]*flex-direction: column;[^}]*gap: 12px/);
  assert.match(css, /@media \(max-width: 1024px\)[\s\S]*\.node-layout-outer > \.cf-layout-container, \.node-layout-outer > \.cf-card \{ flex: 0 1 auto; width: 100%; \}/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.node-layout-outer \{[^}]*flex-direction: column/);
});

test('v2.0 schema v10 backups migrate without losing responsive section settings', () => {
  const legacy = createStarterProject();
  legacy.schemaVersion = 10;
  legacy.page.sections[1].responsive = { tablet: { layout: 'grid', gridColumns: 2, gap: 18 }, mobile: { layout: 'stack' } };
  legacy.components = [{ id: 'legacy-component', name: 'Retained master', template: { type: 'heading', text: 'Keep me' }, variants: {} }];
  const migrated = normalizeProject(legacy);
  assert.equal(migrated.schemaVersion, 12);
  assert.equal(migrated.page.sections[1].responsive.tablet.gridColumns, 2);
  assert.equal(migrated.components[0].template.text, 'Keep me');
  assert.deepEqual(migrated.layoutPresets, []);
});

test('v2.0 custom layout presets are capped, de-duplicated and normalized to safe values', () => {
  const project = createStarterProject();
  project.layoutPresets = Array.from({ length: 15 }, (_, index) => ({ id: index < 2 ? 'same-id' : `preset-${index}`, name: `<Preset ${index}>`, settings: { layout: index === 0 ? 'grid' : 'unknown', gridColumns: 999, gap: -5, padding: 999, backgroundColor: 'url(javascript:1)' } }));
  const normalized = normalizeProject(project);
  assert.equal(normalized.layoutPresets.length, 12);
  assert.notEqual(normalized.layoutPresets[0].id, normalized.layoutPresets[1].id);
  assert.equal(normalized.layoutPresets[0].settings.layout, 'grid');
  assert.equal(normalized.layoutPresets[0].settings.gridColumns, 6);
  assert.equal(normalized.layoutPresets[0].settings.gap, 0);
  assert.equal(normalized.layoutPresets[0].settings.padding, 120);
  assert.equal(normalized.layoutPresets[0].settings.backgroundColor, '#ffffff');
});

test('v2.0 nested layout editor adds a container tool and exposes responsive preset controls', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(html, /data-insert="container"/);
  assert.match(html, /CANVASFLOW 2\.1\.0 · VISUAL WEBSITE STUDIO/);
  assert.match(app, /Nested layout container/);
  assert.match(app, /data-layout-preset-action="apply"/);
  assert.match(app, /data-layout-preset-action="save"/);
  assert.match(app, /data-layout-preset-action="delete"/);
  assert.match(app, /writeNodeProperty\(container, prop, structuredClone\(value\)\)/);
  assert.match(app, /getEffectiveValue\(container, key\)/);
  assert.match(app, /layer-nested-children/);
  assert.match(app, /function insertAfterSelection\(/);
  assert.match(app, /selectedContainer\.depth >= 3/);
  assert.match(app, /found\.depth < 4/);
  assert.match(app, /const STORAGE_KEY = 'canvasflow\.mvp\.project\.v12'/);
  assert.match(app, /canvasflow\.mvp\.project\.v10/);
  assert.match(css, /\.layer-nested-children/);
  assert.match(css, /\.layout-preset-actions/);
});

test('v2.0 nested node duplication and section duplication regenerate every descendant ID', () => {
  const project = createStarterProject();
  const container = createElementNode('container'); container.id = 'dupe-container';
  const child = createElementNode('container'); child.id = 'dupe-child-container';
  const heading = createElementNode('heading'); heading.id = 'dupe-heading';
  child.children = [heading]; container.children = [child];
  project.page.sections[0].children.push(container);
  const duplicatedContainer = duplicateNode(project, 'dupe-container');
  assert.ok(duplicatedContainer);
  const allIds = [];
  for (const section of project.page.sections) {
    allIds.push(section.id);
    const visit = (nodes) => nodes.forEach((node) => { allIds.push(node.id); if (node.type === 'container') visit(node.children); });
    visit(section.children);
  }
  assert.equal(new Set(allIds).size, allIds.length, 'duplicating a container must regenerate all nested IDs');
  const duplicatedSection = duplicateSection(project, 'section-hero');
  assert.ok(duplicatedSection);
  const afterSectionCopy = [];
  for (const section of project.page.sections) {
    afterSectionCopy.push(section.id);
    const visit = (nodes) => nodes.forEach((node) => { afterSectionCopy.push(node.id); if (node.type === 'container') visit(node.children); });
    visit(section.children);
  }
  assert.equal(new Set(afterSectionCopy).size, afterSectionCopy.length, 'duplicating a section must regenerate nested IDs too');
});

test('v2.0 nested container import limits depth, children, style values and breakpoint overrides', () => {
  const project = createStarterProject();
  const deepest = (depth) => ({ id: `depth-${depth}`, type: 'container', layout: 'grid', gridColumns: 99, gap: -9, paddingX: 999, backgroundColor: 'red; display:none', children: depth < 7 ? [deepest(depth + 1)] : [] });
  project.page.sections[0].children.push(deepest(0));
  const normalized = normalizeProject(project);
  const root = findNode(normalized, 'depth-0').node;
  assert.equal(root.gridColumns, 6);
  assert.equal(root.gap, 0);
  assert.equal(root.paddingX, 120);
  assert.equal(root.backgroundColor, '#ffffff');
  let count = 0; let cursor = root;
  while (cursor) { count++; cursor = cursor.children.find((item) => item.type === 'container'); }
  assert.equal(count, 4, 'container trees are capped at four levels including the root');
  const invalidResponsive = normalizeProject({ ...normalized, page: { ...normalized.page, sections: normalized.page.sections.map((section) => ({ ...section, children: section.children.map((node) => node.id === 'depth-0' ? { ...node, responsive: { mobile: { layout: 'two-column', gap: 999, paddingX: -2 } } } : node) })) } });
  const responsive = findNode(invalidResponsive, 'depth-0').node.responsive.mobile;
  assert.equal(responsive.layout, undefined);
  assert.equal(responsive.gap, 120);
  assert.equal(responsive.paddingX, 0);
});

test('responsive overrides are schema-normalized and exported as breakpoint CSS', () => {
  const project = createStarterProject();
  const heading = project.page.sections[0].children[0];
  heading.responsive = {
    tablet: { fontSize: 38, maxWidth: 700, textAlign: 'left', onload: 'alert(1)' },
    mobile: { fontSize: 30, color: '#123456', maxWidth: 340, textAlign: 'center' }
  };
  project.page.sections[0].responsive = { mobile: { paddingY: 36, maxWidth: 620, gap: 18, contentAlign: 'left', layout: 'grid', unexpected: 'bad' } };
  const normalized = normalizeProject(project);
  const normalizedHeading = normalized.page.sections[0].children[0];
  assert.deepEqual(normalizedHeading.responsive.tablet, { fontSize: 38, maxWidth: 700, textAlign: 'left' });
  assert.deepEqual(normalizedHeading.responsive.mobile, { color: '#123456', fontSize: 30, textAlign: 'center', maxWidth: 340 });
  const css = generateCss(normalized);
  assert.match(css, /@media \(max-width: 1024px\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.node-hero-heading \{[^}]*font-size: 38px/);
  assert.match(css, /\.node-hero-heading \{[^}]*font-size: 30px/);
  assert.match(css, /\.node-section-hero \{ padding-top: 36px; padding-bottom: 36px; \}/);
  assert.match(css, /\.cf-section\.node-section-hero \.cf-container \{[^}]*align-items: flex-start;[^}]*max-width: 620px;[^}]*gap: 18px;/);
  const mobileRules = css.slice(css.lastIndexOf('@media (max-width: 760px)'));
  assert.match(mobileRules, /\.cf-section\.node-section-hero \.cf-container \{ display: grid;[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.doesNotMatch(css, /alert\(1\)/);
});

test('v1.8 responsive layout engine remains supported in v2.0', () => {
  const project = createStarterProject();
  const section = project.page.sections[1];
  section.layout = 'flex';
  section.flexDirection = 'row-reverse';
  section.flexWrap = 'nowrap';
  section.justifyContent = 'space-between';
  section.alignItems = 'center';
  section.responsive = {
    tablet: { layout: 'grid', gridMode: 'fixed', gridColumns: 2, gap: 20 },
    mobile: { layout: 'grid', gridMode: 'auto-fit', gridMinColumnWidth: 168, justifyContent: 'unsupported', gridColumns: 99 }
  };
  const normalized = normalizeProject(project);
  const saved = normalized.page.sections[1];
  assert.equal(saved.layout, 'flex');
  assert.equal(saved.flexDirection, 'row-reverse');
  assert.equal(saved.flexWrap, 'nowrap');
  assert.equal(saved.justifyContent, 'space-between');
  assert.equal(saved.alignItems, 'center');
  assert.deepEqual(saved.responsive.tablet, { layout: 'grid', gap: 20, gridMode: 'fixed', gridColumns: 2 });
  assert.deepEqual(saved.responsive.mobile, { layout: 'grid', gridMode: 'auto-fit', gridColumns: 6, gridMinColumnWidth: 168 });
  const css = generateCss(normalized);
  assert.match(css, new RegExp(`\\.cf-section\\.node-${saved.id} \\.cf-container \\{ display:flex; flex-direction:row-reverse; flex-wrap:nowrap; justify-content:space-between; align-items:center;`));
  assert.match(css, new RegExp(`\\.cf-section\\.node-${saved.id} \\.cf-container > \\.cf-card \\{ flex: 1 1 240px; width: auto; \}`));
  assert.match(css, new RegExp(`\\.cf-section\\.node-${saved.id} \\.cf-container \\{ display: grid;[^}]*grid-template-columns: repeat\\(2, minmax\\(0, 1fr\\)\\);`));
  assert.match(css, new RegExp(`\\.cf-section\\.node-${saved.id} \\.cf-container \\{ display: grid;[^}]*repeat\\(auto-fit, minmax\\(min\\(100%, 168px\\), 1fr\\)\\)`));
  assert.doesNotMatch(css, /unsupported|repeat\(99,/);
});

test('v2.0 retains v1.9 responsive layout controls and responsive edits are stored in the active breakpoint', async () => {
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(packageJson.version, '2.1.0');
  assert.match(html, /Visual Website Studio/);
  assert.match(appSource, /Flexbox controls/);
  assert.match(appSource, /Grid controls/);
  assert.match(appSource, /function writeNodeProperty/);
  assert.match(appSource, /responsiveProperties\(node\)\.includes\(prop\)/);
  assert.match(appSource, /const STORAGE_KEY = 'canvasflow\.mvp\.project\.v12'/);
  assert.match(appSource, /'canvasflow\.mvp\.project\.v9'/);
});

test('preview bridge has valid script syntax and exposes canvas resize/reorder messages', () => {
  const preview = generatePreviewDocument(createStarterProject(), 'hero-heading', 'desktop', { showGuides: true });
  const scripts = [...preview.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new Script(scripts[0]));
  assert.match(scripts[0], /canvasflow:resize/);
  assert.match(scripts[0], /canvasflow:reorder-node/);
  assert.match(scripts[0], /aria-label', 'Resize selected element/);
  assert.match(scripts[0], /var guidesEnabled = true/);
  assert.match(scripts[0], /function updateGuides\(\)/);
  assert.match(preview, /cf-editor-guide-line/);
});

test('link destinations support common safe URLs and reject executable schemes', () => {
  assert.equal(normalizeHref('https://example.com'), 'https://example.com');
  assert.equal(normalizeHref('mailto:hello@example.com'), 'mailto:hello@example.com');
  assert.equal(normalizeHref('#section-2'), '#section-2');
  assert.equal(normalizeHref('javascript:alert(1)'), '#hero');
  assert.equal(normalizeHref('//evil.example/path'), '#hero');
  const project = createStarterProject();
  project.page.sections[0].children[2].href = 'javascript:alert(1)';
  assert.match(generateHtml(normalizeProject(project)), /href="#hero"/);
});

test('button links are editable and safely escaped in exported HTML', () => {
  const project = createStarterProject();
  project.page.sections[0].children[2].href = 'https://example.com/?a=1&b=2';
  const html = generateHtml(normalizeProject(project));
  assert.match(html, /href="https:\/\/example\.com\/\?a=1&amp;b=2"/);
});

test('sections can be reordered and removed without removing the final section', () => {
  const project = createStarterProject();
  const firstId = project.page.sections[0].id;
  project.page.sections.push(createSection(12));
  const addedId = project.page.sections.at(-1).id;
  assert.equal(moveSection(project, addedId, -1), true);
  assert.equal(project.page.sections.at(-2).id, addedId);
  assert.equal(removeSection(project, addedId), true);
  assert.equal(project.page.sections.length, 3);
  assert.equal(removeSection(project, firstId), true);
  assert.equal(project.page.sections.length, 2);
  assert.equal(removeSection(project, project.page.sections[0].id), true);
  assert.equal(removeSection(project, project.page.sections[0].id), false);
});

test('layer navigator keeps a semantic tree hierarchy and keyboard operations', async () => {
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(appSource, /wrap\.setAttribute\('role', 'treeitem'\)/);
  assert.match(appSource, /childrenWrap\.setAttribute\('role', 'group'\)/);
  assert.match(appSource, /button\.setAttribute\('role', 'treeitem'\)/);
  assert.match(appSource, /event\.key === 'Home'/);
  assert.match(appSource, /event\.key === 'End'/);
  assert.match(appSource, /event\.altKey && \(event\.key === 'ArrowUp' \|\| event\.key === 'ArrowDown'\)/);
});

test('editor uses relative asset paths suitable for GitHub Pages repository subpaths', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/src\/app\.js"/);
  assert.doesNotMatch(html, /href="\/styles\.css"|src="\/src\/app\.js"/);
});

test('duplicating a section creates unique node IDs and corrects the copied anchor', () => {
  const project = createStarterProject();
  const source = project.page.sections[0];
  source.children.find((node) => node.type === 'button').href = `#${source.anchor}`;
  const copy = duplicateSection(project, source.id);
  assert.ok(copy);
  assert.equal(project.page.sections.length, 4);
  assert.equal(project.page.sections[1].name, `${source.name} copy`);
  assert.notEqual(copy.id, source.id);
  assert.notEqual(copy.anchor, source.anchor);
  assert.equal(copy.children[2].href, `#${copy.anchor}`);
  assert.equal(copy.children[0].level, 2);
  const ids = project.page.sections.flatMap((section) => [section.id, ...section.children.map((node) => node.id)]);
  assert.equal(new Set(ids).size, ids.length);
});


test('sections and siblings can be reordered directly by drag-and-drop targets', () => {
  const project = createStarterProject();
  const sections = project.page.sections;
  assert.equal(reorderSection(project, sections[0].id, sections[2].id, 'after'), true);
  assert.equal(project.page.sections.at(-1).id, 'section-hero');
  assert.equal(reorderSection(project, 'missing', sections[0].id), false);
  assert.equal(reorderSection(project, 'section-hero', 'section-contact', 'after'), false, 'an unchanged position is not a mutation');
  const children = project.page.sections.find((section) => section.id === 'section-hero').children;
  assert.equal(reorderNode(project, 'hero-button', 'hero-heading', 'before'), true);
  assert.equal(children[0].id, 'hero-button');
  assert.equal(reorderNode(project, 'hero-button', 'hero-heading', 'before'), false, 'a no-op reorder is ignored');
  assert.equal(reorderNode(project, 'hero-heading', 'work-card-1', 'before'), false);
});

test('elements can be reordered, duplicated, and deleted within a section', () => {
  const project = createStarterProject();
  const section = project.page.sections[0];
  const headingId = section.children[0].id;
  const paragraphId = section.children[1].id;
  assert.equal(moveNode(project, paragraphId, -1), true);
  assert.equal(section.children[0].id, paragraphId);
  const copy = duplicateNode(project, paragraphId);
  assert.ok(copy); assert.notEqual(copy.id, paragraphId);
  assert.equal(section.children[1].id, copy.id);
  assert.equal(removeNode(project, copy.id), true);
  assert.equal(section.children.some((node) => node.id === copy.id), false);
  assert.equal(removeNode(project, headingId), true);
  assert.equal(findNode(project, headingId), null);
});

test('element factory normalizes defaults and responsive style containers for every supported node', () => {
  for (const type of ['heading', 'paragraph', 'button', 'image', 'card', 'divider', 'shape']) {
    const node = createElementNode(type, 'hero');
    assert.equal(node.type, type);
    assert.ok(node.id);
    assert.deepEqual(node.responsive, {});
  }
  assert.equal(createElementNode('heading').maxWidth, 980);
  assert.equal(createElementNode('image').maxWidth, 640);
  assert.equal(createElementNode('image').height, 360);
  assert.equal(createElementNode('image').objectPosition, '50% 50%');
  assert.equal(createElementNode('button').width, 0);
});

test('image upload sources are packaged as local assets in exported HTML', () => {
  const project = createStarterProject();
  const image = createElementNode('image', 'hero'); image.src = TINY_PNG; image.alt = 'A tiny test image';
  project.page.sections[0].children.push(image);
  const normalized = normalizeProject(project);
  const html = generateHtml(normalized, { exportAssets: true });
  assert.match(html, new RegExp(`src="assets/image-${image.id}\\.png"`));
  assert.match(html, /alt="A tiny test image"/);
  const assets = collectExportAssets(normalized);
  assert.ok(assets[`assets/image-${image.id}.png`] instanceof Uint8Array);
  assert.ok(assets[`assets/image-${image.id}.png`].length > 20);
});

test('image decoder rejects unsupported executable SVG data', () => {
  assert.throws(() => decodeImageDataUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='), /Unsupported image data/);
  assert.ok(decodeImageDataUrl(TINY_PNG).bytes instanceof Uint8Array);
});

test('import normalization strips invalid nodes, duplicate IDs, and unknown layout values', () => {
  const project = createStarterProject();
  project.page.sections[0].layout = 'absolute-everything';
  project.page.sections[0].children.push({ id: 'hero-heading', type: 'not-a-node', text: 'unsafe type' });
  const normalized = normalizeProject(project);
  assert.equal(normalized.page.sections[0].layout, 'stack');
  assert.equal(normalized.page.sections[0].children.length, 3);
  const ids = normalized.page.sections.flatMap((section) => [section.id, ...section.children.map((node) => node.id)]);
  assert.equal(new Set(ids).size, ids.length);
});

test('history manager supports undo, redo, duplicate suppression, and bounded history', () => {
  const history = new HistoryManager(2);
  const first = { value: 1 }; const second = { value: 2 }; const third = { value: 3 };
  history.record(first); history.record(first); history.record(second); history.record(third);
  assert.equal(history.undoStack.length, 2);
  assert.deepEqual(history.undo({ value: 4 }), third);
  assert.deepEqual(history.redo({ value: 3 }), { value: 4 });
  assert.equal(history.canRedo, false); history.record({ value: 5 }); assert.equal(history.canRedo, false);
});

test('ZIP writer emits valid local and end-of-directory headers', () => {
  const bytes = createZipBytes({ 'index.html': '<h1>Hello</h1>', 'styles.css': 'body { color: black; }', 'assets/image.png': new Uint8Array([1, 2, 3]) });
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
});


test('alignment settings are validated, responsive, and exported as layout CSS', () => {
  const project = createStarterProject();
  const heading = project.page.sections[0].children[0];
  heading.alignSelf = 'start';
  heading.responsive = { mobile: { alignSelf: 'center' }, tablet: { alignSelf: 'stretch' } };
  const normalized = normalizeProject(project);
  assert.equal(normalized.page.sections[0].children[0].alignSelf, 'start');
  assert.deepEqual(normalized.page.sections[0].children[0].responsive, { tablet: { alignSelf: 'stretch' }, mobile: { alignSelf: 'center' } });
  const css = generateCss(normalized);
  assert.match(css, new RegExp(`\\.node-${heading.id} \\{ align-self: flex-start; justify-self: start; \\}`));
  assert.match(css, new RegExp(`@media \\(max-width: 1024px\\)[\\s\\S]*\\.node-${heading.id} \\{ align-self: stretch; justify-self: stretch; \\}`));
  assert.match(css, new RegExp(`@media \\(max-width: 760px\\)[\\s\\S]*\\.node-${heading.id} \\{ align-self: center; justify-self: center; \\}`));
  heading.alignSelf = 'position:fixed';
  assert.equal(normalizeProject(project).page.sections[0].children[0].alignSelf, 'auto');
});

test('v2.0 precision geometry helpers clamp inputs, resize from all edges, snap and arrange rectangles', () => {
  assert.deepEqual(CANVAS_ZOOM_LEVELS, [25,33,50,67,75,100,125,150,200]);
  const positioning = normalizeFreePositioning({ mode:'free', x:120, y:-9000, xUnit:'%', yUnit:'px', width:500, height:220, rotation:725, responsive:{ tablet:{x:48,y:32,rotation:15}, mobile:{x:20} } });
  assert.equal(positioning.mode, 'free'); assert.equal(positioning.x, 120); assert.equal(positioning.y, -5000);
  assert.equal(positioning.rotation, 725); assert.deepEqual(resolveFreePositioning(positioning,'tablet').x,48);
  assert.deepEqual(resolveFreePositioning(positioning,'mobile').x,20); assert.equal(resolveFreePositioning(positioning,'mobile').y,32);
  assert.deepEqual(pointerToDocumentPoint({x:250,y:180},{left:50,top:30},2),{x:100,y:75});
  assert.deepEqual(resizeRectFromHandle({left:10,top:20,width:100,height:50},'nw',-10,-5),{left:0,top:15,width:110,height:55});
  assert.equal(resizeRectFromHandle({left:0,top:0,width:100,height:50},'se',25,0,{lockAspect:true}).height,62.5);
  assert.equal(snapCoordinate(102,[{value:100,label:'guide'}],4).value,100);
  assert.equal(snapCoordinate(102,[{value:100}],1).snapped,false);
  const rects=[{id:'a',left:20,top:5,width:40,height:20,right:60,bottom:25},{id:'b',left:80,top:30,width:30,height:30,right:110,bottom:60},{id:'c',left:140,top:10,width:20,height:20,right:160,bottom:30}];
  const aligned=alignRects(rects,'center-y'); assert.equal(aligned[0].top+10,aligned[1].top+15); assert.equal(aligned[1].top+15,aligned[2].top+10);
  const distributed=distributeRects(rects,'x'); assert.equal(distributed[1].left-(distributed[0].left+distributed[0].width),distributed[2].left-(distributed[1].left+distributed[1].width));
});

test('v2.0 schema v11 migration preserves content and adds safe free-position and guide settings', () => {
  const legacy=createStarterProject(); legacy.schemaVersion=11;
  const heading=legacy.page.sections[0].children[0]; heading.positioning={mode:'free',x:84,y:62,xUnit:'px',yUnit:'px',width:440,height:90,rotation:12,responsive:{tablet:{x:32,y:44},mobile:{x:20}}};
  legacy.page.editor={gridStep:16,snap:{grid:true,parent:false},guides:[{id:'guide-x',axis:'x',position:120,visible:true},{id:'bad',axis:'unsafe',position:'Infinity'}]};
  const migrated=normalizeProject(legacy);
  assert.equal(migrated.schemaVersion,12); assert.equal(findNode(migrated,heading.id).node.text,heading.text);
  const saved=findNode(migrated,heading.id).node.positioning;
  assert.equal(saved.mode,'free'); assert.equal(saved.x,84); assert.equal(saved.width,440); assert.equal(saved.rotation,12);
  assert.equal(resolveFreePositioning(saved,'tablet').x,32); assert.equal(resolveFreePositioning(saved,'mobile').x,20);
  assert.equal(migrated.page.editor.gridStep,16); assert.equal(migrated.page.editor.snap.parent,false);
  assert.equal(migrated.page.editor.guides.length,2); assert.equal(migrated.page.editor.guides[1].axis,'x');
});

test('v2.0 free-position elements export as parent-relative absolute CSS with responsive overrides', () => {
  const project=createStarterProject();
  const nested=createElementNode('container'); nested.id='v20-parent'; nested.layout='stack'; nested.minHeight=320; nested.children=[];
  const heading=createElementNode('heading'); heading.id='v20-free-heading'; heading.text='Precision headline';
  heading.positioning={mode:'free',x:72,y:48,xUnit:'px',yUnit:'px',width:460,height:88,rotation:8,responsive:{tablet:{x:30,y:60,width:400},mobile:{x:16,y:22,rotation:0}}};
  nested.children.push(heading); project.page.sections[0].children.push(nested);
  project.page.editor={gridStep:12,snap:{grid:true},guides:[{id:'design-guide',axis:'x',position:120}]};
  const normalized=normalizeProject(project); const saved=findNode(normalized,heading.id).node;
  assert.equal(saved.positioning.mode,'free');
  const html=generateHtml(normalized); const css=generateCss(normalized);
  assert.match(html,/data-cf-free="true"/); assert.match(html,/data-cf-free-rotation="8"/);
  assert.match(css,/\.node-v20-free-heading\[data-cf-free="true"\] \{[^}]*position:absolute;left:72px;top:48px;[^}]*rotate\(8deg\)/);
  assert.match(css,/@media \(max-width: 1024px\)[\s\S]*\.node-v20-free-heading\[data-cf-free="true"\] \{ left:30px; top:60px; width:400px/);
  assert.match(css,/@media \(max-width: 760px\)[\s\S]*\.node-v20-free-heading\[data-cf-free="true"\] \{ left:16px; top:22px/);
  assert.match(css,/\.node-v20-parent \{ position:relative; min-height:/);
  assert.doesNotMatch(html,/cf-editor-user-guide|cf-editor-transform-handle/);
  assert.doesNotMatch(css,/cf-editor-user-guide|cf-editor-transform-handle/);
});

test('v2.0 precision editor exposes camera, positioning, transform, geometric arrangement and guides', async () => {
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8'); const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8'); const model=await readFile(new URL('../src/model.js',import.meta.url),'utf8');
  for (const id of ['zoomOutBtn','zoomInBtn','zoomPercentInput','handToolBtn','fitCanvasBtn','rulerTop','rulerLeft']) assert.match(html,new RegExp(`id="${id}"`));
  for (const feature of ['function setCanvasZoom(','function fitCanvasToStage(','data-transform-mode','data-transform-prop','data-transform-action','data-free-arrange','function applyMeasuredFreePosition(','function applyFreePositionMessage(','function hasPrecisionOnlyFeatures(','data-guide-action','data-snap-setting']) assert.ok(app.includes(feature),`missing ${feature}`);
  for (const feature of ['canvasflow:measure-free-position','canvasflow:free-move','canvasflow:free-transform','canvasflow:free-nudge','data-cf-transform-handle','function snapFreePosition(','pointercancel','pointercapture']) assert.ok(model.toLowerCase().includes(feature.toLowerCase()),`missing ${feature}`);
  const project=createStarterProject(); const node=findNode(project,project.page.sections[0].children[0].id).node; node.positioning={mode:'free',x:20,y:40,width:300,height:70};
  const preview=generatePreviewDocument(normalizeProject(project),node.id,'desktop',{showGuides:true,selectedIds:[node.id],userGuides:[{id:'g1',axis:'x',position:120,visible:true}],gridStep:8,snapSettings:{grid:true}});
  const scripts=[...preview.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((match)=>match[1]); assert.equal(scripts.length,1); assert.doesNotThrow(()=>new Script(scripts[0]));
  assert.match(scripts[0],/canvasflow:free-transform/); assert.match(scripts[0],/canvasflow:measure-free-position/); assert.match(scripts[0],/snapFreePosition/);
});

test('v2.0 precision interactions use parent-local transforms, exact arrangement geometry, and responsive guide snapping', async () => {
  const model = await readFile(new URL('../src/model.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(model, /x:next\.left,y:next\.top,width:next\.width,height:next\.height/);
  assert.match(model, /transform\.element\.style\.left=left\+'px'; transform\.element\.style\.top=top\+'px'/);
  assert.match(model, /canvasflow:arrange-free/);
  assert.match(model, /canvasflow:free-arrange/);
  assert.match(model, /Number\.parseFloat\(cs\.left\)/);
  assert.match(model, /snapSettings\.equalSpacing === true/);
  assert.match(model, /pageRect\.left\+guide\.position-parentRect\.left/);
  assert.match(model, /moving\.indexOf\(other\.getAttribute\('data-cf-id'\)\)>=0/);
  assert.match(model, /borderLeft = parseFloat\(ps\.borderLeftWidth\)/);
  assert.match(model, /freeParentRect\.width-borderLeft-borderRight/);
  const freeDragStart = model.slice(model.indexOf("var freeParent ="), model.indexOf("activeDrag = { kind:'free-position'"));
  assert.match(freeDragStart, /var borderLeft = parseFloat\(freeStyles\.borderLeftWidth\)/, 'Free-position drag defines its own local border metrics');
  assert.match(freeDragStart, /var originX = freeParentRect\.left \+ borderLeft/);
  assert.match(freeDragStart, /width:Number\.parseFloat\(cs\.width\)\|\|visualRect\.width/);
  assert.match(freeDragStart, /height:Number\.parseFloat\(cs\.height\)\|\|visualRect\.height/);
  assert.doesNotMatch(freeDragStart, /paddingLeft|paddingTop/, 'absolute positioning starts at the parent padding edge, not its content edge');
  assert.match(model, /var tolerance=8\/Math\.max\(0\.25,Math\.min\(2,editorZoom\)\)/, 'snap tolerance remains screen-consistent across editor zoom levels');
  assert.match(model, /canvasflow:set-editor-zoom/);
  assert.match(model, /var touchPointers = Object\.create\(null\)/);
  assert.match(model, /canvasflow:touch-camera/);
  assert.match(model, /cancelEditsForTouchCamera/);
  assert.match(model, /canvasflow:selection-bounds/);
  assert.match(model, /match-width.*match-height.*match-size/);
  assert.match(model, /width:r\.width,height:r\.height/);
  assert.match(model, /activeDrag\.kind === 'overlay' \|\| activeDrag\.kind === 'free-position'/);
  assert.match(app, /postMessage\(\{ type: 'canvasflow:arrange-free', action, ids:/);
  assert.match(app, /canvasflow:free-arrange/);
  assert.match(app, /function centerCanvasOnSelection\(/);
  assert.match(app, /function beginTouchCameraGesture\(/);
  assert.match(app, /function moveTouchCameraGesture\(/);
  assert.match(app, /stageTouchPointers/);
  assert.match(app, /message\.type === 'canvasflow:touch-camera'/);
  assert.match(app, /message\.type === 'canvasflow:selection-bounds'/);
  assert.match(app, /centerSelectionBtn\.addEventListener/);
  assert.match(app, /!hasPrecisionOnlyFeatures\(project\)/);
  assert.match(app, /beginRulerGuide\('x', event\)/);
  assert.match(app, /beginRulerGuide\('y', event\)/);
});

test('multi-selection and arrange controls are connected to project state', async () => {
  const project = createStarterProject();
  const heading = project.page.sections[0].children[0];
  const paragraph = project.page.sections[0].children[1];
  const preview = generatePreviewDocument(project, heading.id, 'desktop', { selectedIds: [heading.id, paragraph.id] });
  assert.match(preview, new RegExp(`\\.node-${heading.id}, \\.node-${paragraph.id} \\{ outline: 2px solid`));
  assert.ok(preview.includes('event.shiftKey || event.ctrlKey || event.metaKey'));
  assert.match(preview, /canvasflow:selection/);
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(appSource, /function renderMultiInspector/);
  assert.match(appSource, /data-arrange-align/);
  assert.match(appSource, /data-distribute-gap/);
  assert.match(appSource, /selectionIsAllSiblings/);
  assert.ok(appSource.includes('selectedIds: [...selectedIds]'));
});

test('resize gesture snapping, aspect locking, pointer capture, and cancellation are implemented', () => {
  const preview = generatePreviewDocument(createStarterProject(), 'hero-heading', 'desktop', { showGuides: true });
  assert.ok(preview.includes('function snapDimension(value, element, axis, event)'));
  assert.ok(preview.includes('Math.round(value / 8) * 8'));
  assert.ok(preview.includes('event.shiftKey && !widthOnly'));
  assert.ok(preview.includes('setPointerCapture(event.pointerId)'));
  assert.ok(preview.includes('state.originalStyle'));
  assert.ok(preview.includes("document.addEventListener('pointercancel'"));
  assert.ok(preview.includes('canvasflow:resize'));
});

test('guide overlay sizing is based on page content and can shrink with the preview viewport', () => {
  const preview = generatePreviewDocument(createStarterProject(), 'hero-heading', 'desktop', { showGuides: true });
  assert.match(preview, /var pageContent = document\.querySelector\('\.cf-page'\)/);
  assert.match(preview, /pageContent \? pageContent\.scrollWidth : 0/);
  assert.match(preview, /pageContent \? pageContent\.scrollHeight : 0/);
  assert.doesNotMatch(preview, /guideLayer\.style\.width = Math\.max\(document\.documentElement\.scrollWidth/);
});

test('history snapshots preserve multi-selection state and treat one canvas gesture as one edit', async () => {
  const history = new HistoryManager(10);
  const before = { project: createStarterProject(), selectedId: 'hero-heading', selectedIds: ['hero-heading', 'hero-paragraph'] };
  const after = structuredClone(before);
  after.project.page.sections[0].children[0].maxWidth = 720;
  history.record(before);
  const restored = history.undo(after);
  assert.deepEqual(restored.selectedIds, ['hero-heading', 'hero-paragraph']);
  assert.equal(restored.project.page.sections[0].children[0].maxWidth, 980);
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(appSource, /function applyCanvasResize/);
  assert.ok(appSource.includes('recordBeforeMutation();\n  setSelectionState(message.id, [message.id]);'));
});


test('decorative overlay shapes normalize safely and export in a separate positioned layer', () => {
  const project = createStarterProject();
  const section = project.page.sections[0];
  const overlay = createElementNode('shape', section.anchor);
  overlay.positionMode = 'overlay';
  overlay.xPercent = 78;
  overlay.yPercent = 24;
  overlay.zIndex = 4;
  overlay.groupId = 'background-decor';
  section.children.push(overlay);
  const second = createElementNode('shape', section.anchor);
  second.positionMode = 'overlay'; second.groupId = 'background-decor'; second.xPercent = 62; second.yPercent = 36;
  section.children.push(second);
  const normalized = normalizeProject(project);
  const savedOverlay = findNode(normalized, overlay.id).node;
  assert.equal(savedOverlay.positionMode, 'overlay');
  assert.equal(savedOverlay.xPercent, 78);
  assert.equal(savedOverlay.yPercent, 24);
  assert.equal(savedOverlay.zIndex, 4);
  assert.equal(savedOverlay.groupId, 'background-decor');
  const html = generateHtml(normalized);
  const css = generateCss(normalized);
  assert.match(html, /class="cf-overlay-layer" aria-hidden="true"/);
  assert.match(html, new RegExp(`data-cf-id="${overlay.id}" data-cf-position="overlay" data-cf-x="78" data-cf-y="24" data-cf-z="4" data-cf-group="background-decor"`));
  assert.match(css, new RegExp(`\\.node-${overlay.id}\\[data-cf-position="overlay"\\] \\{ position: absolute; left: 78%; top: 24%; z-index: 4;`));
  assert.match(css, /\.cf-overlay-layer \{ position: absolute; inset: 0; z-index: 0;/);
  assert.match(css, /\.cf-container \{ position: relative; z-index: 1;/);
});

test('overlay positions are clamped, responsive, and unsafe imported group IDs are discarded', () => {
  const project = createStarterProject();
  const section = project.page.sections[0];
  const first = createElementNode('shape', section.anchor); first.positionMode = 'overlay'; first.xPercent = -40; first.yPercent = 150; first.groupId = 'alone';
  const second = createElementNode('shape', section.anchor); second.positionMode = 'overlay'; second.xPercent = 1000; second.yPercent = -1; second.responsive = { mobile: { xPercent: 33, yPercent: 68 }, tablet: { xPercent: '34%; } body { display:none' } };
  section.children.push(first, second);
  const normalized = normalizeProject(project);
  const a = findNode(normalized, first.id).node;
  const b = findNode(normalized, second.id).node;
  assert.equal(a.xPercent, 0); assert.equal(a.yPercent, 100); assert.equal(a.groupId, null, 'singleton groups are removed');
  assert.equal(b.xPercent, 100); assert.equal(b.yPercent, 0);
  assert.deepEqual(b.responsive, { mobile: { xPercent: 33, yPercent: 68 } });
  const css = generateCss(normalized);
  assert.match(css, new RegExp(`@media \\(max-width: 760px\\)[\\s\\S]*\\.node-${second.id}\\[data-cf-position=\"overlay\"\\] \\{ left: 33%; top: 68%; \\}`));
  assert.doesNotMatch(css, /display:none/);
});

test('overlay group requires decorative shapes in one section and moves with shared group identity', () => {
  const project = createStarterProject();
  const section = project.page.sections[0];
  const one = createElementNode('shape', section.anchor); one.positionMode = 'overlay';
  const two = createElementNode('shape', section.anchor); two.positionMode = 'overlay';
  const flow = createElementNode('shape', section.anchor);
  section.children.push(one, two, flow);
  const otherSectionShape = createElementNode('shape', 'work'); otherSectionShape.positionMode = 'overlay';
  project.page.sections[1].children.push(otherSectionShape);
  const groupId = groupOverlayNodes(project, [one.id, two.id]);
  assert.ok(groupId);
  assert.equal(findNode(project, one.id).node.groupId, groupId);
  assert.equal(findNode(project, two.id).node.groupId, groupId);
  assert.equal(groupOverlayNodes(project, [one.id, flow.id]), null, 'flow shapes cannot join a decorative group');
  assert.equal(groupOverlayNodes(project, [one.id, otherSectionShape.id]), null, 'groups cannot cross sections');
  assert.equal(ungroupOverlayNodes(project, [one.id]), true);
  assert.equal(findNode(project, one.id).node.groupId, null);
  assert.equal(findNode(project, two.id).node.groupId, null);
  assert.equal(ungroupOverlayNodes(project, [one.id]), false);
});

test('overlay layer controls reorder z-stack without moving responsive flow content', () => {
  const project = createStarterProject();
  const section = project.page.sections[0];
  const flowIds = section.children.filter((node) => node.type !== 'shape').map((node) => node.id);
  const first = createElementNode('shape', section.anchor); first.positionMode = 'overlay'; first.zIndex = 20;
  const second = createElementNode('shape', section.anchor); second.positionMode = 'overlay'; second.zIndex = 60;
  const third = createElementNode('shape', section.anchor); third.positionMode = 'overlay'; third.zIndex = 100;
  section.children.push(first, second, third);
  assert.equal(reorderOverlayLayer(project, second.id, null, 'raise'), true);
  assert.ok(findNode(project, second.id).node.zIndex > findNode(project, third.id).node.zIndex);
  assert.equal(reorderOverlayLayer(project, second.id, null, 'front'), false, 'already front is a no-op');
  assert.equal(reorderOverlayLayer(project, second.id, third.id, 'before'), true);
  assert.ok(findNode(project, second.id).node.zIndex < findNode(project, third.id).node.zIndex);
  assert.deepEqual(section.children.filter((node) => node.type !== 'shape').map((node) => node.id), flowIds, 'overlay reordering never shifts flow content order');
  assert.deepEqual(section.children.filter((node) => node.positionMode === 'overlay').map((node) => node.zIndex).sort((a,b) => a-b), [0,50,100]);
});

test('v1.1 editor exposes layer ordering, pixel grid/rulers, focal-point grid, and shortcut actions', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(html, /id="gridBtn"/);
  assert.match(html, /id="rulersBtn"/);
  assert.match(html, /id="rulerTop"/);
  assert.match(html, /id="rulerLeft"/);
  assert.match(appSource, /data-layer-action=\"\$\{action\}/);
  assert.match(appSource, /reorderOverlayLayer\(project, nodeId/);
  assert.match(appSource, /data-focal-point/);
  assert.match(appSource, /applySelectionLayerAction\('visible'\)/);
  assert.match(appSource, /applySelectionLayerAction\('locked'\)/);
  assert.match(appSource, /function cycleDistributionGap/);
  assert.match(html, /Cycle equal-gap presets/);
  assert.match(css, /preview-stage\.show-grid \.frame-wrap::after/);
  assert.match(css, /\.canvas-ruler-x/);
  assert.match(css, /\.layer-order-button/);
});

test('overlay editor controls and drag bridge expose positioning, grouped moves, snapping and rollback', async () => {
  const project = createStarterProject();
  const shape = createElementNode('shape', 'hero'); shape.positionMode = 'overlay';
  project.page.sections[0].children.push(shape);
  const preview = generatePreviewDocument(normalizeProject(project), shape.id, 'desktop', { showGuides: true });
  const scripts = [...preview.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new Script(scripts[0]));
  assert.match(scripts[0], /snapOverlayAxis\(value, limit, halfSize, event, axis\)/);
  assert.match(scripts[0], /var min = 0; var max = limit;/, 'drag clamping preserves the full centre-percent range without edge jumps');
  assert.match(scripts[0], /canvasflow:move-overlay/);
  assert.match(scripts[0], /restoreOverlayStyles\(activeDrag\)/);
  assert.match(scripts[0], /clickedGroup/);
  assert.match(preview, /\.cf-container \{ pointer-events: none; \} \.cf-container > \* \{ pointer-events: auto; \}/, 'overlay shapes remain directly pointer-selectable behind content');
  assert.match(scripts[0], /window\.getComputedStyle\(item\)/, 'overlay dragging starts from effective breakpoint styles');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(appSource, /canvasflow\.mvp\.project\.v7/);
  assert.match(appSource, /canvasflow\.mvp\.project\.v6/);
  assert.match(html, /data-insert="overlay-shape"/);
  assert.match(appSource, /function applyCanvasOverlayMove\(message\)/);
  assert.match(appSource, /groupOverlayNodes\(project, selectedIds\)/);
  assert.match(appSource, /ungroupOverlayNodes\(project, selectedIds\)/);
  assert.match(appSource, /function responsiveProperties\(node\)/);
});

test('v1 layer visibility, opacity, and canvas locks survive project normalization and export', () => {
  const project = createStarterProject();
  const section = project.page.sections[0];
  const heading = section.children[0];
  section.visible = false; section.opacity = 73; section.locked = true;
  heading.visible = false; heading.opacity = 34; heading.locked = true;
  const normalized = normalizeProject(project);
  const savedSection = findNode(normalized, section.id).node;
  const savedHeading = findNode(normalized, heading.id).node;
  assert.deepEqual([savedSection.visible, savedSection.opacity, savedSection.locked], [false, 73, true]);
  assert.deepEqual([savedHeading.visible, savedHeading.opacity, savedHeading.locked], [false, 34, true]);
  const css = generateCss(normalized);
  const html = generateHtml(normalized);
  assert.match(css, new RegExp(`\\.node-${section.id} \\{ display: none !important; opacity: 0\\.73;`));
  assert.match(css, new RegExp(`\\.node-${heading.id} \\{ display: none !important; --cf-element-opacity: 0\\.34; opacity: var\\(--cf-element-opacity\\);`));
  assert.match(css, /@keyframes cf-fade-in \{ from \{ opacity: 0; \} to \{ opacity: var\(--cf-element-opacity, 1\); \} \}/, 'animation endpoints preserve configured opacity');
  assert.match(html, new RegExp(`data-cf-id="${section.id}" data-cf-locked="true"`));
  assert.match(html, new RegExp(`data-cf-id="${heading.id}" data-cf-locked="true"`));
});

test('layer-control inputs and imported shape types are bounded and safe', () => {
  const project = createStarterProject();
  const section = project.page.sections[0];
  const shape = createElementNode('shape', section.anchor);
  shape.shapeKind = 'star'; shape.opacity = 130; shape.visible = false; shape.locked = true;
  section.children.push(shape);
  shape.responsive = { mobile: { xPercent: 38, yPercent: 71, opacity: -10, visible: false } };
  const normalized = normalizeProject(project);
  const node = findNode(normalized, shape.id).node;
  assert.equal(node.shapeKind, 'star');
  assert.equal(node.opacity, 100);
  assert.equal(node.visible, false);
  assert.equal(node.locked, true);
  assert.deepEqual(node.responsive, { mobile: { xPercent: 38, yPercent: 71 } });
  const css = generateCss(normalized);
  assert.match(css, new RegExp(`\\.node-${shape.id} \\{ display: none !important; --cf-element-opacity: 1; opacity: var\\(--cf-element-opacity\\);`));
  assert.match(css, /\.cf-shape\.shape-star \{ clip-path:/);
});

test('eight geometric shape choices are exported with actual CSS geometry', () => {
  const project = createStarterProject();
  const section = project.page.sections[0];
  const kinds = ['rectangle', 'circle', 'pill', 'triangle', 'diamond', 'hexagon', 'star', 'ring'];
  for (const kind of kinds) {
    const node = createElementNode('shape', section.anchor);
    node.name = `${kind} demo`; node.shapeKind = kind;
    section.children.push(node);
  }
  const normalized = normalizeProject(project);
  const html = generateHtml(normalized);
  const css = generateCss(normalized);
  for (const kind of kinds) assert.match(html, new RegExp(`class="cf-shape[^\"]*shape-${kind}"`));
  for (const kind of ['triangle', 'diamond', 'hexagon', 'star']) assert.match(css, new RegExp(`\\.cf-shape\\.shape-${kind} \\{ clip-path:`));
  assert.match(css, /background: transparent;[^}]*border: \d+px solid #[0-9a-fA-F]{6}/, 'ring is an outlined shape rather than a filled circle');
});

test('v1 editor wires per-layer visibility/lock controls, touch handles, and keyboard overlay nudging', async () => {
  const project = createStarterProject();
  const overlay = createElementNode('shape', 'hero'); overlay.positionMode = 'overlay';
  project.page.sections[0].children.push(overlay);
  const preview = generatePreviewDocument(normalizeProject(project), overlay.id, 'desktop');
  const script = [...preview.matchAll(/<script>([\s\S]*?)<\/script>/gi)][0][1];
  assert.doesNotThrow(() => new Script(script));
  assert.match(script, /function isLocked\(element\)/);
  assert.match(script, /canvasflow:nudge-overlay/);
  assert.match(script, /event\.altKey \? 0\.1 : event\.shiftKey \? 5 : 1/);
  assert.match(preview, /width:24px;height:24px/);
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /canvasflow\.mvp\.project\.v7/);
  assert.match(app, /canvasflow\.mvp\.project\.v6/);
  assert.match(app, /function layerActionButton\(node, action\)/);
  assert.match(app, /data-layer-action="\$\{action\}"/);
  assert.match(app, /function toggleLayerState\(nodeId, action\)/);
  assert.match(app, /function applyCanvasOverlayNudge\(message\)/);
  assert.match(app, /function shapePalette\(value\)/);
  assert.match(app, /layerControls\(node\)/);
});

test('motion settings normalize into safe bounds and preserve old schema compatibility', () => {
  const project = createStarterProject();
  const heading = project.page.sections[0].children[0];
  heading.animationDuration = 99999;
  heading.animationDelay = -300;
  heading.animationEasing = 'linear; } body { display:none';
  heading.animationDirection = 'sideways';
  heading.animationTrigger = 'javascript:alert(1)';
  const normalized = normalizeProject(project);
  const saved = findNode(normalized, heading.id).node;
  assert.equal(normalized.schemaVersion, 12, 'v2.0 adds precision canvas positioning while retaining responsive layout and components');
  assert.equal(saved.animationDuration, 5000);
  assert.equal(saved.animationDelay, 0);
  assert.equal(saved.animationEasing, 'smooth');
  assert.equal(saved.animationDirection, 'normal');
  assert.equal(saved.animationTrigger, 'load');
  const oldProject = createStarterProject();
  delete oldProject.page.sections[0].children[0].animationDuration;
  delete oldProject.page.sections[0].children[0].animationDelay;
  delete oldProject.page.sections[0].children[0].animationEasing;
  delete oldProject.page.sections[0].children[0].animationDirection;
  delete oldProject.page.sections[0].children[0].animationTrigger;
  const legacy = normalizeProject(oldProject).page.sections[0].children[0];
  assert.deepEqual([legacy.animationDuration, legacy.animationDelay, legacy.animationEasing, legacy.animationDirection, legacy.animationTrigger], [700, 0, 'smooth', 'normal', 'load']);
});

test('motion duration, delay, easing, direction, and hover trigger export as controlled CSS', () => {
  const project = createStarterProject();
  const heading = project.page.sections[0].children[0];
  heading.animation = 'rise';
  heading.animationDuration = 1350;
  heading.animationDelay = 250;
  heading.animationEasing = 'ease-in-out';
  heading.animationDirection = 'reverse';
  heading.animationTrigger = 'hover';
  const normalized = normalizeProject(project);
  const css = generateCss(normalized);
  assert.match(css, new RegExp(`\\.node-${heading.id} \\{ --cf-motion-duration: 1350ms; --cf-motion-delay: 250ms; --cf-motion-easing: ease-in-out; --cf-motion-direction: reverse; \\}`));
  assert.match(css, new RegExp(`\\.node-${heading.id}\\[data-cf-motion-trigger=\\"hover\\"\\]\\:hover`));
  assert.match(css, /cf-motion-rise \{ animation: cf-rise-in var\(--cf-motion-duration, 700ms\) var\(--cf-motion-easing, cubic-bezier\(\.2,\.75,\.25,1\)\) var\(--cf-motion-delay, 0ms\) var\(--cf-motion-direction, normal\) both; \}/);
  const html = generateHtml(normalized);
  assert.match(html, new RegExp(`data-cf-animation=\\"rise\\" data-cf-motion-trigger=\\"hover\\"`));
  assert.doesNotMatch(html, /<script\b/i, 'hover trigger requires no runtime JavaScript');
});

test('viewport-trigger motion adds a self-contained observer runtime and respects reduced motion', () => {
  const project = createStarterProject();
  const heading = project.page.sections[1].children[0];
  heading.animation = 'fade';
  heading.animationTrigger = 'viewport';
  heading.animationDuration = 1200;
  heading.animationDelay = 150;
  const normalized = normalizeProject(project);
  const html = generateHtml(normalized);
  const css = generateCss(normalized);
  assert.match(html, /new IntersectionObserver/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /cf-motion-pending/);
  assert.match(html, /cf-motion-active/);
  const runtimeScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  assert.equal(runtimeScripts.length, 1, 'one self-contained runtime is emitted for viewport-triggered motion');
  assert.doesNotThrow(() => new Script(runtimeScripts[0]), 'generated motion runtime must be valid JavaScript');
  assert.match(css, /\[data-cf-motion-trigger="viewport"\]:not\(\.cf-motion-active\) \{ animation-name: none !important; \}/);
  assert.match(css, /\.cf-motion-pending \{ opacity: 0 !important; \}/);
  assert.match(css, /animation-delay: 0ms !important/);
  const preview = generatePreviewDocument(normalized, heading.id, 'desktop');
  assert.match(preview, /canvasflow:replay-motion/);
  assert.match(preview, /prefers-reduced-motion: reduce/);
});

test('motion inspector exposes settings and connects replay to the live preview bridge', async () => {
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(appSource, /function motionControls\(node\)/);
  assert.match(appSource, /data-deferred-number=\"true\"/);
  assert.match(appSource, /dataset\.deferredNumber !== 'true'/);
  assert.match(appSource, /fieldMotionNumber\('Duration', 'animationDuration'/);
  assert.match(appSource, /fieldMotionNumber\('Delay', 'animationDelay'/);
  assert.match(appSource, /animationEasing/);
  assert.match(appSource, /animationDirection/);
  assert.match(appSource, /animationTrigger/);
  assert.match(appSource, /data-motion-preview/);
  assert.match(appSource, /canvasflow:replay-motion/);
});

test('viewport motion runtime marks pending elements then activates them once intersecting', () => {
  const project = createStarterProject();
  const heading = project.page.sections[1].children[0];
  heading.animation = 'rise'; heading.animationTrigger = 'viewport';
  const html = generateHtml(normalizeProject(project));
  const code = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(code, 'viewport motion should emit the runtime');
  const classes = new Set();
  const item = { classList: { add: (value) => classes.add(value), remove: (value) => classes.delete(value) } };
  let observerCallback;
  let unobserved = false;
  class FakeIntersectionObserver {
    constructor(callback) { observerCallback = callback; }
    observe() {}
    unobserve() { unobserved = true; }
  }
  const context = {
    document: { querySelectorAll: () => [item] },
    window: { matchMedia: () => ({ matches: false }), IntersectionObserver: FakeIntersectionObserver },
    IntersectionObserver: FakeIntersectionObserver
  };
  new Script(code).runInNewContext(context);
  assert.equal(classes.has('cf-motion-pending'), true);
  observerCallback([{ target: item, isIntersecting: true }]);
  assert.equal(classes.has('cf-motion-pending'), false);
  assert.equal(classes.has('cf-motion-active'), true);
  assert.equal(unobserved, true);
});

test('v1.3 design system defaults are added safely to old projects and token values are bounded', async () => {
  const { createDefaultDesignSystem, normalizeDesignSystem } = await import('../src/model.js');
  const oldProject = normalizeProject({ schemaVersion: 7, id: 'legacy-design', name: 'Legacy', page: { id: 'page-home', name: 'Home', title: 'Legacy', sections: [] } });
  assert.deepEqual(oldProject.designSystem, createDefaultDesignSystem());
  const safe = normalizeDesignSystem({
    colors: { primary: 'red', text: '#123456', muted: '#234567', surface: '#345678', border: '#456789', page: '#567890' },
    typography: { headingFont: 'url(javascript:alert(1))', bodyFont: 'serif', headingWeight: '999', bodyWeight: '700' },
    radius: { small: -9, medium: 999, large: 22 }, spacing: { section: 999, gap: 1 }, width: { content: 1, wide: 900 }
  });
  assert.equal(safe.colors.primary, '#7055ed');
  assert.equal(safe.typography.headingFont, 'system');
  assert.equal(safe.typography.bodyFont, 'serif');
  assert.equal(safe.typography.headingWeight, '800');
  assert.deepEqual(safe.radius, { small: 0, medium: 40, large: 22 });
  assert.deepEqual(safe.spacing, { section: 180, gap: 8 });
  assert.deepEqual(safe.width, { content: 320, wide: 900 });
});

test('design tokens export as safe shared CSS variables and theme-linked defaults use them', async () => {
  const { createDefaultDesignSystem } = await import('../src/model.js');
  const project = createStarterProject();
  project.designSystem = createDefaultDesignSystem();
  project.designSystem.colors.primary = '#1166aa';
  project.designSystem.colors.text = '#172b4d';
  project.designSystem.typography.headingFont = 'serif';
  project.designSystem.radius.medium = 16;
  project.designSystem.spacing.section = 96;
  project.designSystem.width.wide = 1120;
  project.page.sections.push(createSection(3, 'content', project.designSystem));
  const css = generateCss(normalizeProject(project));
  assert.match(css, /--cf-color-primary: #1166aa/);
  assert.match(css, /--cf-color-text: #172b4d/);
  assert.match(css, /--cf-font-heading: Georgia/);
  assert.match(css, /--cf-radius-medium: 16px/);
  assert.match(css, /--cf-space-section: 96px/);
  assert.match(css, /--cf-width-wide: 1120px/);
  assert.match(css, /background: var\(--cf-color-primary\)/);
  assert.match(css, /font-family: var\(--cf-font-heading\)/);
  assert.match(css, /border-radius: var\(--cf-radius-medium\)/);
  assert.match(css, /padding-top: var\(--cf-space-section\)/);
});

test('new elements inherit active design tokens without changing existing custom styles', async () => {
  const { applyDesignTokensToNode, createDefaultDesignSystem } = await import('../src/model.js');
  const ds = createDefaultDesignSystem(); ds.colors.primary = '#0b806b'; ds.colors.surface = '#e9f6f2'; ds.colors.border = '#b9d9d0'; ds.radius.medium = 20; ds.radius.large = 28;
  const button = applyDesignTokensToNode(createElementNode('button'), ds);
  const card = applyDesignTokensToNode(createElementNode('card'), ds);
  assert.equal(button.backgroundColor, '#0b806b');
  assert.equal(button.borderRadius, 20);
  assert.equal(card.backgroundColor, '#e9f6f2');
  assert.equal(card.borderColor, '#b9d9d0');
  assert.equal(card.borderRadius, 28);
  const manuallyStyled = { ...createElementNode('button'), backgroundColor: '#ff00aa' };
  assert.equal(manuallyStyled.backgroundColor, '#ff00aa');
});

test('reusable section presets create semantic navigation and footer components', async () => {
  const { createDefaultDesignSystem } = await import('../src/model.js');
  const ds = createDefaultDesignSystem(); ds.colors.primary = '#126b85';
  const nav = createSection(0, 'navigation', ds);
  const footer = createSection(1, 'footer', ds);
  assert.equal(nav.componentKind, 'navigation');
  assert.deepEqual(nav.children.map((node) => node.type), ['heading', 'button', 'button', 'button']);
  assert.equal(nav.children[1].href, '#top');
  assert.equal(nav.children[1].backgroundColor, '#126b85');
  assert.equal(footer.componentKind, 'footer');
  const project = normalizeProject({ ...createBlankProject(), page: { ...createBlankProject().page, sections: [nav, footer] } });
  const html = generateHtml(project);
  const css = generateCss(project);
  assert.match(html, /<nav class="cf-container" aria-label="Main navigation">/);
  assert.match(html, /<footer class="cf-container" aria-label="Site footer">/);
  assert.match(html, /cf-component-navigation/);
  assert.match(css, /cf-component-navigation \.cf-container \{ display: flex; flex-direction: row/);
  assert.match(css, /cf-component-footer \.cf-container \{ display: flex; flex-direction: row/);
});

test('component kind import values and design-system UI are safely wired', async () => {
  const project = createStarterProject();
  project.page.sections[0].componentKind = 'script-injection';
  const normalized = normalizeProject(project);
  assert.equal(normalized.page.sections[0].componentKind, null);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(html, /id="designSystemBtn"/);
  assert.match(html, /name="color-primary"/);
  assert.match(html, /data-design-preset="editorial"/);
  assert.match(html, /value="navigation"/);
  assert.match(html, /value="footer"/);
  assert.match(appSource, /function readDesignSystemForm\(\)/);
  assert.match(appSource, /normalizeDesignSystem\(/);
  assert.match(appSource, /applyDesignTokensToNode\(createElementNode/);
});

test('legacy token inference is one-time and manual same-value edits detach from shared tokens', () => {
  const legacy = normalizeProject({
    schemaVersion: 7, id: 'legacy-token-project', name: 'Legacy tokens',
    page: { id: 'page-home', name: 'Home', title: 'Legacy tokens', sections: [{
      id: 'legacy-section', anchor: 'legacy', name: 'Legacy section', backgroundColor: '#ffffff',
      paddingY: 80, maxWidth: 920, gap: 24, layout: 'stack', contentAlign: 'center', children: [
        { id: 'legacy-heading', type: 'heading', text: 'Legacy heading', color: '#1c1830', fontSize: 42, fontWeight: '800', fontFamily: 'system' },
        { id: 'legacy-button', type: 'button', text: 'Legacy button', backgroundColor: '#7055ed', borderRadius: 12 }
      ]
    }] }
  });
  const section = legacy.page.sections[0];
  const heading = section.children[0];
  const button = section.children[1];
  assert.equal(section.designTokens.backgroundColor, 'page');
  assert.equal(legacy.page.designTokens.backgroundColor, 'page');
  assert.equal(section.designTokens.paddingY, 'section');
  assert.equal(heading.designTokens.color, 'text');
  assert.equal(button.designTokens.backgroundColor, 'primary');

  // A deliberate inspector edit detaches the property, even if its value still
  // happens to equal the old/default token value.
  delete button.designTokens.backgroundColor;
  delete section.designTokens.backgroundColor;
  delete legacy.page.designTokens.backgroundColor;
  legacy.designSystem.colors.primary = '#087d73';
  const exportedCss = generateCss(legacy);
  assert.match(exportedCss, /--cf-color-primary:\s*#087d73/);
  assert.match(exportedCss, new RegExp(`\\.node-${button.id} \\{[^}]*background: #7055ed;`));
  assert.match(exportedCss, new RegExp(`\\.node-${section.id} \\{[^}]*background-color: #ffffff;`));
  assert.match(exportedCss, /body \{[^}]*background: #ffffff/);

  // Once a project has a designSystem object, normalization must not infer a
  // deleted token role again.
  const roundTrip = normalizeProject(legacy);
  assert.equal(roundTrip.page.sections[0].children[1].designTokens.backgroundColor, undefined);
  assert.equal(roundTrip.page.designTokens.backgroundColor, undefined);
});

// v1.4 — Multi-page site regression coverage

test('legacy single-page backups migrate into a one-page site without losing content', () => {
  const legacy = createStarterProject();
  delete legacy.pages;
  delete legacy.activePageId;
  delete legacy.siteChrome;
  const normalized = normalizeProject(legacy);
  assert.equal(normalized.pages.length, 1);
  assert.equal(normalized.activePageId, normalized.page.id);
  assert.equal(normalized.pages[0], normalized.page);
  assert.equal(normalized.page.slug, 'home-page');
  assert.equal(normalized.page.sections.length, legacy.page.sections.length);
  assert.equal(normalized.siteChrome.navigationEnabled, false);
  assert.equal(normalized.siteChrome.footerEnabled, false);
});

test('multi-page imports normalize unique IDs and slugs and preserve the selected page alias', () => {
  const base = createStarterProject();
  const home = structuredClone(base.page);
  home.slug = 'home';
  const about = structuredClone(base.page);
  about.id = 'page-about';
  about.name = 'About';
  about.slug = 'home';
  about.title = 'About our project';
  about.description = 'Learn more about the project.';
  const imported = normalizeProject({
    ...base,
    pages: [home, about],
    page: about,
    activePageId: about.id,
    siteChrome: { navigationEnabled: true, footerEnabled: true, brandName: 'Northstar', footerText: 'Made with care.' }
  });
  assert.equal(imported.pages.length, 2);
  assert.equal(imported.page, imported.pages[1]);
  assert.equal(imported.activePageId, imported.page.id);
  assert.notEqual(imported.pages[0].slug, imported.pages[1].slug);
  assert.notEqual(imported.pages[0].sections[0].id, imported.pages[1].sections[0].id);
  assert.notEqual(imported.pages[0].sections[0].children[0].id, imported.pages[1].sections[0].children[0].id);
  assert.equal(imported.siteChrome.brandName, 'Northstar');
  assert.equal(imported.siteChrome.footerText, 'Made with care.');
});

test('multi-page HTML exports real documents, shared navigation, SEO metadata, and internal links', () => {
  const project = createStarterProject();
  const home = project.page;
  home.name = 'Home'; home.slug = 'home';
  const about = {
    ...structuredClone(home), id: 'page-about', name: 'About', slug: 'about',
    title: 'About Northstar', description: 'The story behind Northstar.',
    sections: [createSection(0)]
  };
  home.sections[0].children.find((node) => node.type === 'button').href = '@page:page-about';
  project.pages = [home, about]; project.activePageId = home.id; project.page = home;
  project.siteChrome = { navigationEnabled: true, footerEnabled: true, brandName: 'Northstar', footerText: '© 2026 Northstar' };
  const normalized = normalizeProject(project);
  const homeHtml = generateHtml(normalized, { page: normalized.pages[0] });
  const aboutHtml = generateHtml(normalized, { page: normalized.pages[1] });
  assert.match(homeHtml, /href="\.\/about\.html"/);
  assert.match(homeHtml, /<header class="cf-site-header">/);
  assert.match(homeHtml, /<nav class="cf-site-navigation" aria-label="Main navigation">/);
  assert.match(homeHtml, /aria-current="page"/);
  assert.match(homeHtml, /<footer class="cf-site-footer">/);
  assert.match(homeHtml, /© 2026 Northstar/);
  assert.match(aboutHtml, /<title>About Northstar<\/title>/);
  assert.match(aboutHtml, /name="description" content="The story behind Northstar\."/);
  assert.match(aboutHtml, /<body id="cf-page-about">/);
  assert.match(aboutHtml, /href="\.\/index\.html"/);
  assert.match(generateCss(normalized, { page: normalized.pages[1] }), /body#cf-page-about \.cf-page/);
});

test('invalid internal page references safely export as a non-executable placeholder', () => {
  const project = createStarterProject();
  project.page.sections[0].children.find((node) => node.type === 'button').href = '@page:missing-target';
  const normalized = normalizeProject(project);
  const html = generateHtml(normalized);
  assert.match(html, /href="#"/);
  assert.doesNotMatch(html, /javascript:/i);
});

test('preview bridge routes internal navigation into the active editor page', () => {
  const base = createStarterProject();
  const home = base.page;
  const about = { ...structuredClone(home), id: 'page-about', name: 'About', slug: 'about', sections: [] };
  home.sections[0].children.find((node) => node.type === 'button').href = '@page:page-about';
  base.pages = [home, about]; base.activePageId = home.id; base.page = home;
  base.siteChrome = { navigationEnabled: true, footerEnabled: false, brandName: 'Northstar', footerText: '' };
  const preview = generatePreviewDocument(normalizeProject(base), null, 'desktop');
  assert.match(preview, /data-cf-page-id="page-about"/);
  assert.match(preview, /canvasflow:navigate/);
  assert.match(preview, /postMessage/);
});

test('site export asset collection includes images from every page', () => {
  const project = createStarterProject();
  const home = project.page;
  const about = { ...structuredClone(home), id: 'page-about', name: 'About', slug: 'about', sections: [createSection(0)] };
  const image = createElementNode('image', about.sections[0].anchor);
  image.src = TINY_PNG;
  about.sections[0].children.push(image);
  project.pages = [home, about]; project.activePageId = home.id; project.page = home;
  const normalized = normalizeProject(project);
  const assets = collectExportAssets(normalized);
  const paths = Object.keys(assets);
  assert.equal(paths.length, 1);
  assert.match(paths[0], /assets\/.*\.png$/);
});

test('v1.4 page manager and shared site chrome controls are wired in the editor', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(html, /id="pageList"/);
  assert.match(html, /id="addPageBtn"/);
  assert.match(html, /id="duplicatePageBtn"/);
  assert.match(html, /id="deletePageBtn"/);
  assert.match(html, /id="siteChromeBtn"/);
  assert.match(html, /id="siteChromeDialog"/);
  assert.match(html, /id="siteNavEnabled"/);
  assert.match(html, /id="siteFooterEnabled"/);
  assert.match(appSource, /function renderPageManager\(\)/);
  assert.match(appSource, /function createPage\(\)/);
  assert.match(appSource, /function duplicateCurrentPage\(\)/);
  assert.match(appSource, /function deleteCurrentPage\(\)/);
  assert.match(appSource, /function activatePage\(/);
  assert.match(appSource, /function exportWebsite\(\)/);
  assert.match(appSource, /canvasflow:navigate/);
  assert.match(appSource, /node\.href === `@page:\$\{project\.page\.id\}`\) node\.href = `@page:\$\{copy\.id\}`/);
  assert.match(appSource, /node\.href\.startsWith\('@page:'\) \? '#hero' : node\.href/);
  assert.match(appSource, /input\.dataset\.prop !== 'pageLink'/);
});

test('secondary page slugs cannot collide with the reserved home document filename', () => {
  const base = createStarterProject();
  const home = { ...structuredClone(base.page), slug: 'home' };
  const secondary = { ...structuredClone(home), id: 'page-secondary', name: 'Secondary', slug: 'index' };
  const normalized = normalizeProject({ ...base, pages: [home, secondary], page: home, activePageId: home.id });
  assert.equal(normalized.pages[0].slug, 'home');
  assert.equal(normalized.pages[1].slug, 'index-2');
  assert.match(generateHtml(normalized, { page: normalized.pages[1] }), /<body id="cf-page-index-2">/);
  assert.throws(() => normalizeProject({ ...base, pages: [home, secondary, ...Array(19).fill(secondary)], page: home, activePageId: home.id }), /maximum 20/);
});


test('v1.5 vector layers normalize bounded editable anchors and export as semantic inline SVG', () => {
  const project = createStarterProject();
  const vector = createElementNode('vector', 'hero');
  vector.name = 'Curve <script>alert(1)</script>';
  vector.vectorKind = 'bezier';
  vector.points = [
    { x: -20, y: 900, outX: 1200, outY: 80 },
    { x: 500, y: 300, inX: 400, inY: 200, outX: 620, outY: 400 },
    { x: 1200, y: -40 }
  ];
  vector.strokeWidth = 100;
  vector.fillColor = 'red; } body { display:none';
  vector.closed = true;
  vector.positionMode = 'overlay';
  vector.xPercent = 75;
  vector.yPercent = 30;
  project.page.sections[0].children.push(vector);
  const normalized = normalizeProject(project);
  const saved = findNode(normalized, vector.id).node;
  assert.equal(saved.type, 'vector');
  assert.equal(saved.points.length, 3);
  assert.deepEqual(saved.points[0], { x: 0, y: 600, outX: 1000, outY: 80 });
  assert.equal(saved.points[2].x, 1000);
  assert.equal(saved.points[2].y, 0);
  assert.equal(saved.strokeWidth, 40);
  assert.equal(saved.fillColor, '#8c75f5');
  assert.match(vectorPathData(saved), / C /);
  assert.match(vectorPathData(saved), / Z$/);
  const html = generateHtml(normalized);
  assert.match(html, /<svg class="cf-vector/);
  assert.match(html, /viewBox="0 0 1000 600"/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  const css = generateCss(normalized);
  assert.match(css, /\.node-[a-zA-Z0-9_-]+\[data-cf-position="overlay"\] \{ position: absolute/);
  assert.match(css, /\.cf-vector \{/);
});

test('standalone SVG exports safe title, bounded geometry, fill and stroke', () => {
  const vector = createElementNode('vector', 'hero');
  vector.name = 'My <Vector>';
  vector.points = [{ x: 0, y: 500 }, { x: 500, y: 100 }, { x: 1000, y: 500 }];
  vector.fillColor = '#123456';
  vector.strokeColor = '#abcdef';
  vector.strokeWidth = 7;
  vector.closed = true;
  const svg = generateVectorSvg(vector);
  assert.match(svg, /^<\?xml version="1.0"/);
  assert.match(svg, /<title id="cf-svg-title">My &lt;Vector&gt;<\/title>/);
  assert.match(svg, /fill="#123456" stroke="#abcdef" stroke-width="7"/);
  assert.match(svg, /<path d="M 0 500 C /);
  assert.doesNotMatch(svg, /<script/i);
});

test('vector drawing tools and anchor inspector are wired into the editor bridge', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const modelSource = await readFile(new URL('../src/model.js', import.meta.url), 'utf8');
  assert.match(html, /data-vector-tool="freehand"/);
  assert.match(html, /data-vector-tool="bezier"/);
  assert.match(html, /data-vector-tool="rect"/);
  assert.match(html, /data-vector-tool="ellipse"/);
  assert.match(appSource, /function applyVectorDrawing\(message\)/);
  assert.match(appSource, /function updateVectorAnchor\(input\)/);
  assert.match(appSource, /data-vector-add-anchor/);
  assert.match(appSource, /data-vector-export/);
  assert.match(modelSource, /canvasflow:create-vector/);
  assert.match(modelSource, /canvasflow:set-vector-tool/);
  assert.match(modelSource, /function finishVectorDraft\(state\)/);
  assert.match(appSource, /inX.*inY.*outX.*outY/);
  const project = createStarterProject();
  project.page.sections[0].children.push(createElementNode('vector', 'hero'));
  const preview = generatePreviewDocument(normalizeProject(project), null, 'desktop', { vectorTool: 'bezier' });
  const scripts = [...preview.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new Script(scripts[0]));
  assert.match(scripts[0], /canvasflow:create-vector/);
  assert.match(scripts[0], /pointerdown/);
});

test('Bézier control handles are normalized, editable, and used in SVG path geometry', () => {
  const project = createStarterProject();
  const vector = createElementNode('vector', 'hero');
  vector.vectorKind = 'bezier';
  vector.points = [
    { x: 100, y: 500, outX: 250, outY: 100 },
    { x: 900, y: 100, inX: 750, inY: 500 }
  ];
  project.page.sections[0].children.push(vector);
  const saved = findNode(normalizeProject(project), vector.id).node;
  assert.equal(saved.points[0].outX, 250);
  assert.equal(saved.points[0].outY, 100);
  assert.equal(saved.points[1].inX, 750);
  assert.equal(saved.points[1].inY, 500);
  assert.equal(vectorPathData(saved), 'M 100 500 C 250 100 750 500 900 100');
  const svg = generateVectorSvg(saved);
  assert.match(svg, /C 250 100 750 500 900 100/);
});

test('vector imports cap anchor count and discard unsafe numeric geometry', () => {
  const project = createStarterProject();
  const raw = createElementNode('vector', 'hero');
  raw.points = Array.from({ length: 100 }, (_, index) => ({ x: index * 20, y: index * 10 }));
  raw.strokeColor = 'url(javascript:alert(1))';
  raw.strokeWidth = -5;
  project.page.sections[0].children.push(raw);
  const normalized = normalizeProject(project);
  const saved = findNode(normalized, raw.id).node;
  assert.equal(saved.points.length, 80);
  assert.equal(saved.points.at(-1).x, 1000);
  assert.equal(saved.strokeColor, '#3b2d6b');
  assert.equal(saved.strokeWidth, 0);
});


test('v1.6 typography pairings and scale presets normalize safely and update linked node roles', () => {
  const project = createStarterProject();
  project.designSystem.typography = { pairing: 'editorial', scalePreset: 'expressive', baseSize: 17, ratio: 1.25, headingFont: 'serif', bodyFont: 'humanist', headingWeight: '800', bodyWeight: '400' };
  const normalized = normalizeProject(project);
  const scale = getTypographyScale(normalized.designSystem);
  assert.deepEqual(scale, { body: 17, button: 17, h3: 27, h2: 33, h1: 42 });
  const heading = createElementNode('heading', 'hero'); heading.level = 1;
  applyDesignTokensToNode(heading, normalized.designSystem);
  assert.equal(heading.fontFamily, 'serif');
  assert.equal(heading.fontSize, 42);
  assert.equal(heading.designTokens.fontSize, 'h1');
  const css = generateCss({ ...normalized, page: { ...normalized.page, sections: [{ ...normalized.page.sections[0], children: [heading] }] } });
  assert.match(css, /--cf-font-heading: Georgia/);
  assert.match(css, /--cf-type-h1-base: 42px/);
  assert.match(css, /@media \(max-width: 760px\).*--cf-type-h1:/s);
});

test('asset library sanitizes filenames and SVG, validates raster signatures, and rejects active content', () => {
  const project = createStarterProject();
  const safeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 2 L22 22" stroke="#000000" stroke-width="2" fill="none"/></svg>';
  const svgUrl = `data:image/svg+xml;base64,${Buffer.from(safeSvg).toString('base64')}`;
  const normalized = normalizeProject({ ...project, assets: [
    { id: 'asset-logo', name: '../Brand mark.svg', mime: 'image/svg+xml', dataUrl: svgUrl, width: 24, height: 24 },
    { id: 'asset-png', name: 'tiny.png', mime: 'image/png', dataUrl: TINY_PNG }
  ] });
  assert.equal(normalized.assets.length, 2);
  assert.equal(normalized.assets[0].name, 'Brand-mark.svg');
  assert.match(normalized.assets[0].dataUrl, /^data:image\/svg\+xml;base64,/);
  assert.equal(normalized.assets[1].mime, 'image/png');
  assert.throws(() => sanitizeSvgDataUrl(`data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>').toString('base64')}`), /attribute|unsupported/i);
  assert.throws(() => sanitizeSvgDataUrl(`data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64')}`), /repeated/i);
  assert.throws(() => sanitizeSvgDataUrl(`data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64')}`), /active content|unsupported/i);
  assert.throws(() => normalizeProject({ ...project, assets: [{ id: 'broken-png', name: 'broken.png', mime: 'image/png', dataUrl: `data:image/png;base64,${Buffer.from('<script>').toString('base64')}` }] }), /invalid or mismatched/i);
});

test('asset library enforces the aggregate storage cap and rejects unsupported asset types', () => {
  const project = createStarterProject();
  const makeLargePng = () => { const bytes = Buffer.alloc(800_000); Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes); return `data:image/png;base64,${bytes.toString('base64')}`; };
  assert.throws(() => normalizeProject({ ...project, assets: [
    { id: 'large-a', name: 'large-a.png', mime: 'image/png', dataUrl: makeLargePng() },
    { id: 'large-b', name: 'large-b.png', mime: 'image/png', dataUrl: makeLargePng() }
  ] }), /1.5 MB total storage limit/i);
  assert.throws(() => normalizeProject({ ...project, assets: [{ id: 'bad-type', name: 'bad.png', mime: 'image/bmp', dataUrl: TINY_PNG }] }), /invalid or mismatched image data/i);
});

test('asset library reuses one sanitized asset across pages and deduplicates export files', () => {
  const project = createStarterProject();
  const svgMarkup = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="#7055ed"/></svg>';
  const svgUrl = `data:image/svg+xml;base64,${Buffer.from(svgMarkup).toString('base64')}`;
  project.assets = [{ id: 'brand-icon', name: 'brand-icon.svg', mime: 'image/svg+xml', dataUrl: svgUrl, width: 12, height: 12 }];
  const firstImage = createElementNode('image', 'hero'); firstImage.assetId = 'brand-icon'; firstImage.src = '';
  project.page.sections[0].children.push(firstImage);
  const secondPage = JSON.parse(JSON.stringify(project.page));
  secondPage.id = 'page-about'; secondPage.name = 'About'; secondPage.slug = 'about'; secondPage.title = 'About';
  secondPage.sections[0].children[0].assetId = 'brand-icon'; secondPage.sections[0].children[0].src = '';
  project.pages = [project.page, secondPage]; project.activePageId = project.page.id;
  const normalized = normalizeProject(project);
  const files = collectExportAssets(normalized);
  assert.equal(Object.keys(files).length, 1);
  assert.match(Object.keys(files)[0], /^assets\/asset-[a-f0-9]+\.svg$/);
  const htmlHome = generateHtml(normalized, { page: normalized.pages[0], exportAssets: true });
  const htmlAbout = generateHtml(normalized, { page: normalized.pages[1], exportAssets: true });
  assert.match(htmlHome, /src="assets\/asset-[a-f0-9]+\.svg"/);
  assert.match(htmlAbout, /src="assets\/asset-[a-f0-9]+\.svg"/);
});

test('custom responsive image focal positions survive normalization and export to CSS', () => {
  const project = createStarterProject();
  const image = createElementNode('image', 'hero'); image.src = TINY_PNG;
  image.objectPosition = '37% 64%';
  image.responsive = { tablet: { objectPosition: '22% 78%' }, mobile: { objectPosition: '81% 19%' } };
  project.page.sections[0].children.push(image);
  const normalized = normalizeProject(project);
  const saved = findNode(normalized, image.id).node;
  assert.equal(saved.objectPosition, '37% 64%');
  assert.deepEqual(saved.responsive, { tablet: { objectPosition: '22% 78%' }, mobile: { objectPosition: '81% 19%' } });
  const css = generateCss(normalized);
  assert.match(css, /object-position: 22% 78%/);
  assert.match(css, /object-position: 81% 19%/);
  assert.doesNotMatch(css, /object-position: [^;]*(?:javascript|url\()/i);
});

test('v1.6 typography and asset library controls are connected in the editor UI', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const modelSource = await readFile(new URL('../src/model.js', import.meta.url), 'utf8');
  assert.match(html, /id="assetLibraryBtn"/);
  assert.match(html, /id="assetLibraryDialog"/);
  assert.match(html, /accept="image\/png,image\/jpeg,image\/webp,image\/gif,image\/svg\+xml/);
  assert.match(html, /name="type-pairing"/);
  assert.match(html, /name="type-scalePreset"/);
  assert.match(html, /id="typeScalePreview"/);
  assert.match(appSource, /function handleAssetUploads\(/);
  assert.match(appSource, /function renderAssetLibrary\(/);
  assert.match(appSource, /function renderTypeScalePreview\(/);
  assert.match(appSource, /data-crop-preset/);
  assert.match(appSource, /const STORAGE_KEY = 'canvasflow\.mvp\.project\.v12'/);
  assert.match(appSource, /const LEGACY_STORAGE_KEYS = \[\'canvasflow\.mvp\.project\.v11'/);
  assert.match(modelSource, /function hasValidRasterSignature\(/);
  assert.match(modelSource, /function normalizeAssetLibrary\(/);
});


test('v1.7 component definitions stay linked across pages while instance content overrides remain local', () => {
  const project = createStarterProject();
  const sourceHeading = project.page.sections[0].children[0];
  const definition = createComponentDefinition(project, sourceHeading, 'Shared heading');
  const firstInstance = { id: 'instance-home', type: 'component', componentId: definition.id, variant: 'default', overrides: { text: 'Home-specific title' } };
  project.page.sections[0].children[0] = firstInstance;
  const aboutPage = structuredClone(project.page);
  aboutPage.id = 'page-about'; aboutPage.name = 'About'; aboutPage.slug = 'about'; aboutPage.title = 'About us';
  aboutPage.sections = aboutPage.sections.map((section, index) => ({
    ...section, id: `about-section-${index + 1}`, anchor: index === 0 ? 'about-hero' : `about-${index + 1}`,
    children: index === 0 ? [{ id: 'instance-about', type: 'component', componentId: definition.id, variant: 'default', overrides: {} }] : section.children.map((node, childIndex) => ({ ...node, id: `about-${index + 1}-node-${childIndex + 1}` }))
  }));
  project.pages = [project.page, aboutPage]; project.activePageId = project.page.id;
  const normalized = normalizeProject(project);
  const shared = normalized.components[0];
  shared.template.text = 'Updated shared title';
  const home = resolveComponentInstance(findNode(normalized, 'instance-home').node, normalized);
  const about = resolveComponentInstance(findNode({ ...normalized, page: normalized.pages[1] }, 'instance-about').node, normalized);
  assert.equal(home.text, 'Home-specific title', 'instance text override remains local');
  assert.equal(about.text, 'Updated shared title', 'unmodified instance follows the shared master');
  assert.equal(normalized.schemaVersion, 12);
  assert.equal(normalized.components.length, 1);
  const aboutHtml = generateHtml(normalized, { page: normalized.pages[1] });
  const aboutCss = generateCss(normalized, { page: normalized.pages[1] });
  assert.match(aboutHtml, /Updated shared title/);
  assert.match(aboutCss, /\.node-instance-about/);
});

test('v1.7 component instances render semantic elements and shared styles in page-specific exports', () => {
  const project = createStarterProject();
  const source = project.page.sections[0].children[2];
  const definition = createComponentDefinition(project, source, 'Primary action');
  definition.template.text = 'Launch';
  definition.template.interaction = { action: 'toggle', targetId: 'details' };
  const instance = { id: 'action-instance', type: 'component', componentId: definition.id, variant: 'primary', overrides: { text: 'Open details' } };
  project.page.sections[0].children[2] = instance;
  const normalized = normalizeProject(project);
  const html = generateHtml(normalized, { exportAssets: true });
  const css = generateCss(normalized);
  assert.match(html, /class="cf-button node-action-instance/);
  assert.match(html, /data-cf-action="toggle" data-cf-target="details"/);
  assert.match(html, />Open details<\/a>/);
  assert.match(html, /action === 'toggle'/);
  assert.match(css, /\.node-action-instance:hover/);
  assert.match(css, /\.node-action-instance:focus-visible/);
  assert.match(css, /\.node-action-instance:active/);
});

test('v1.7 component variants sanitize style values and clamp interaction states', () => {
  const project = createStarterProject();
  const button = project.page.sections[0].children[2];
  const definition = createComponentDefinition(project, button, 'Button styles');
  definition.variants = {
    brand: { backgroundColor: '#123456', hoverBackgroundColor: '#654321', hoverTextColor: '#ffffff', focusOutlineColor: '#abcdef', activeScale: 0.94 },
    hostile: { backgroundColor: 'red; } body { display:none', hoverBackgroundColor: 'url(javascript:bad)', activeScale: 4, text: '<img src=x onerror=alert(1)>' }
  };
  const normalized = normalizeProject(project);
  const variants = normalized.components[0].variants;
  assert.equal(variants.brand.backgroundColor, '#123456');
  assert.equal(variants.brand.hoverBackgroundColor, '#654321');
  assert.equal(variants.brand.activeScale, 0.94);
  definition.template.designTokens = { backgroundColor: 'primary' };
  const withLinkedToken = normalizeProject(project);
  const instance = { id: 'variant-instance', type: 'component', componentId: definition.id, variant: 'brand', overrides: {} };
  const resolved = resolveComponentInstance(instance, withLinkedToken);
  assert.equal(resolved.designTokens.backgroundColor, undefined, 'variant colours detach the matching design token role');
  const variantProject = structuredClone(withLinkedToken); variantProject.page.sections[0].children[0] = instance;
  assert.match(generateCss(normalizeProject(variantProject)), /background: #123456/);
  assert.equal(variants.hostile.backgroundColor, undefined);
  assert.equal(variants.hostile.hoverBackgroundColor, undefined);
  assert.equal(variants.hostile.activeScale, 1);
  assert.doesNotMatch(generateCss(normalized), /javascript:bad|display:none/);
});

test('v1.7 image components retain shared library assets and export one reusable file', () => {
  const project = createStarterProject();
  project.assets = [{ id: 'asset-shared-logo', name: 'logo.png', mime: 'image/png', dataUrl: TINY_PNG }];
  const section = project.page.sections[0];
  const image = createElementNode('image', section.anchor);
  image.assetId = 'asset-shared-logo'; image.alt = 'Shared logo';
  const definition = createComponentDefinition(project, image, 'Shared logo');
  section.children.push({ id: 'shared-logo-one', type: 'component', componentId: definition.id, variant: 'default', overrides: {} });
  section.children.push({ id: 'shared-logo-two', type: 'component', componentId: definition.id, variant: 'default', overrides: { alt: 'Alternative label' } });
  const normalized = normalizeProject(project);
  const assets = collectExportAssets(normalized);
  const paths = Object.keys(assets);
  assert.equal(paths.length, 1, 'two linked image instances share one exported asset');
  const html = generateHtml(normalized, { exportAssets: true });
  assert.equal((html.match(new RegExp(paths[0].replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'g')) || []).length, 2);
  assert.match(html, /alt="Alternative label"/);
});

test('v1.7 button interactions accept only safe actions and export accessible runtime hooks', () => {
  const project = createStarterProject();
  const button = project.page.sections[0].children[2];
  button.interaction = { action: 'toggle', targetId: 'feature-panel' };
  const normalized = normalizeProject(project);
  const html = generateHtml(normalized, { exportAssets: true });
  assert.match(html, /data-cf-action="toggle" data-cf-target="feature-panel"/);
  assert.match(html, /target\.setAttribute\('aria-hidden'/);
  assert.match(html, /cf-interaction-force-visible/);
  assert.match(html, /window\.getComputedStyle/);
  button.interaction = { action: 'javascript:alert(1)', targetId: 'onclick=bad' };
  const unsafe = normalizeProject(project);
  assert.equal(findNode(unsafe, button.id).node.interaction.action, 'none');
  assert.equal(findNode(unsafe, button.id).node.interaction.targetId, '');
  assert.doesNotMatch(generateHtml(unsafe), /data-cf-action="javascript/);
});

test('v1.7 exported interaction runtime toggles initially hidden sections and keeps ARIA state in sync', () => {
  const project = createStarterProject();
  const button = project.page.sections[0].children[2];
  button.interaction = { action: 'toggle', targetId: 'feature-panel' };
  const html = generateHtml(normalizeProject(project));
  const match = html.match(/<script>\s*(\(function \(\) \{\s*'use strict';\s*document\.addEventListener\('click',[\s\S]*?\}\(\)\);)\s*<\/script>/);
  assert.ok(match, 'interaction runtime script is emitted');
  const eventHandlers = {};
  const attributes = {};
  const classes = new Set();
  const target = {
    hidden: true,
    classList: { toggle(name, force) { if (force) classes.add(name); else classes.delete(name); }, contains(name) { return classes.has(name); } },
    setAttribute(name, value) { attributes[name] = value; },
    scrollIntoView() {}
  };
  const control = { getAttribute(name) { return name === 'data-cf-action' ? action : name === 'data-cf-target' ? 'feature-panel' : null; } };
  const document = { addEventListener(type, handler) { eventHandlers[type] = handler; }, getElementById(id) { return id === 'feature-panel' ? target : null; } };
  const window = { getComputedStyle(element) { return { display: element.hidden ? 'none' : 'flex' }; }, matchMedia() { return { matches: false }; } };
  new Script(match[1]).runInNewContext({ document, window });
  let action = 'toggle';
  const click = () => eventHandlers.click({ target: { closest: () => control }, preventDefault() {} });
  click();
  assert.equal(target.hidden, false, 'toggle reveals an initially hidden section');
  assert.equal(attributes['aria-hidden'], 'false');
  assert.equal(classes.has('cf-interaction-force-visible'), true);
  click();
  assert.equal(target.hidden, true, 'second toggle hides the section again');
  assert.equal(attributes['aria-hidden'], 'true');
  action = 'show'; click();
  assert.equal(target.hidden, false);
  action = 'hide'; click();
  assert.equal(target.hidden, true);
});

test('v1.7 component and interaction studio controls are present and correctly connected', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const model = await readFile(new URL('../src/model.js', import.meta.url), 'utf8');
  assert.match(html, /id="componentsBtn"/);
  assert.match(html, /id="componentsDialog"/);
  assert.match(html, /id="componentLibraryContent"/);
  assert.match(app, /function createComponentFromSelection\(/);
  assert.match(app, /function saveComponentMaster\(/);
  assert.match(app, /function addComponentVariant\(/);
  assert.match(app, /data-component-override/);
  assert.match(app, /data-prop="interactionAction"/);
  assert.match(app, /const STORAGE_KEY = 'canvasflow\.mvp\.project\.v12'/);
  assert.match(app, /const LEGACY_STORAGE_KEYS = \['canvasflow\.mvp\.project\.v11'/);
  assert.match(model, /export function createComponentDefinition\(/);
  assert.match(model, /export function resolveComponentInstance\(/);
  assert.match(model, /function normalizeButtonInteraction\(/);
});

test('project storage skips damaged newer saves and recovers the first valid older backup', () => {
  const values = new Map([
    ['current', '{not-json'],
    ['legacy-v7', JSON.stringify({ schemaVersion: 7, name: 'Older valid project' })]
  ]);
  const storage = { getItem: (key) => values.get(key) ?? null };
  const result = loadFirstValidProject(storage, ['current', 'legacy-v7', 'legacy-v6'], (value) => {
    if (value.schemaVersion !== 7) throw new Error('Unsupported test project');
    return value;
  });
  assert.equal(result.project.name, 'Older valid project');
  assert.equal(result.key, 'legacy-v7');
  assert.equal(result.errors.length, 1);
  assert.equal(result.storageUnavailable, false);
});

test('project storage distinguishes primary-save failure from optional compatibility-copy failure', () => {
  const values = new Map();
  const storage = {
    setItem(key, value) {
      if (key === 'compat') throw new Error('Quota exceeded');
      values.set(key, value);
    }
  };
  const result = writeProjectSaves(storage, {
    currentKey: 'current', serialized: '{"schemaVersion":8}',
    compatibilityKey: 'compat', compatibilitySerialized: '{"schemaVersion":5}'
  });
  assert.equal(result.saved, true);
  assert.equal(result.compatibilitySaved, false);
  assert.equal(values.get('current'), '{"schemaVersion":8}');
  const failed = writeProjectSaves({ setItem() { throw new Error('Storage unavailable'); } }, {
    currentKey: 'current', serialized: '{}'
  });
  assert.equal(failed.saved, false);
});

test('asset export names use a longer fingerprint and do not merge distinct library assets', () => {
  const project = createStarterProject();
  const svgA = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#111111"/></svg>';
  const svgB = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#222222"/></svg>';
  project.assets = [
    { id: 'asset-a', name: 'a.svg', mime: 'image/svg+xml', dataUrl: `data:image/svg+xml;base64,${Buffer.from(svgA).toString('base64')}` },
    { id: 'asset-b', name: 'b.svg', mime: 'image/svg+xml', dataUrl: `data:image/svg+xml;base64,${Buffer.from(svgB).toString('base64')}` }
  ];
  const first = createElementNode('image', 'hero'); first.assetId = 'asset-a';
  const second = createElementNode('image', 'hero'); second.assetId = 'asset-b';
  project.page.sections[0].children.push(first, second);
  const normalized = normalizeProject(project);
  const files = collectExportAssets(normalized);
  const names = Object.keys(files);
  assert.equal(names.length, 2);
  assert.match(names[0], /^assets\/asset-[a-f0-9]{16}\.svg$/);
  assert.notEqual(names[0], names[1]);
});

test('asset upload UI preflights count and aggregate bytes before reading selected files', async () => {
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const start = appSource.indexOf('async function handleAssetUploads');
  const body = appSource.slice(start, appSource.indexOf('\nasync function handleImageFile', start));
  assert.ok(body.indexOf('project.assets.length + files.length > 100') < body.indexOf('readAssetFile(file)'));
  assert.ok(body.indexOf('existingBytes + incomingBytes > 1_500_000') < body.indexOf('readAssetFile(file)'));
  assert.match(appSource, /loadFirstValidProject\(window\.localStorage/);
  assert.match(appSource, /writeProjectSaves\(window\.localStorage/);
});

test('v1.7 linked shape and vector instances render component identity and cannot expose broken per-instance canvas handles', async () => {
  const project = createStarterProject();
  const shape = createElementNode('shape', 'hero'); shape.positionMode = 'overlay';
  const vector = createElementNode('vector', 'hero'); vector.positionMode = 'overlay';
  const shapeDefinition = createComponentDefinition(project, shape, 'Shared decoration');
  const vectorDefinition = createComponentDefinition(project, vector, 'Shared illustration');
  const section = project.page.sections[0];
  section.children.push(
    { id: 'shared-shape-instance', type: 'component', componentId: shapeDefinition.id, variant: 'default', overrides: {} },
    { id: 'shared-vector-instance', type: 'component', componentId: vectorDefinition.id, variant: 'default', overrides: {} }
  );
  const normalized = normalizeProject(project);
  const html = generateHtml(normalized);
  assert.match(html, /data-cf-component-id="[^"]+" data-cf-component-variant="default"[^>]*aria-hidden="true"/);
  assert.match(html, /<svg class="cf-vector[^>]+data-cf-component-id="[^"]+"/);
  const overlayStart = html.indexOf('<div class="cf-overlay-layer"');
  const containerStart = html.indexOf('<div class="cf-container"', overlayStart);
  const overlayMarkup = html.slice(overlayStart, containerStart);
  assert.ok(overlayStart >= 0 && containerStart > overlayStart, 'overlay layer is emitted before normal flow content');
  assert.match(overlayMarkup, /data-cf-id="shared-shape-instance"/);
  assert.match(overlayMarkup, /data-cf-id="shared-vector-instance"/);
  const bridge = generatePreviewDocument(normalized, 'shared-shape-instance', 'desktop');
  assert.ok((bridge.match(/hasAttribute\('data-cf-component-id'\)/g) || []).length >= 2,
    'resize-handle and pointer-drag handlers both skip linked instances');
  assert.match(await readFile(new URL('../src/app.js', import.meta.url), 'utf8'), /dimensions and structure stay connected to the shared master/);
});

test('v1.7.1 shape component variants preserve safe shape geometry choices through normalization and export', () => {
  const project = createStarterProject();
  const shape = createElementNode('shape', 'hero');
  shape.shapeKind = 'rectangle';
  const definition = createComponentDefinition(project, shape, 'Shape badge');
  definition.variants.round = { shapeKind: 'circle', backgroundColor: '#123456', width: 140, height: 140 };
  project.page.sections[0].children.push({ id: 'shape-instance-1', type: 'component', componentId: definition.id, variant: 'round', name: 'Round badge', visible: true, locked: false, opacity: 100, overrides: {} });
  const normalized = normalizeProject(project);
  const instance = findNode(normalized, 'shape-instance-1').node;
  const resolved = resolveComponentInstance(instance, normalized);
  assert.equal(normalized.components[0].variants.round.shapeKind, 'circle');
  assert.equal(resolved.shapeKind, 'circle');
  assert.match(generateHtml(normalized), /shape-circle/);
  const invalid = normalizeProject({ ...normalized, components: normalized.components.map((item) => ({ ...item, variants: { ...item.variants, unsafe: { shapeKind: 'url(javascript:alert(1))' } } })) });
  assert.equal(invalid.components[0].variants.unsafe.shapeKind, 'rectangle');
});

test('v1.7.1 component studio exposes editable per-variant style controls and save handling', async () => {
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(appSource, /function componentVariantFields\(component, variantName\)/);
  assert.match(appSource, /function saveComponentVariant\(componentId, variantName\)/);
  assert.match(appSource, /data-component-variant-prop/);
  assert.match(appSource, /data-component-variant-save/);
  assert.match(appSource, /Empty fields inherit from the shared master/);
  assert.match(appSource, /invalidColor = true/);
  assert.match(appSource, /function reopenComponentCard\(componentId, variantName = ''\)/);
  assert.match(css, /\.component-variant-editors/);
  assert.match(css, /@media\(max-width:620px\)\{\.component-variant-fields\{grid-template-columns:1fr\}\}/);
});


test('v1.7.1 local server serves correct static MIME types, handles HEAD efficiently, and rejects writes/traversal', async () => {
  const probe = createNetServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  const serverPath = fileURLToPath(new URL('../server.mjs', import.meta.url));
  const cwd = fileURLToPath(new URL('..', import.meta.url));
  const child = spawn(process.execPath, [serverPath], { cwd, env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`Local server exited with code ${child.exitCode}`);
      try { const response = await fetch(`${base}/`); if (response.ok) { ready = true; break; } } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal(ready, true, 'server should start and serve the editor');
    const home = await fetch(`${base}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /CanvasFlow v2\.1\.0/);
    const cssHead = await fetch(`${base}/styles.css`, { method: 'HEAD' });
    assert.equal(cssHead.status, 200);
    assert.match(cssHead.headers.get('content-type') || '', /text\/css/);
    assert.ok(Number(cssHead.headers.get('content-length')) > 1000);
    assert.equal(await cssHead.text(), '');
    const post = await fetch(`${base}/`, { method: 'POST', body: 'nope' });
    assert.equal(post.status, 405);
    const traversal = await fetch(`${base}/%2e%2e%2fpackage.json`);
    assert.ok([403, 404].includes(traversal.status));
  } finally {
    child.kill('SIGTERM');
    await new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve();
      child.once('exit', resolve);
      setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 1500).unref();
    });
  }
  const serverSource = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');
  for (const mime of ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'font/woff2']) assert.ok(serverSource.includes(mime));
  assert.match(serverSource, /if \(request\.method === 'HEAD'\).*?response\.end\(\); return;/s);
});


test('v2.1 retains the product guide and project actions without changing export styling', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(packageJson.version, '2.1.0');
  assert.match(html, /CanvasFlow v2\.1\.0 — Visual Website Studio/);
  for (const id of ['designSystemBtn', 'assetLibraryBtn', 'componentsBtn', 'newProjectBtn', 'openBtn', 'saveBtn', 'backupBtn', 'importBackupBtn', 'exportBtn']) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} remains available after grouping actions`);
  }
  assert.match(html, /<details class="action-menu">[\s\S]*?id="designSystemBtn"[\s\S]*?id="componentsBtn"[\s\S]*?<\/details>/);
  assert.match(html, /<details class="action-menu">[\s\S]*?id="newProjectBtn"[\s\S]*?id="importBackupBtn"[\s\S]*?<\/details>/);
  assert.match(html, /id="productGuideBtn"/);
  assert.match(html, /id="productGuideDialog"/);
  for (const action of ['new-project', 'design-system', 'tablet', 'export', 'assets', 'components', 'precision', 'shortcuts']) {
    assert.match(html, new RegExp(`data-guide-action="${action}"`));
  }
  for (const text of ['Structure', 'Design', 'Refine', 'Export', 'Your work stays yours']) assert.ok(html.includes(text));
  assert.match(appSource, /productGuideDialog\.showModal\(\)/);
  assert.match(appSource, /destinations = \{[\s\S]*?components: '#componentsBtn'[\s\S]*?precision: '#guidesBtn'[\s\S]*?export: '#exportBtn'/);
  assert.match(appSource, /data-guide-action/);
  assert.match(appSource, /\.action-menu\[open\]/);
  assert.match(css, /\.product-guide-dialog/);
  assert.match(css, /\.guide-step-grid\s*\{[^}]*repeat\(4/);
  assert.match(css, /\.guide-feature-card:hover/);
  assert.match(css, /\.action-menu-popover/);
  assert.match(css, /@media \(max-width: 740px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /--ui-accent: #9A8CFF/);
});


test('prior layer search and canvas tools remain available in the v2.1 workspace', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../styles/editor-experience.css', import.meta.url), 'utf8');
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(packageJson.version, '2.1.0');
  assert.match(html, /CanvasFlow v2\.1\.0 — Visual Website Studio/);
  for (const group of ['Content', 'Media &amp; layout', 'Graphics', 'Vector tools']) assert.ok(html.includes(`aria-label="${group === 'Content' ? 'Content elements' : group === 'Media &amp; layout' ? 'Media and layout elements' : group === 'Graphics' ? 'Graphic elements' : 'Vector drawing tools'}"`));
  for (const id of ['customWidthInput','applyCustomWidthBtn','zoomOutBtn','zoomPercentInput','zoomInBtn','fitCanvasBtn','handToolBtn','centerSelectionBtn','guidesBtn','gridBtn','rulersBtn']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /<details class="canvas-more-menu">[\s\S]*?id="handToolBtn"[\s\S]*?id="rulersBtn"[\s\S]*?<\/details>/);
  assert.match(html, /id="layerSearchInput"/);
  assert.match(html, /id="layerFilterStatus"/);
  assert.match(appSource, /function applyLayerSearch\(\)/);
  assert.match(appSource, /filterContainer\(nested, revealAll\)/);
  assert.match(appSource, /layerSearchInput\?\.addEventListener\('input', applyLayerSearch\)/);
  assert.match(appSource, /layerSearchInput\?\.addEventListener\('keydown'/);
  assert.match(appSource, /key === '\/' && !typing[\s\S]*?layerSearchInput\?\.focus\(\)/);
  assert.match(appSource, /canvas-more-menu\[open\]/);
  assert.match(css, /\.insert-tool-group/);
  assert.match(css, /\.canvas-more-popover/);
  assert.match(css, /\.layer-search:focus-within/);
  assert.match(workspaceCss, /\.property-group \{ margin: 9px 0;[\s\S]*?border-radius: 10px/);
  assert.match(css, /@media \(max-width:1120px\)/);
  assert.match(css, /@media \(max-width:740px\)/);
});


test('v2.1 workspace redesign uses one semantic editor token source and keeps editor tokens out of website output', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../styles/editor-experience.css', import.meta.url), 'utf8');
  const modelSource = await readFile(new URL('../src/model.js', import.meta.url), 'utf8');
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(packageJson.version, '2.1.0');
  assert.equal((css.match(/:root\s*\{/g) || []).length, 1, 'editor design tokens have one canonical root');
  for (const [token, value] of Object.entries({
    '--ui-canvas':'#111318', '--ui-surface-1':'#191C23', '--ui-surface-2':'#20242D', '--ui-surface-3':'#292E39',
    '--ui-border-subtle':'#303642', '--ui-border-strong':'#737E8E', '--ui-text-primary':'#F3F4F6', '--ui-text-secondary':'#BBC2CE',
    '--ui-text-muted':'#9099A8', '--ui-accent':'#9A8CFF', '--ui-accent-strong':'#6455D9', '--ui-focus':'#B6ADFF',
    '--ui-success':'#63C9A5', '--ui-warning':'#F0BC70', '--ui-danger':'#F07D86', '--ui-info':'#79BCEB', '--ui-guide':'#F2B84B'
  })) assert.ok(css.includes(`${token}: ${value}`), `${token} semantic token exists`);
  assert.match(html, /id="insertDialog"[\s\S]*?id="insertSearchInput"[\s\S]*?class="insert-toolbar"/);
  assert.match(html, /id="layerSearchInput"[\s\S]*?<kbd>\/<\/kbd>/);
  assert.doesNotMatch(html.match(/<label class="insert-search">[\s\S]*?<\/label>/)?.[0] || "", /<kbd>/);
  assert.match(html, /id="mobileStructureBtn"[\s\S]*?id="mobileAddBtn"[\s\S]*?id="mobilePropertiesBtn"/);
  assert.match(html, /id="workspaceBackdrop"/);
  assert.match(html, /id="structurePanel"/);
  assert.match(html, /id="propertiesPanel"/);
  assert.match(appSource, /function filterInsertTools\(\)/);
  assert.match(appSource, /categoryMatches = !!query && category\.includes\(query\)/);
  assert.match(appSource, /function openInsertDialog\(\)/);
  assert.match(appSource, /function setWorkspacePanel\(panel/);
  assert.match(appSource, /window\.matchMedia\?\.\('\(max-width: 760px\)'\)/);
  assert.match(appSource, /trigger\?\.focus\?\.\(\{ preventScroll: true \}\)/);
  assert.match(appSource, /workspaceBackdrop\?\.addEventListener\('click', \(\) => setWorkspacePanel\(null\)\)/);
  assert.match(appSource, /inspectorCollapsedGroups/);
  assert.match(appSource, /data-inspector-group/);
  assert.match(html, /href="\.\/styles\/editor-experience\.css"/);
  assert.match(workspaceCss, /\.mobile-workspace-nav/);
  assert.match(workspaceCss, /@media \(max-width: 1100px\)[\s\S]*?\.mobile-workspace-nav \{[^}]*display: none/);
  assert.match(workspaceCss, /@media \(max-width: 760px\)[\s\S]*?\.mobile-workspace-nav \{ display: grid/);
  assert.match(workspaceCss, /@media \(max-width: 760px\)[\s\S]*?\.workspace-add-button \{ display: none/);
  assert.match(workspaceCss, /\.app-shell\.workspace-panel-structure-open \.left-panel/);
  assert.match(workspaceCss, /\.app-shell\.workspace-panel-inspector-open \.inspector-panel/);
  assert.match(workspaceCss, /@media \(forced-colors: active\)/);
  assert.match(workspaceCss, /prefers-reduced-motion: reduce/);
  assert.match(workspaceCss, /\.product-guide-hero \{[^}]*background: var\(--ui-surface-2\)/);
  assert.match(workspaceCss, /\.product-guide-dialog::backdrop \{[^}]*backdrop-filter: none/);
  assert.match(appSource, /window\.matchMedia\?\.\('\(max-width: 760px\)'\)/);
  assert.match(appSource, /trigger\?\.focus\?\.\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(modelSource, /--ui-(?:canvas|surface-1|accent-strong)/, 'editor-only semantic tokens do not enter the project model or site generator');
  const blank = createBlankProject();
  const exportedCss = generateCss(blank);
  assert.doesNotMatch(exportedCss, /--ui-canvas|--ui-surface-1|--ui-accent-strong/);
});

test('v2.1 leaves document schema and project storage identity unchanged', async () => {
  const modelSource = await readFile(new URL('../src/model.js', import.meta.url), 'utf8');
  const appSource = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const project = createStarterProject();
  assert.equal(project.schemaVersion, 12);
  assert.match(appSource, /canvasflow\.mvp\.project\.v12/);
  assert.match(modelSource, /SCHEMA_VERSION\s*=\s*12|schemaVersion:\s*12/);
  assert.match(appSource, /captureEditorState\(\)/);
  assert.match(appSource, /writeProjectSaves\(/);
  assert.match(appSource, /generatePreviewDocument\(/);
});
