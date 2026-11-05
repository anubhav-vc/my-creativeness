import { normalizeFreePositioning, resolveFreePositioning } from './geometry.js';
const FONT_STACKS = {
  system: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: '"Trebuchet MS", Arial, sans-serif',
  humanist: 'Aptos, Calibri, "Segoe UI", sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
};
const FONT_LABELS = { system: 'Modern sans-serif', serif: 'Editorial serif', rounded: 'Rounded sans-serif', humanist: 'Humanist sans-serif', mono: 'Monospace' };
const FONT_PAIRINGS = {
  modern: { headingFont: 'system', bodyFont: 'system' },
  editorial: { headingFont: 'serif', bodyFont: 'humanist' },
  friendly: { headingFont: 'rounded', bodyFont: 'humanist' },
  technical: { headingFont: 'system', bodyFont: 'mono' },
  classic: { headingFont: 'serif', bodyFont: 'serif' }
};
const TYPE_SCALE_PRESETS = { compact: { baseSize: 15, ratio: 1.16 }, balanced: { baseSize: 16, ratio: 1.2 }, expressive: { baseSize: 17, ratio: 1.25 } };
const MAX_ASSETS = 100;
const MAX_ASSET_BYTES = 1_000_000;
const MAX_SVG_BYTES = 350_000;
const MAX_TOTAL_ASSET_BYTES = 1_500_000;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const NODE_TYPES = ['heading', 'paragraph', 'button', 'image', 'card', 'divider', 'shape', 'vector', 'component', 'container'];
const COMPONENT_SOURCE_TYPES = ['heading', 'paragraph', 'button', 'image', 'card', 'divider', 'shape', 'vector'];
const COMPONENT_INSTANCE_OVERRIDES = { heading: ['text'], paragraph: ['text'], button: ['text', 'href'], card: ['title', 'body'], image: ['alt'] };
const COMPONENT_VARIANT_KEYS = ['primary', 'secondary', 'tertiary', 'default'];
const MOTIONS = ['none', 'fade', 'rise', 'slide-left', 'slide-right', 'zoom', 'blur'];
const MOTION_TRIGGERS = ['load', 'viewport', 'hover'];
const MOTION_EASINGS = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'smooth'];
const MOTION_DIRECTIONS = ['normal', 'reverse'];
const MOTION_DEFAULT_DURATIONS = { none: 700, fade: 700, rise: 700, 'slide-left': 650, 'slide-right': 650, zoom: 600, blur: 800 };
const MOTION_KEYFRAMES = { fade: 'cf-fade-in', rise: 'cf-rise-in', 'slide-left': 'cf-slide-left', 'slide-right': 'cf-slide-right', zoom: 'cf-zoom-in', blur: 'cf-blur-in' };
const MOTION_EASING_CSS = { ease: 'ease', 'ease-in': 'ease-in', 'ease-out': 'ease-out', 'ease-in-out': 'ease-in-out', linear: 'linear', smooth: 'cubic-bezier(.2,.75,.25,1)' };
const OBJECT_POSITIONS = ['50% 50%', '50% 0%', '50% 100%', '0% 50%', '100% 50%', '0% 0%', '100% 0%', '0% 100%', '100% 100%'];
const LAYOUTS = ['stack', 'two-column', 'grid', 'flex'];
const FLEX_DIRECTIONS = ['row', 'row-reverse', 'column', 'column-reverse'];
const FLEX_WRAP_OPTIONS = ['wrap', 'nowrap'];
const JUSTIFY_OPTIONS = ['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'];
const ALIGN_ITEMS_OPTIONS = ['start', 'center', 'end', 'stretch'];
const GRID_MODES = ['fixed', 'auto-fit'];
const BREAKPOINTS = ['tablet', 'mobile'];
const NODE_DESIGN_TOKEN_ROLES = {
  heading: { color: ['text'], fontFamily: ['heading'], fontWeight: ['headingWeight'], fontSize: ['h1', 'h2', 'h3'] },
  paragraph: { color: ['muted'], fontFamily: ['body'], fontWeight: ['bodyWeight'], fontSize: ['body'] },
  button: { backgroundColor: ['primary'], borderRadius: ['medium'], fontSize: ['button'] },
  card: { backgroundColor: ['surface'], color: ['text'], borderColor: ['border'], borderRadius: ['large'] },
  divider: { color: ['border'] }
};
const PAGE_DESIGN_TOKEN_ROLES = { backgroundColor: ['page'] };
const SECTION_DESIGN_TOKEN_ROLES = {
  backgroundColor: ['page', 'surface'], paddingY: ['section'], maxWidth: ['content', 'wide'], gap: ['gap']
};

const RESPONSIVE_PROPS = {
  section: ['backgroundColor', 'paddingY', 'paddingX', 'maxWidth', 'gap', 'rowGap', 'columnGap', 'contentAlign', 'layout', 'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'gridMode', 'gridColumns', 'gridMinColumnWidth'],
  container: ['backgroundColor', 'borderColor', 'borderRadius', 'padding', 'paddingX', 'paddingY', 'maxWidth', 'minHeight', 'gap', 'rowGap', 'columnGap', 'layout', 'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'gridMode', 'gridColumns', 'gridMinColumnWidth'],
  heading: ['color', 'fontSize', 'textAlign', 'maxWidth', 'alignSelf'],
  paragraph: ['color', 'fontSize', 'textAlign', 'maxWidth', 'alignSelf'],
  button: ['backgroundColor', 'textColor', 'fontSize', 'borderRadius', 'width', 'alignSelf'],
  image: ['maxWidth', 'height', 'borderRadius', 'objectPosition', 'alignSelf'],
  card: ['backgroundColor', 'color', 'borderColor', 'borderRadius', 'padding', 'maxWidth', 'alignSelf'],
  divider: ['color', 'width', 'height', 'alignSelf'],
  shape: ['backgroundColor', 'width', 'height', 'borderRadius', 'alignSelf', 'xPercent', 'yPercent'],
  vector: ['width', 'height', 'alignSelf', 'xPercent', 'yPercent']
};

const idFrom = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.().replaceAll('-', '').slice(0, 12) || Math.random().toString(36).slice(2, 14)}`;
const deepClone = (value) => JSON.parse(JSON.stringify(value));

export function createDefaultDesignSystem() {
  return {
    colors: { primary: '#7055ed', text: '#1c1830', muted: '#625d78', surface: '#f8f7fc', border: '#e9e6f4', page: '#ffffff' },
    typography: { pairing: 'modern', scalePreset: 'balanced', baseSize: 16, ratio: 1.2, headingFont: 'system', bodyFont: 'system', headingWeight: '800', bodyWeight: '400' },
    radius: { small: 8, medium: 12, large: 18 },
    spacing: { section: 80, gap: 24 },
    width: { content: 920, wide: 1080 }
  };
}

export function normalizeDesignSystem(raw) {
  const defaults = createDefaultDesignSystem();
  const colors = {};
  for (const key of Object.keys(defaults.colors)) colors[key] = isHexColor(raw?.colors?.[key]) ? raw.colors[key] : defaults.colors[key];
  const fontChoices = Object.keys(FONT_STACKS);
  const weights = ['400', '500', '600', '650', '700', '750', '800'];
  const pairing = pick(raw?.typography?.pairing, [...Object.keys(FONT_PAIRINGS), 'custom'], defaults.typography.pairing);
  const scalePreset = pick(raw?.typography?.scalePreset, [...Object.keys(TYPE_SCALE_PRESETS), 'custom'], defaults.typography.scalePreset);
  const scaleDefaults = TYPE_SCALE_PRESETS[scalePreset] || TYPE_SCALE_PRESETS.balanced;
  const pairingDefaults = FONT_PAIRINGS[pairing] || FONT_PAIRINGS.modern;
  const typography = {
    pairing, scalePreset,
    baseSize: clampNumber(raw?.typography?.baseSize, 12, 22, scaleDefaults.baseSize),
    ratio: Math.max(1.1, Math.min(1.333, Number.isFinite(Number(raw?.typography?.ratio)) ? Number(raw.typography.ratio) : scaleDefaults.ratio)),
    headingFont: pick(raw?.typography?.headingFont, fontChoices, pairingDefaults.headingFont),
    bodyFont: pick(raw?.typography?.bodyFont, fontChoices, pairingDefaults.bodyFont),
    headingWeight: pick(String(raw?.typography?.headingWeight ?? defaults.typography.headingWeight), weights, defaults.typography.headingWeight),
    bodyWeight: pick(String(raw?.typography?.bodyWeight ?? defaults.typography.bodyWeight), weights, defaults.typography.bodyWeight)
  };
  const radius = {
    small: clampNumber(raw?.radius?.small, 0, 32, defaults.radius.small),
    medium: clampNumber(raw?.radius?.medium, 0, 40, defaults.radius.medium),
    large: clampNumber(raw?.radius?.large, 0, 48, defaults.radius.large)
  };
  const spacing = {
    section: clampNumber(raw?.spacing?.section, 32, 180, defaults.spacing.section),
    gap: clampNumber(raw?.spacing?.gap, 8, 64, defaults.spacing.gap)
  };
  const width = {
    content: clampNumber(raw?.width?.content, 320, 1200, defaults.width.content),
    wide: clampNumber(raw?.width?.wide, 320, 1200, defaults.width.wide)
  };
  return { colors, typography, radius, spacing, width };
}

export function getTypographyScale(rawDesignSystem) {
  const typography = normalizeDesignSystem(rawDesignSystem).typography;
  const base = typography.baseSize;
  const ratio = typography.ratio;
  return {
    body: base,
    button: Math.max(14, base),
    h3: Math.round(base * ratio ** 2),
    h2: Math.round(base * ratio ** 3),
    h1: Math.round(base * ratio ** 4)
  };
}

function normalizeFocalPosition(value, fallback = '50% 50%') {
  if (typeof value !== 'string') return fallback;
  const match = value.match(/^\s*(\d{1,3})%\s+(\d{1,3})%\s*$/);
  if (!match) return fallback;
  const x = Number(match[1]); const y = Number(match[2]);
  if (x < 0 || x > 100 || y < 0 || y > 100) return fallback;
  return `${x}% ${y}%`;
}

function safeFileName(value, fallback = 'asset') {
  const leaf = String(value || '').split(/[\\/]/).pop() || fallback;
  const clean = leaf.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return clean || fallback;
}

function sanitizeSvgMarkup(source) {
  if (typeof source !== 'string' || source.length > MAX_SVG_BYTES) throw new Error('SVG files must be 350 KB or smaller.');
  let markup = source.replace(/^\uFEFF/, '').replace(/<\?xml[^>]*\?>/gi, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  if (!markup || /<!DOCTYPE|<!ENTITY|<\s*(script|foreignObject|iframe|object|embed|image|use|style|animate|set|filter|mask|pattern)\b/i.test(markup)) throw new Error('This SVG contains unsupported or active content.');
  const allowedTags = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);
  const allowedAttrs = new Set(['xmlns', 'width', 'height', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'clip-rule', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform', 'd', 'points', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'vector-effect', 'id', 'role', 'aria-label']);
  const tokens = markup.match(/<[^>]*>|[^<]+/g) || [];
  if (tokens.join('') !== markup) throw new Error('The SVG markup is malformed.');
  const stack = []; let rootSeen = false; let rootClosed = false; let output = '';
  for (const token of tokens) {
    if (!token.startsWith('<')) {
      if (token.trim()) throw new Error('SVG text nodes are not supported. Convert text to paths before importing.');
      continue;
    }
    const tagMatch = token.match(/^<\s*(\/)?\s*([A-Za-z][A-Za-z0-9]*)\b([\s\S]*?)\s*(\/)?\s*>$/);
    if (!tagMatch) throw new Error('The SVG contains an unsupported tag.');
    const closing = Boolean(tagMatch[1]); const tag = tagMatch[2]; const attrText = tagMatch[3] || ''; const selfClosing = Boolean(tagMatch[4]);
    if (!allowedTags.has(tag)) throw new Error(`SVG element “${tag}” is not supported.`);
    if (closing) {
      if (attrText.trim() || selfClosing || stack.pop() !== tag) throw new Error('The SVG element nesting is invalid.');
      output += `</${tag}>`; if (!stack.length && tag === 'svg') rootClosed = true;
      continue;
    }
    if (rootClosed || (!rootSeen && tag !== 'svg') || (rootSeen && tag === 'svg')) throw new Error('SVG must contain one root <svg> element.');
    if (tag === 'svg') rootSeen = true;
    let rest = attrText; const attrs = []; const seenAttrs = new Set();
    const attrRe = /([A-Za-z_:][A-Za-z0-9_:.-]*)\s*=\s*(["'])(.*?)\2/g;
    let match;
    while ((match = attrRe.exec(attrText))) {
      const name = match[1]; const value = match[3];
      if (seenAttrs.has(name)) throw new Error(`SVG attribute “${name}” is repeated.`);
      seenAttrs.add(name);
      if (!allowedAttrs.has(name)) throw new Error(`SVG attribute “${name}” is not supported.`);
      if (name === 'xmlns' && value !== 'http://www.w3.org/2000/svg') throw new Error('SVG namespace is invalid.');
      if (['fill', 'stroke'].includes(name) && !/^(?:none|currentColor|#[0-9a-fA-F]{3,8}|[a-zA-Z]{1,20})$/.test(value)) throw new Error('SVG fill and stroke must be simple colours.');
      if (['d', 'points'].includes(name) && !/^[MmZzLlHhVvCcSsQqTtAa0-9eE.,+\-\s]+$/.test(value)) throw new Error('SVG path geometry contains unsupported characters.');
      if (name === 'transform' && !/^(?:(?:translate|scale|rotate|skewX|skewY|matrix)\([0-9eE.,+\-\s]+\)\s*)+$/.test(value)) throw new Error('SVG transform is not supported.');
      if (name === 'viewBox' && !/^[0-9eE.,+\-\s]+$/.test(value)) throw new Error('SVG viewBox is invalid.');
      if (['width','height','stroke-width','opacity','fill-opacity','stroke-opacity','cx','cy','r','rx','ry','x','y','x1','y1','x2','y2'].includes(name) && !/^[0-9eE.+\-%]+$/.test(value)) throw new Error(`SVG ${name} value is invalid.`);
      if (name === 'stroke-linecap' && !['butt','round','square'].includes(value)) throw new Error('SVG stroke line cap is invalid.');
      if (name === 'stroke-linejoin' && !['miter','round','bevel'].includes(value)) throw new Error('SVG stroke line join is invalid.');
      if (name === 'vector-effect' && value !== 'non-scaling-stroke') throw new Error('SVG vector effect is invalid.');
      if (name === 'fill-rule' || name === 'clip-rule') { if (!['nonzero','evenodd'].includes(value)) throw new Error(`SVG ${name} is invalid.`); }
      if (name === 'id' && !/^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/.test(value)) throw new Error('SVG ID is invalid.');
      if (name === 'role' && !['img','presentation','group'].includes(value)) throw new Error('SVG role is invalid.');
      if (name === 'aria-label' && (value.length > 120 || /[<>]/.test(value))) throw new Error('SVG label is invalid.');
      attrs.push(`${name}="${value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`);
    }
    rest = attrText.replace(attrRe, '').trim();
    if (rest) throw new Error('SVG attributes must be quoted and supported.');
    output += `<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}${selfClosing ? '/>' : '>'}`;
    if (!selfClosing) stack.push(tag);
    else if (tag === 'svg') rootClosed = true;
  }
  if (!rootSeen || !rootClosed || stack.length || !/^<svg\b/.test(output)) throw new Error('SVG must be a complete, well-formed SVG document.');
  if (!/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(output)) output = output.replace(/^<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
  return output;
}

export function sanitizeSvgDataUrl(dataUrl) {
  const match = typeof dataUrl === 'string' ? dataUrl.match(/^data:image\/svg\+xml;base64,([A-Za-z0-9+/=\r\n]+)$/) : null;
  if (!match) throw new Error('Unsupported SVG data. Upload a valid SVG file.');
  let source;
  try { source = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(match[1].replace(/\s/g, '')), (char) => char.charCodeAt(0))); }
  catch { throw new Error('The SVG file is not valid UTF-8.'); }
  const sanitized = sanitizeSvgMarkup(source);
  const bytes = new TextEncoder().encode(sanitized);
  let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

function normalizeAssetLibrary(rawAssets) {
  if (rawAssets === undefined || rawAssets === null) return [];
  if (!Array.isArray(rawAssets) || rawAssets.length > MAX_ASSETS) throw new Error(`The asset library can contain up to ${MAX_ASSETS} assets.`);
  const seen = new Set(); let totalBytes = 0;
  const output = [];
  for (let index = 0; index < rawAssets.length; index += 1) {
    const raw = rawAssets[index];
    if (!raw || typeof raw !== 'object') throw new Error(`Asset ${index + 1} is invalid.`);
    let id = safeId(raw.id, `asset-${index + 1}`); const base = id; let suffix = 2;
    while (seen.has(id)) id = `${base.slice(0, 56)}-${suffix++}`;
    seen.add(id);
    const mime = raw.mime === 'image/svg+xml' ? 'image/svg+xml' : pick(raw.mime, ['image/png','image/jpeg','image/webp','image/gif'], '');
    let dataUrl = '';
    if (mime === 'image/svg+xml') dataUrl = sanitizeSvgDataUrl(raw.dataUrl);
    else {
      const candidate = safeImageData(raw.dataUrl);
      if (!candidate || !candidate.startsWith(`data:${mime};base64,`) || !hasValidRasterSignature(candidate, mime)) throw new Error(`Asset “${safeText(raw.name, 80) || id}” contains invalid or mismatched image data.`);
      dataUrl = candidate;
    }
    const encoded = dataUrl.slice(dataUrl.indexOf(',') + 1).replace(/\s/g, '');
    const bytes = Math.floor(encoded.length * 3 / 4) - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
    const limit = mime === 'image/svg+xml' ? MAX_SVG_BYTES : MAX_ASSET_BYTES;
    if (!bytes || bytes > limit) throw new Error(`Asset “${safeText(raw.name, 80) || id}” exceeds its size limit.`);
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_ASSET_BYTES) throw new Error('The asset library exceeds the 1.5 MB total storage limit. Remove or resize some assets.');
    output.push({ id, name: safeFileName(raw.name, `asset-${index + 1}`), mime, dataUrl, size: bytes,
      width: clampNumber(raw.width, 0, 10000, 0), height: clampNumber(raw.height, 0, 10000, 0) });
  }
  return output;
}

export function applyDesignTokensToNode(node, rawDesignSystem) {
  if (!node || typeof node !== 'object') return node;
  const ds = normalizeDesignSystem(rawDesignSystem);
  if (node.type === 'heading') {
    node.color = ds.colors.text; node.fontFamily = ds.typography.headingFont; node.fontWeight = ds.typography.headingWeight;
    const role = node.level === 1 ? 'h1' : node.level === 3 ? 'h3' : 'h2'; node.fontSize = getTypographyScale(ds)[role];
    node.designTokens = { ...(node.designTokens || {}), color: 'text', fontFamily: 'heading', fontWeight: 'headingWeight', fontSize: role };
  } else if (node.type === 'paragraph') {
    node.color = ds.colors.muted; node.fontFamily = ds.typography.bodyFont; node.fontWeight = ds.typography.bodyWeight; node.fontSize = getTypographyScale(ds).body;
    node.designTokens = { ...(node.designTokens || {}), color: 'muted', fontFamily: 'body', fontWeight: 'bodyWeight', fontSize: 'body' };
  } else if (node.type === 'button') {
    node.backgroundColor = ds.colors.primary; node.textColor = '#ffffff'; node.borderRadius = ds.radius.medium; node.fontSize = getTypographyScale(ds).button;
    node.designTokens = { ...(node.designTokens || {}), backgroundColor: 'primary', borderRadius: 'medium', fontSize: 'button' };
  } else if (node.type === 'card') {
    node.backgroundColor = ds.colors.surface; node.color = ds.colors.text; node.borderColor = ds.colors.border; node.borderRadius = ds.radius.large;
    node.designTokens = { ...(node.designTokens || {}), backgroundColor: 'surface', color: 'text', borderColor: 'border', borderRadius: 'large' };
  } else if (node.type === 'divider') {
    node.color = ds.colors.border;
    node.designTokens = { ...(node.designTokens || {}), color: 'border' };
  }
  return node;
}

export function createBlankProject() {
  return normalizeProject({
    schemaVersion: 12,
    id: idFrom('canvasflow-project'),
    name: 'Untitled website',
    updatedAt: new Date().toISOString(),
    page: { id: 'page-home', name: 'Home page', title: 'Untitled website', backgroundColor: '#ffffff', sections: [] }
  });
}

export function createStarterProject() {
  return normalizeProject({
    schemaVersion: 12,
    id: 'canvasflow-project-1',
    name: 'Northstar — Creative Studio',
    updatedAt: new Date().toISOString(),
    page: {
      id: 'page-home',
      name: 'Home page',
      title: 'Northstar — Creative Studio',
      backgroundColor: '#ffffff',
      sections: [
        {
          id: 'section-hero', anchor: 'hero', name: 'Hero · Introduction',
          backgroundColor: '#f4f1ff', paddingY: 104, maxWidth: 920, layout: 'stack', contentAlign: 'center', gap: 24, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'start', alignItems: 'stretch', gridMode: 'fixed', gridColumns: 3, gridMinColumnWidth: 240,
          children: [
            { id: 'hero-heading', type: 'heading', level: 1, name: 'Hero heading', text: 'Ideas deserve a beautiful place on the web.', color: '#1c1830', fontSize: 62, fontWeight: '800', fontFamily: 'system', textAlign: 'center', animation: 'rise' },
            { id: 'hero-paragraph', type: 'paragraph', name: 'Hero description', text: 'Northstar is a fictional creative studio. This is your canvas: reshape the story, tune every detail, and export the real website code.', color: '#625d78', fontSize: 18, fontWeight: '400', fontFamily: 'system', textAlign: 'center', animation: 'fade' },
            { id: 'hero-button', type: 'button', name: 'Primary action', text: 'Explore the studio', href: '#work', textColor: '#ffffff', backgroundColor: '#7055ed', fontSize: 16, fontWeight: '700', borderRadius: 12, animation: 'rise' }
          ]
        },
        {
          id: 'section-work', anchor: 'work', name: 'What we do',
          backgroundColor: '#ffffff', paddingY: 84, maxWidth: 1080, layout: 'grid', contentAlign: 'center', gap: 22,
          children: [
            { id: 'work-heading', type: 'heading', level: 2, name: 'Section heading', text: 'Small details. Big difference.', color: '#1c1830', fontSize: 42, fontWeight: '750', fontFamily: 'system', textAlign: 'center', animation: 'fade' },
            { id: 'work-intro', type: 'paragraph', name: 'Section introduction', text: 'A few building blocks are enough to create a page that feels considered and complete.', color: '#68647b', fontSize: 17, fontWeight: '400', fontFamily: 'system', textAlign: 'center', animation: 'fade' },
            { id: 'work-card-1', type: 'card', name: 'Design card', title: 'Intentional design', body: 'Use typography, colour, spacing, and shape to make the message clear.', backgroundColor: '#f8f7fc', color: '#28223d', borderColor: '#e9e6f4', borderRadius: 18, padding: 25, animation: 'rise' },
            { id: 'work-card-2', type: 'card', name: 'Build card', title: 'Responsive by nature', body: 'Let real layout rules adapt the page instead of pinning everything to coordinates.', backgroundColor: '#f8f7fc', color: '#28223d', borderColor: '#e9e6f4', borderRadius: 18, padding: 25, animation: 'rise' },
            { id: 'work-card-3', type: 'card', name: 'Export card', title: 'Your code, yours', body: 'Take readable HTML and CSS with you. The website does not depend on this editor.', backgroundColor: '#f8f7fc', color: '#28223d', borderColor: '#e9e6f4', borderRadius: 18, padding: 25, animation: 'rise' }
          ]
        },
        {
          id: 'section-contact', anchor: 'contact', name: 'Closing section',
          backgroundColor: '#171525', paddingY: 76, maxWidth: 820, layout: 'stack', contentAlign: 'center', gap: 22,
          children: [
            { id: 'contact-heading', type: 'heading', level: 2, name: 'Closing heading', text: 'Your next idea starts here.', color: '#ffffff', fontSize: 40, fontWeight: '750', fontFamily: 'system', textAlign: 'center', animation: 'rise' },
            { id: 'contact-paragraph', type: 'paragraph', name: 'Closing copy', text: 'Replace this sample content with your own story, project, or portfolio.', color: '#c1bdd2', fontSize: 17, fontWeight: '400', fontFamily: 'system', textAlign: 'center', animation: 'fade' },
            { id: 'contact-button', type: 'button', name: 'Closing action', text: 'Start creating', href: '#hero', textColor: '#ffffff', backgroundColor: '#7055ed', fontSize: 16, fontWeight: '700', borderRadius: 12, animation: 'rise' }
          ]
        }
      ]
    }
  });
}

export function isHexColor(value) {
  return typeof value === 'string' && HEX_RE.test(value);
}

export function normalizeHref(value, fallback = '#hero') {
  if (typeof value !== 'string') return fallback;
  const href = value.trim().slice(0, 500);
  if (!href || href.startsWith('//') || /[\\\u0000-\u0020\u007f<>"']/.test(href)) return fallback;
  if (href.startsWith('#')) return /^#[a-zA-Z0-9_-]{1,64}$/.test(href) ? href : fallback;
  const scheme = href.match(/^([a-z][a-z0-9+.-]*):/i);
  if (scheme) return ['http', 'https', 'mailto', 'tel'].includes(scheme[1].toLowerCase()) ? href : fallback;
  return href;
}

export function safeText(value, maxLength = 2000) {
  if (typeof value !== 'string') return '';
  return value.slice(0, maxLength);
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.round(Math.max(min, Math.min(max, number)));
}

function pick(value, choices, fallback) {
  return choices.includes(value) ? value : fallback;
}

function safeId(value, fallback) {
  return typeof value === 'string' && ID_RE.test(value) ? value : fallback;
}

function safeImageData(value) {
  if (typeof value !== 'string' || value.length > 1_450_000) return '';
  // SVG is intentionally excluded here; asset-library SVGs use the strict allowlist sanitizer.
  return /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/.test(value) ? value : '';
}

function hasValidRasterSignature(dataUrl, mime) {
  try {
    const payload = dataUrl.slice(dataUrl.indexOf(',') + 1).replace(/\s/g, '');
    const binary = atob(payload);
    const bytes = Array.from(binary.slice(0, 12), (character) => character.charCodeAt(0));
    if (mime === 'image/png') return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
    if (mime === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (mime === 'image/gif') return bytes.length >= 6 && String.fromCharCode(...bytes.slice(0, 6)).match(/^GIF8[79]a$/);
    if (mime === 'image/webp') return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
    return false;
  } catch { return false; }
}

function normalizeMotion(value) { return pick(value, MOTIONS, 'none'); }

function responsiveNumber(prop, value, nodeType) {
  if (prop === 'fontSize') return clampNumber(value, nodeType === 'heading' ? 22 : 12, nodeType === 'heading' ? 84 : nodeType === 'paragraph' ? 32 : 26, null);
  if (prop === 'paddingY') return clampNumber(value, nodeType === 'container' ? 0 : 24, nodeType === 'container' ? 120 : 200, null);
  if (prop === 'paddingX' || prop === 'rowGap' || prop === 'columnGap' || prop === 'minHeight') return clampNumber(value, 0, prop === 'minHeight' ? 1000 : 120, null);
  if (prop === 'maxWidth') return clampNumber(value, 120, 1200, null);
  if (prop === 'gap') return clampNumber(value, nodeType === 'container' ? 0 : 4, nodeType === 'container' ? 120 : 96, null);
  if (prop === 'gridColumns') return clampNumber(value, 1, 6, null);
  if (prop === 'gridMinColumnWidth') return clampNumber(value, 120, 480, null);
  if (prop === 'padding') return clampNumber(value, 0, 120, null);
  if (prop === 'borderRadius') return clampNumber(value, 0, nodeType === 'shape' ? 100 : 48, null);
  if (prop === 'height') return clampNumber(value, 1, nodeType === 'divider' ? 12 : 720, null);
  if (prop === 'width') return clampNumber(value, nodeType === 'divider' ? 20 : 0, nodeType === 'divider' ? 100 : 1200, null);
  if (prop === 'xPercent' || prop === 'yPercent') return clampNumber(value, 0, 100, null);
  return null;
}

function normalizeResponsive(raw, nodeType) {
  const result = {};
  for (const breakpoint of BREAKPOINTS) {
    const source = raw?.[breakpoint];
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
    const target = {};
    for (const prop of RESPONSIVE_PROPS[nodeType] || []) {
      const value = source[prop];
      if (['color', 'backgroundColor', 'textColor', 'borderColor'].includes(prop)) {
        if (isHexColor(value)) target[prop] = value;
      } else if (prop === 'textAlign') {
        if (['left', 'center', 'right'].includes(value)) target[prop] = value;
      } else if (prop === 'contentAlign') {
        if (['left', 'center'].includes(value)) target[prop] = value;
      } else if (prop === 'layout') {
        const layouts = nodeType === 'container' ? ['stack', 'flex', 'grid'] : LAYOUTS;
        if (layouts.includes(value)) target[prop] = value;
      } else if (prop === 'flexDirection') {
        if (FLEX_DIRECTIONS.includes(value)) target[prop] = value;
      } else if (prop === 'flexWrap') {
        if (FLEX_WRAP_OPTIONS.includes(value)) target[prop] = value;
      } else if (prop === 'justifyContent') {
        if (JUSTIFY_OPTIONS.includes(value)) target[prop] = value;
      } else if (prop === 'alignItems') {
        if (ALIGN_ITEMS_OPTIONS.includes(value)) target[prop] = value;
      } else if (prop === 'gridMode') {
        if (GRID_MODES.includes(value)) target[prop] = value;
      } else if (prop === 'objectPosition') {
        if (normalizeFocalPosition(value, '') !== '') target[prop] = normalizeFocalPosition(value);
      } else if (prop === 'alignSelf') {
        if (['auto', 'start', 'center', 'end', 'stretch'].includes(value)) target[prop] = value;
      } else {
        const number = responsiveNumber(prop, value, nodeType);
        if (number !== null) target[prop] = number;
      }
    }
    if (Object.keys(target).length) result[breakpoint] = target;
  }
  return result;
}

function normalizeTokenRoles(raw, roleSchema) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result = {};
  for (const [property, allowed] of Object.entries(roleSchema)) {
    if (allowed.includes(raw[property])) result[property] = raw[property];
  }
  return result;
}

function normalizeVectorPoints(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 80).map((point) => {
    const clean = { x: clampNumber(point?.x, 0, 1000, 0), y: clampNumber(point?.y, 0, 600, 0) };
    for (const key of ['inX', 'inY', 'outX', 'outY']) {
      if (Number.isFinite(Number(point?.[key]))) clean[key] = clampNumber(point[key], 0, key.endsWith('X') ? 1000 : 600, key.endsWith('X') ? clean.x : clean.y);
    }
    return clean;
  });
}

export function vectorPathData(node) {
  const kind = node?.vectorKind || 'freehand';
  if (kind === 'rect') return 'M 24 24 H 976 V 576 H 24 Z';
  if (kind === 'ellipse') return 'M 500 24 C 763 24 976 148 976 300 C 976 452 763 576 500 576 C 237 576 24 452 24 300 C 24 148 237 24 500 24 Z';
  const points = normalizeVectorPoints(node?.points);
  if (!points.length) return '';
  const fmt = (number) => Number(Math.round(number * 10) / 10).toString();
  const first = points[0];
  let path = `M ${fmt(first.x)} ${fmt(first.y)}`;
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];
    if (kind === 'bezier' || kind === 'freehand') {
      const before = points[index - 2] || previous;
      const after = points[index + 1] || current;
      const prevOutX = previous.outX ?? previous.x + (current.x - before.x) / 6;
      const prevOutY = previous.outY ?? previous.y + (current.y - before.y) / 6;
      const currentInX = current.inX ?? current.x - (after.x - previous.x) / 6;
      const currentInY = current.inY ?? current.y - (after.y - previous.y) / 6;
      path += ` C ${fmt(prevOutX)} ${fmt(prevOutY)} ${fmt(currentInX)} ${fmt(currentInY)} ${fmt(current.x)} ${fmt(current.y)}`;
    } else {
      path += ` L ${fmt(current.x)} ${fmt(current.y)}`;
    }
  }
  if (node?.closed) path += ' Z';
  return path;
}

export function generateVectorSvg(rawNode) {
  if (!rawNode || typeof rawNode !== 'object') throw new Error('A vector layer is required to export SVG.');
  const node = normalizeNode({ ...rawNode, type: 'vector' }, 0, 0);
  const title = escapeHtml(node.name || 'CanvasFlow vector');
  const path = escapeHtml(vectorPathData(node));
  const fill = node.closed ? node.fillColor : 'none';
  const stroke = node.strokeWidth > 0 ? node.strokeColor : 'none';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${node.width}" height="${node.height}" viewBox="0 0 1000 600" role="img" aria-labelledby="cf-svg-title">\n  <title id="cf-svg-title">${title}</title>\n  <path d="${path}" fill="${fill}" stroke="${stroke}" stroke-width="${node.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>\n</svg>\n`;
}

function normalizeButtonInteraction(raw) {
  const actions = ['none', 'scroll', 'show', 'hide', 'toggle'];
  return {
    action: pick(raw?.action, actions, 'none'),
    targetId: safeId(raw?.targetId, '')
  };
}

function normalizeComponentInstanceOverrides(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result = {};
  for (const [key, value] of Object.entries(raw)) {
    if (['text', 'title', 'body', 'href', 'alt'].includes(key) && typeof value === 'string') {
      const max = key === 'text' ? 400 : key === 'title' ? 160 : key === 'body' ? 1200 : key === 'alt' ? 250 : 500;
      result[key] = key === 'href' ? normalizeHref(value, '#hero') : safeText(value, max);
    }
  }
  return result;
}

function normalizeComponentVariantOverrides(template, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result = {};
  const sourceType = template.type;
  const allowed = new Set([
    ...(sourceType === 'heading' || sourceType === 'paragraph' ? ['text', 'color', 'fontSize', 'fontWeight', 'textAlign'] : []),
    ...(sourceType === 'button' ? ['text', 'href', 'textColor', 'backgroundColor', 'hoverBackgroundColor', 'hoverTextColor', 'focusOutlineColor', 'activeScale', 'fontSize', 'fontWeight', 'borderRadius', 'width'] : []),
    ...(sourceType === 'card' ? ['title', 'body', 'backgroundColor', 'color', 'borderColor', 'borderRadius', 'padding'] : []),
    ...(sourceType === 'image' ? ['alt', 'maxWidth', 'height', 'borderRadius', 'objectFit', 'objectPosition'] : []),
    ...(sourceType === 'divider' ? ['color', 'width', 'height'] : []),
    ...(sourceType === 'shape' ? ['backgroundColor', 'shapeKind', 'width', 'height', 'borderRadius'] : []),
    ...(sourceType === 'vector' ? ['fillColor', 'strokeColor', 'strokeWidth', 'width', 'height'] : [])
  ]);
  for (const [key, value] of Object.entries(raw)) {
    if (!allowed.has(key)) continue;
    if (['color', 'textColor', 'backgroundColor', 'hoverBackgroundColor', 'hoverTextColor', 'focusOutlineColor', 'borderColor', 'fillColor', 'strokeColor'].includes(key)) {
      if (isHexColor(value)) result[key] = value;
    } else if (key === 'activeScale') {
      if (Number.isFinite(Number(value))) result.activeScale = Math.max(.94, Math.min(1, Number(value)));
    } else if (key === 'href') result.href = normalizeHref(value, '#hero');
    else if (key === 'text' || key === 'title' || key === 'body' || key === 'alt') result[key] = safeText(value, key === 'text' ? 400 : key === 'title' ? 160 : key === 'body' ? 1200 : 250);
    else if (key === 'fontWeight') result[key] = pick(String(value), ['400', '500', '600', '650', '700', '750', '800'], template.fontWeight || '400');
    else if (key === 'textAlign') result[key] = pick(value, ['left', 'center', 'right'], template.textAlign || 'left');
    else if (key === 'objectFit') result[key] = pick(value, ['cover', 'contain'], 'cover');
    else if (key === 'shapeKind') result[key] = pick(value, ['rectangle', 'circle', 'pill', 'triangle', 'diamond', 'hexagon', 'star', 'ring'], template.shapeKind || 'rectangle');
    else if (key === 'objectPosition') result[key] = normalizeFocalPosition(value);
    else if (Number.isFinite(Number(value))) {
      const bounds = { fontSize: [12, 84], borderRadius: [0, 100], width: [0, 1200], height: [1, 720], maxWidth: [120, 1200], padding: [12, 48], strokeWidth: [0, 40] }[key];
      if (bounds) result[key] = clampNumber(value, bounds[0], bounds[1], template[key] || bounds[0]);
    }
  }
  return result;
}

function createComponentVariants(template) {
  const type = template.type;
  if (type === 'button') return {
    primary: {},
    secondary: { backgroundColor: '#27223f', textColor: '#ffffff' },
    soft: { backgroundColor: '#eeeaff', textColor: '#4b36b2' }
  };
  if (type === 'card') return {
    default: {},
    subtle: { backgroundColor: '#ffffff', borderColor: '#e4e1ee', borderRadius: 12 },
    contrast: { backgroundColor: '#211d35', color: '#ffffff', borderColor: '#211d35' }
  };
  return { default: {} };
}

function normalizeComponentDefinitions(rawComponents) {
  if (rawComponents === undefined || rawComponents === null) return [];
  if (!Array.isArray(rawComponents) || rawComponents.length > 50) throw new Error('A project can contain up to 50 reusable components.');
  const seen = new Set();
  return rawComponents.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || !raw.template || typeof raw.template !== 'object') throw new Error(`Component ${index + 1} is invalid.`);
    let id = safeId(raw.id, `component-${index + 1}`); const base = id; let suffix = 2;
    while (seen.has(id)) id = `${base.slice(0, 54)}-${suffix++}`;
    seen.add(id);
    const templateType = pick(raw.template.type, COMPONENT_SOURCE_TYPES, null);
    if (!templateType) throw new Error(`Component “${safeText(raw.name, 80) || id}” has an unsupported template type.`);
    const template = normalizeNode({ ...raw.template, id: `master-${id}`, type: templateType }, 0, 0);
    const variantsRaw = raw.variants && typeof raw.variants === 'object' && !Array.isArray(raw.variants) ? raw.variants : createComponentVariants(template);
    const variants = {};
    for (const [variantName, overrides] of Object.entries(variantsRaw).slice(0, 8)) {
      const key = String(variantName).toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 32);
      if (!key || Object.hasOwn(variants, key)) continue;
      variants[key] = normalizeComponentVariantOverrides(template, overrides);
    }
    if (!Object.keys(variants).length) variants.default = {};
    return { id, name: safeText(raw.name, 80).trim() || `Component ${index + 1}`, template, variants };
  });
}

export function resolveComponentInstance(instance, project) {
  if (!instance || instance.type !== 'component') return instance;
  const definition = (project?.components || []).find((item) => item.id === instance.componentId);
  if (!definition) return null;
  const variantOverrides = definition.variants?.[instance.variant] || definition.variants?.[Object.keys(definition.variants || {})[0]] || {};
  const template = definition.template;
  const node = { ...template, ...variantOverrides, ...normalizeComponentInstanceOverrides(instance.overrides), id: instance.id, name: instance.name || definition.name };
  // Explicit variant style values detach only the corresponding master token role.
  // Otherwise a token-linked default (for example button primary) would mask the
  // selected variant's literal colour/radius/font size in exported CSS.
  const tokenRoles = { ...(template.designTokens || {}) };
  for (const property of Object.keys(variantOverrides)) if (Object.hasOwn(tokenRoles, property)) delete tokenRoles[property];
  node.designTokens = tokenRoles;
  node.visible = instance.visible !== false && template.visible !== false;
  node.locked = instance.locked === true;
  node.opacity = instance.opacity ?? template.opacity;
  node.responsive = template.responsive || {};
  node.interaction = template.interaction || { action: 'none', targetId: '' };
  node.componentId = definition.id;
  node.componentVariant = instance.variant;
  return node;
}

export function createComponentDefinition(project, sourceNode, name = '') {
  if (!sourceNode || !COMPONENT_SOURCE_TYPES.includes(sourceNode.type)) throw new Error('Select a supported element to create a reusable component.');
  if (!Array.isArray(project.components)) project.components = [];
  if (project.components.length >= 50) throw new Error('A project can contain up to 50 reusable components.');
  const id = idFrom('component');
  const template = normalizeNode({ ...deepClone(sourceNode), id: `master-${id}` }, 0, 0);
  const definition = { id, name: safeText(name, 80).trim() || sourceNode.name || 'Reusable component', template, variants: createComponentVariants(template) };
  project.components.push(definition);
  return definition;
}

function normalizeNode(node, index, sectionIndex, depth = 0) {
  const type = pick(node?.type, NODE_TYPES, null);
  if (!type) return null;
  const base = {
    id: safeId(node.id, `node-${sectionIndex + 1}-${index + 1}`),
    type,
    name: safeText(node.name, 80) || ({ heading: 'Heading', paragraph: 'Paragraph', button: 'Button', image: 'Image', card: 'Card', divider: 'Divider', shape: 'Shape', vector: 'Vector path', component: 'Component instance' }[type]),
    animation: normalizeMotion(node.animation),
    animationDuration: clampNumber(node.animationDuration, 100, 5000, MOTION_DEFAULT_DURATIONS[normalizeMotion(node.animation)] || 700),
    animationDelay: clampNumber(node.animationDelay, 0, 3000, 0),
    animationEasing: pick(node.animationEasing, MOTION_EASINGS, ['fade', 'blur'].includes(normalizeMotion(node.animation)) ? 'ease' : 'smooth'),
    animationDirection: pick(node.animationDirection, MOTION_DIRECTIONS, 'normal'),
    animationTrigger: pick(node.animationTrigger, MOTION_TRIGGERS, 'load'),
    alignSelf: pick(node.alignSelf, ['auto', 'start', 'center', 'end', 'stretch'], 'auto'),
    responsive: normalizeResponsive(node.responsive, type),
    designTokens: normalizeTokenRoles(node.designTokens, NODE_DESIGN_TOKEN_ROLES[type] || {}),
    opacity: clampNumber(node.opacity, 0, 100, 100),
    visible: node.visible !== false,
    locked: node.locked === true,
    positioning: normalizeFreePositioning(node.positioning)
  };
  if (type === 'component') {
    return { ...base, componentId: safeId(node.componentId, ''), variant: safeId(node.variant, 'default'), overrides: normalizeComponentInstanceOverrides(node.overrides) };
  }
  if (type === 'container') {
    if (depth >= 4) return null;
    const children = !Array.isArray(node.children) ? [] : node.children.slice(0, 100).map((child, childIndex) => normalizeNode(child, childIndex, sectionIndex, depth + 1)).filter(Boolean);
    return {
      ...base,
      name: safeText(node.name, 80) || 'Layout container',
      layout: pick(node.layout, ['stack', 'flex', 'grid'], 'flex'),
      flexDirection: pick(node.flexDirection, FLEX_DIRECTIONS, 'row'),
      flexWrap: pick(node.flexWrap, FLEX_WRAP_OPTIONS, 'wrap'),
      justifyContent: pick(node.justifyContent, JUSTIFY_OPTIONS, 'start'),
      alignItems: pick(node.alignItems, ALIGN_ITEMS_OPTIONS, 'stretch'),
      gridMode: pick(node.gridMode, GRID_MODES, 'fixed'),
      gridColumns: clampNumber(node.gridColumns, 1, 6, 2),
      gridMinColumnWidth: clampNumber(node.gridMinColumnWidth, 120, 480, 240),
      gap: clampNumber(node.gap, 0, 120, 20),
      rowGap: clampNumber(node.rowGap, 0, 120, Number.isFinite(Number(node.gap)) ? Number(node.gap) : 20),
      columnGap: clampNumber(node.columnGap, 0, 120, Number.isFinite(Number(node.gap)) ? Number(node.gap) : 20),
      padding: clampNumber(node.padding, 0, 120, 20),
      paddingX: clampNumber(node.paddingX, 0, 120, 20),
      paddingY: clampNumber(node.paddingY, 0, 120, 20),
      maxWidth: clampNumber(node.maxWidth, 120, 1200, 1200),
      minHeight: clampNumber(node.minHeight, 0, 1000, 0),
      backgroundColor: isHexColor(node.backgroundColor) ? node.backgroundColor : '#ffffff',
      borderColor: isHexColor(node.borderColor) ? node.borderColor : '#e9e6f4',
      borderRadius: clampNumber(node.borderRadius, 0, 64, 16),
      children
    };
  }
  const textBase = {
    text: safeText(node.text, type === 'heading' ? 400 : 2000) || (type === 'heading' ? 'A new heading' : 'Add a little context for your visitors.'),
    color: isHexColor(node.color) ? node.color : (type === 'heading' ? '#19152e' : '#5d5a70'),
    fontSize: clampNumber(node.fontSize, type === 'heading' ? 22 : 14, type === 'heading' ? 84 : 32, type === 'heading' ? 48 : 18),
    fontWeight: pick(String(node.fontWeight), ['400', '500', '600', '650', '700', '750', '800'], type === 'heading' ? '700' : '400'),
    fontFamily: pick(node.fontFamily, Object.keys(FONT_STACKS), 'system'),
    textAlign: pick(node.textAlign, ['left', 'center', 'right'], 'left')
  };
  if (type === 'heading') return { ...base, ...textBase, maxWidth: clampNumber(node.maxWidth, 120, 1200, 980), level: pick(Number(node.level), [1, 2, 3], 2) };
  if (type === 'paragraph') return { ...base, ...textBase, maxWidth: clampNumber(node.maxWidth, 120, 1200, 760) };
  if (type === 'button') {
    return {
      ...base, text: safeText(node.text, 200) || 'Click here', href: normalizeHref(node.href, '#hero'),
      textColor: isHexColor(node.textColor) ? node.textColor : '#ffffff',
      backgroundColor: isHexColor(node.backgroundColor) ? node.backgroundColor : '#7055ed',
      fontSize: clampNumber(node.fontSize, 12, 26, 16),
      fontWeight: pick(String(node.fontWeight), ['400', '500', '600', '650', '700', '750', '800'], '650'),
      borderRadius: clampNumber(node.borderRadius, 0, 36, 12),
      width: clampNumber(node.width, 0, 1200, 0),
      hoverBackgroundColor: isHexColor(node.hoverBackgroundColor) ? node.hoverBackgroundColor : '#5b43d4',
      hoverTextColor: isHexColor(node.hoverTextColor) ? node.hoverTextColor : '#ffffff',
      focusOutlineColor: isHexColor(node.focusOutlineColor) ? node.focusOutlineColor : '#2f70db',
      activeScale: Math.max(0.94, Math.min(1, Number.isFinite(Number(node.activeScale)) ? Number(node.activeScale) : 0.98)),
      interaction: normalizeButtonInteraction(node.interaction)
    };
  }
  if (type === 'image') {
    return {
      ...base, src: safeImageData(node.src), assetId: safeId(node.assetId, '') || null, alt: safeText(node.alt, 250),
      maxWidth: clampNumber(node.maxWidth, 120, 1200, 720), height: clampNumber(node.height, 120, 720, 360),
      borderRadius: clampNumber(node.borderRadius, 0, 48, 18),
      objectFit: pick(node.objectFit, ['cover', 'contain'], 'cover'),
      objectPosition: normalizeFocalPosition(node.objectPosition)
    };
  }
  if (type === 'card') {
    return {
      ...base, title: safeText(node.title, 160) || 'Card title', body: safeText(node.body, 1200) || 'Describe this feature or idea.',
      backgroundColor: isHexColor(node.backgroundColor) ? node.backgroundColor : '#f8f7fc',
      color: isHexColor(node.color) ? node.color : '#28223d',
      borderColor: isHexColor(node.borderColor) ? node.borderColor : '#e9e6f4',
      borderRadius: clampNumber(node.borderRadius, 0, 40, 18), padding: clampNumber(node.padding, 12, 48, 24),
      maxWidth: clampNumber(node.maxWidth, 120, 1200, 1200)
    };
  }
  if (type === 'divider') {
    return { ...base, color: isHexColor(node.color) ? node.color : '#dedbea', width: clampNumber(node.width, 20, 100, 100), height: clampNumber(node.height, 1, 12, 1) };
  }
  if (type === 'vector') {
    const vectorKind = pick(node.vectorKind, ['rect', 'ellipse', 'line', 'freehand', 'bezier'], 'freehand');
    const points = normalizeVectorPoints(node.points);
    const minimumPoints = ['line', 'freehand', 'bezier'].includes(vectorKind) ? 2 : 0;
    const defaults = vectorKind === 'line' ? [{ x: 80, y: 300 }, { x: 920, y: 300 }] : [{ x: 120, y: 420 }, { x: 500, y: 80 }, { x: 880, y: 420 }];
    return {
      ...base, vectorKind, points: points.length >= minimumPoints ? points : defaults,
      width: clampNumber(node.width, 24, 600, 240), height: clampNumber(node.height, 24, 600, 160),
      fillColor: isHexColor(node.fillColor) ? node.fillColor : '#8c75f5',
      strokeColor: isHexColor(node.strokeColor) ? node.strokeColor : '#3b2d6b',
      strokeWidth: clampNumber(node.strokeWidth, 0, 40, 4), closed: node.closed === true || ['rect', 'ellipse'].includes(vectorKind),
      positionMode: pick(node.positionMode, ['flow', 'overlay'], 'overlay'),
      xPercent: clampNumber(node.xPercent, 0, 100, 50), yPercent: clampNumber(node.yPercent, 0, 100, 50),
      zIndex: clampNumber(node.zIndex, 0, 100, 1), groupId: null
    };
  }
  return {
    ...base, shapeKind: pick(node.shapeKind, ['rectangle', 'circle', 'pill', 'triangle', 'diamond', 'hexagon', 'star', 'ring'], 'rectangle'),
    backgroundColor: isHexColor(node.backgroundColor) ? node.backgroundColor : '#8c75f5',
    width: clampNumber(node.width, 24, 600, 180), height: clampNumber(node.height, 24, 600, 90),
    borderRadius: clampNumber(node.borderRadius, 0, 100, 16),
    positionMode: pick(node.positionMode, ['flow', 'overlay'], 'flow'),
    xPercent: clampNumber(node.xPercent, 0, 100, 82),
    yPercent: clampNumber(node.yPercent, 0, 100, 20),
    zIndex: clampNumber(node.zIndex, 0, 100, 0),
    groupId: typeof node.groupId === 'string' && ID_RE.test(node.groupId) ? node.groupId : null
  };
}

function inferLegacyNodeTokenRoles(node, ds) {
  const roles = { ...(node.designTokens || {}) };
  if (node.type === 'heading') {
    if (node.color === ds.colors.text) roles.color = 'text';
    if (node.fontFamily === ds.typography.headingFont) roles.fontFamily = 'heading';
    if (String(node.fontWeight) === ds.typography.headingWeight) roles.fontWeight = 'headingWeight';
  } else if (node.type === 'paragraph') {
    if (node.color === ds.colors.muted) roles.color = 'muted';
    if (node.fontFamily === ds.typography.bodyFont) roles.fontFamily = 'body';
    if (String(node.fontWeight) === ds.typography.bodyWeight) roles.fontWeight = 'bodyWeight';
  } else if (node.type === 'button') {
    if (node.backgroundColor === ds.colors.primary) roles.backgroundColor = 'primary';
    if (node.borderRadius === ds.radius.medium) roles.borderRadius = 'medium';
  } else if (node.type === 'card') {
    if (node.backgroundColor === ds.colors.surface) roles.backgroundColor = 'surface';
    if (node.color === ds.colors.text) roles.color = 'text';
    if (node.borderColor === ds.colors.border) roles.borderColor = 'border';
    if (node.borderRadius === ds.radius.large) roles.borderRadius = 'large';
  } else if (node.type === 'divider' && node.color === ds.colors.border) {
    roles.color = 'border';
  }
  if (Object.keys(roles).length) node.designTokens = roles;
  return node;
}

function inferLegacySectionTokenRoles(section, ds) {
  const roles = { ...(section.designTokens || {}) };
  if (section.backgroundColor === ds.colors.page) roles.backgroundColor = 'page';
  else if (section.backgroundColor === ds.colors.surface) roles.backgroundColor = 'surface';
  if (section.paddingY === ds.spacing.section) roles.paddingY = 'section';
  if (section.maxWidth === ds.width.content) roles.maxWidth = 'content';
  else if (section.maxWidth === ds.width.wide) roles.maxWidth = 'wide';
  if (section.gap === ds.spacing.gap) roles.gap = 'gap';
  if (Object.keys(roles).length) section.designTokens = roles;
  return section;
}

export function normalizeProject(raw) {
  if (!raw || typeof raw !== 'object' || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(raw.schemaVersion) || !raw.page || !Array.isArray(raw.page.sections)) {
    throw new Error('This is not a supported CanvasFlow project backup (schema versions 1–12).');
  }
  if (Array.isArray(raw.pages) && raw.pages.length > 20) throw new Error('This project contains too many pages for this version (maximum 20).');
  const candidatePages = Array.isArray(raw.pages) && raw.pages.length ? raw.pages : [raw.page];
  const requestedActivePageId = typeof raw.activePageId === 'string' ? raw.activePageId : raw.page.id;
  const activePageSource = (raw.page && raw.page.id === requestedActivePageId) ? raw.page : candidatePages.find((page) => page && page.id === requestedActivePageId) || candidatePages.find((page) => page && page.id === raw.page.id) || raw.page;
  raw = { ...raw, page: activePageSource };
  if (raw.page.sections.length > 100) throw new Error('This project contains too many sections for this prototype.');
  const legacyDesignSystemImport = !Object.hasOwn(raw, 'designSystem');
  const normalizedDesignSystem = normalizeDesignSystem(raw.designSystem);
  const normalizedAssets = normalizeAssetLibrary(raw.assets);
  const normalizedComponents = normalizeComponentDefinitions(raw.components);
  const usedIds = new Set();
  const uniqueId = (candidate, fallback) => {
    let id = safeId(candidate, fallback);
    if (usedIds.has(id)) id = safeId(fallback, 'node-item');
    let suffix = 2;
    const base = id;
    while (usedIds.has(id)) id = `${base.slice(0, 58)}-${suffix++}`;
    usedIds.add(id);
    return id;
  };
  const anchors = new Set();
  const sections = raw.page.sections.map((section, sectionIndex) => {
    if (!section || typeof section !== 'object') throw new Error(`Section ${sectionIndex + 1} is invalid.`);
    if (!Array.isArray(section.children) || section.children.length > 100) throw new Error(`Section ${sectionIndex + 1} has invalid content.`);
    const sectionId = uniqueId(section.id, `section-${sectionIndex + 1}`);
    let anchor = safeId(section.anchor, sectionId);
    if (anchors.has(anchor)) anchor = uniqueId(`${anchor}-anchor`, `section-${sectionIndex + 1}-anchor`);
    anchors.add(anchor);
    const children = section.children.map((node, index) => normalizeNode({ ...node, id: uniqueId(node?.id, `node-${sectionIndex + 1}-${index + 1}`) }, index, sectionIndex)).filter(Boolean);
    if (legacyDesignSystemImport) children.forEach((node) => inferLegacyNodeTokenRoles(node, normalizedDesignSystem));
    // Overlay groups are section-local and must contain at least two overlay shapes.
    const groupCounts = new Map();
    for (const child of children) {
      if (!['shape', 'vector'].includes(child.type) || child.positionMode !== 'overlay' || child.type === 'vector') child.groupId = null;
      if (child.groupId) groupCounts.set(child.groupId, (groupCounts.get(child.groupId) || 0) + 1);
    }
    for (const child of children) if (child.groupId && groupCounts.get(child.groupId) < 2) child.groupId = null;
    if (!children.length) children.push(normalizeNode({ id: uniqueId(`heading-${sectionIndex + 1}`, `heading-${sectionIndex + 1}`), type: 'heading', level: sectionIndex === 0 ? 1 : 2, name: 'Heading', text: 'A new section', color: '#19152e', fontSize: 42, fontWeight: '700', fontFamily: 'system', textAlign: 'center' }, 0, sectionIndex));
    const normalizedSection = {
      id: sectionId, anchor, name: safeText(section.name, 80) || `Section ${sectionIndex + 1}`,
      backgroundColor: isHexColor(section.backgroundColor) ? section.backgroundColor : '#ffffff',
      paddingY: clampNumber(section.paddingY, 24, 200, 80), maxWidth: clampNumber(section.maxWidth, 320, 1200, 920),
      layout: pick(section.layout, LAYOUTS, 'stack'), contentAlign: pick(section.contentAlign, ['left', 'center'], 'center'), gap: clampNumber(section.gap, 4, 96, 24),
      flexDirection: pick(section.flexDirection, FLEX_DIRECTIONS, 'row'), flexWrap: pick(section.flexWrap, FLEX_WRAP_OPTIONS, 'wrap'),
      justifyContent: pick(section.justifyContent, JUSTIFY_OPTIONS, 'start'), alignItems: pick(section.alignItems, ALIGN_ITEMS_OPTIONS, section.contentAlign === 'left' ? 'start' : 'center'),
      gridMode: pick(section.gridMode, GRID_MODES, 'fixed'), gridColumns: clampNumber(section.gridColumns, 1, 6, section.layout === 'two-column' ? 2 : 3),
      gridMinColumnWidth: clampNumber(section.gridMinColumnWidth, 120, 480, 240),
      componentKind: pick(section.componentKind, ['navigation', 'hero', 'feature-grid', 'cta', 'footer'], null),
      designTokens: normalizeTokenRoles(section.designTokens, SECTION_DESIGN_TOKEN_ROLES),
      responsive: normalizeResponsive(section.responsive, 'section'),
      opacity: clampNumber(section.opacity, 0, 100, 100), visible: section.visible !== false, locked: section.locked === true,
      children
    };
    if (legacyDesignSystemImport) inferLegacySectionTokenRoles(normalizedSection, normalizedDesignSystem);
    return normalizedSection;
  });
  const pageSlug = (value) => safeText(value, 64).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  const normalizedPage = {
    id: safeId(raw.page.id, 'page-home'), name: safeText(raw.page.name, 80) || 'Home page',
    slug: pageSlug(raw.page.slug || raw.page.name || 'home') || 'home',
    title: safeText(raw.page.title, 140) || 'My website',
    description: safeText(raw.page.description, 300),
    editor: normalizePageEditorSettings(raw.page.editor),
    backgroundColor: isHexColor(raw.page.backgroundColor) ? raw.page.backgroundColor : '#ffffff',
    designTokens: normalizeTokenRoles(raw.page.designTokens, PAGE_DESIGN_TOKEN_ROLES),
    sections
  };
  if (legacyDesignSystemImport && normalizedPage.backgroundColor === normalizedDesignSystem.colors.page) {
    normalizedPage.designTokens.backgroundColor = 'page';
  }
  // Normalize every page through the same strict versioned project pipeline. Keep `page`
  // as an alias to the active page so the existing editor can remain page-scoped.
  const normalizedPages = [];
  const seenPageIds = new Set();
  const seenSlugs = new Set();
  const sourceList = candidatePages.length ? candidatePages : [activePageSource];
  sourceList.forEach((candidate, index) => {
    let page = candidate && candidate.id === normalizedPage.id ? normalizedPage : normalizeProject({
      schemaVersion: 12, id: raw.id, name: raw.name, updatedAt: raw.updatedAt,
      designSystem: raw.designSystem, assets: raw.assets, components: raw.components, page: candidate && typeof candidate === 'object' ? candidate : { id: `page-${index + 1}`, name: `Page ${index + 1}`, sections: [] }
    }).page;
    let pageId = page.id;
    if (seenPageIds.has(pageId)) { let suffix = 2; while (seenPageIds.has(`${pageId}-${suffix}`)) suffix++; pageId = `${pageId}-${suffix}`; page.id = pageId; }
    seenPageIds.add(pageId);
    const baseSlug = page.slug || (index === 0 ? 'home' : `page-${index + 1}`);
    let slug = baseSlug; let suffix = 2;
    while (seenSlugs.has(slug) || (index > 0 && slug === 'index')) slug = `${baseSlug}-${suffix++}`;
    page.slug = slug; seenSlugs.add(slug);
    normalizedPages.push(page);
  });
  if (!normalizedPages.some((page) => page.id === normalizedPage.id)) normalizedPages.unshift(normalizedPage);
  // CSS class names are shared by the exported site's stylesheet, so node IDs
  // must also be unique across pages (not merely within one page).
  const usedExportIds = new Set();
  normalizedPages.forEach((page, pageIndex) => page.sections.forEach((section, sectionIndex) => {
    const claim = (item, prefix) => {
      if (!usedExportIds.has(item.id)) { usedExportIds.add(item.id); return; }
      const base = `${prefix}-p${pageIndex + 1}-${sectionIndex + 1}`; let candidate = base; let suffix = 2;
      while (usedExportIds.has(candidate)) candidate = `${base}-${suffix++}`;
      item.id = candidate; usedExportIds.add(candidate);
    };
    claim(section, 'section');
    const claimTree = (nodes, prefix = 'node') => nodes.forEach((node, nodeIndex) => { claim(node, `${prefix}-${nodeIndex + 1}`); if (node.type === 'container') claimTree(node.children, `${prefix}-${nodeIndex + 1}-child`); });
    claimTree(section.children);
  }));
  const componentIds = new Set(normalizedComponents.map((component) => component.id));
  for (const page of normalizedPages) for (const section of page.sections) walkNodeTree(section.children, (node) => {
    if (node.type === 'component' && !componentIds.has(node.componentId)) {
      node.type = 'paragraph'; node.text = '[Missing component — open Components to repair this instance]'; node.color = '#a33b46';
      delete node.componentId; delete node.variant; delete node.overrides;
    }
  });
  const assetIds = new Set(normalizedAssets.map((asset) => asset.id));
  for (const component of normalizedComponents) if (component.template.type === 'image' && component.template.assetId && !assetIds.has(component.template.assetId)) component.template.assetId = null;
  for (const page of normalizedPages) for (const section of page.sections) walkNodeTree(section.children, (node) => {
    if (node.type === 'image' && node.assetId && !assetIds.has(node.assetId)) node.assetId = null;
  });
  const activePage = normalizedPages.find((page) => page.id === requestedActivePageId) || normalizedPages.find((page) => page.slug === normalizedPage.slug) || normalizedPages[0];
  const siteChromeRaw = raw.siteChrome && typeof raw.siteChrome === 'object' ? raw.siteChrome : {};
  const siteChrome = {
    navigationEnabled: siteChromeRaw.navigationEnabled === true,
    footerEnabled: siteChromeRaw.footerEnabled === true,
    brandName: safeText(siteChromeRaw.brandName, 80).trim() || safeText(raw.name, 80).trim() || 'My website',
    footerText: safeText(siteChromeRaw.footerText, 240) || `© ${new Date().getFullYear()} ${safeText(raw.name, 80).trim() || 'My website'}`
  };
  return {
    schemaVersion: 12, id: safeId(raw.id, 'canvasflow-imported-project'),
    name: safeText(raw.name, 80).trim() || 'Untitled website',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    designSystem: normalizedDesignSystem, assets: normalizedAssets, components: normalizedComponents,
    pages: normalizedPages, activePageId: activePage.id, page: activePage, siteChrome, layoutPresets: normalizeLayoutPresets(raw.layoutPresets)
  };
}

export function findNode(project, nodeId) {
  for (const section of project.page.sections) {
    if (section.id === nodeId) return { node: section, parent: null, section };
    const visit = (nodes, parent, depth = 0) => {
      for (const child of nodes || []) {
        if (child.id === nodeId) return { node: child, parent, section, depth };
        if (child.type === 'container') { const nested = visit(child.children, child, depth + 1); if (nested) return nested; }
      }
      return null;
    };
    const found = visit(section.children, section);
    if (found) return found;
  }
  return null;
}

export function walkNodeTree(nodes, callback) {
  for (const node of Array.isArray(nodes) ? nodes : []) {
    callback(node);
    if (node.type === 'container') walkNodeTree(node.children, callback);
  }
}

function normalizeLayoutPresets(raw) {
  if (!Array.isArray(raw)) return [];
  const usedIds = new Set();
  return raw.slice(0, 12).map((preset, index) => {
    const source = preset?.settings && typeof preset.settings === 'object' ? preset.settings : {};
    const baseId = safeId(preset.id, `layout-preset-${index + 1}`);
    let id = baseId; let suffix = 2;
    while (usedIds.has(id)) id = `${baseId.slice(0, 54)}-${suffix++}`;
    usedIds.add(id);
    return {
      id,
      name: safeText(preset.name, 40).trim() || `Layout preset ${index + 1}`,
      settings: {
        layout: pick(source.layout, ['stack', 'flex', 'grid'], 'flex'),
        flexDirection: pick(source.flexDirection, FLEX_DIRECTIONS, 'row'),
        flexWrap: pick(source.flexWrap, FLEX_WRAP_OPTIONS, 'wrap'),
        justifyContent: pick(source.justifyContent, JUSTIFY_OPTIONS, 'start'),
        alignItems: pick(source.alignItems, ALIGN_ITEMS_OPTIONS, 'stretch'),
        gridMode: pick(source.gridMode, GRID_MODES, 'fixed'),
        gridColumns: clampNumber(source.gridColumns, 1, 6, 2),
        gridMinColumnWidth: clampNumber(source.gridMinColumnWidth, 120, 480, 240),
        gap: clampNumber(source.gap, 0, 120, 20), rowGap: clampNumber(source.rowGap, 0, 120, 20), columnGap: clampNumber(source.columnGap, 0, 120, 20),
        padding: clampNumber(source.padding, 0, 120, 20), paddingX: clampNumber(source.paddingX, 0, 120, 20), paddingY: clampNumber(source.paddingY, 0, 120, 20),
        maxWidth: clampNumber(source.maxWidth, 120, 1200, 1200), minHeight: clampNumber(source.minHeight, 0, 1000, 0),
        backgroundColor: isHexColor(source.backgroundColor) ? source.backgroundColor : '#ffffff', borderColor: isHexColor(source.borderColor) ? source.borderColor : '#e9e6f4', borderRadius: clampNumber(source.borderRadius, 0, 64, 16)
      }
    };
  });
}

/** Group two or more decorative overlay shapes in the same section. Groups are
 * a lightweight model relationship: exported shapes stay independent HTML nodes. */
export function groupOverlayNodes(project, nodeIds) {
  const ids = [...new Set(Array.isArray(nodeIds) ? nodeIds.filter((id) => typeof id === 'string') : [])];
  if (ids.length < 2) return null;
  const found = ids.map((id) => findNode(project, id));
  if (found.some((item) => !item?.parent || item.node.type !== 'shape' || item.node.positionMode !== 'overlay')) return null;
  const parentId = found[0].parent.id;
  if (found.some((item) => item.parent.id !== parentId)) return null;
  const groupId = idFrom('overlay-group');
  found.forEach((item) => { item.node.groupId = groupId; });
  return groupId;
}

/** Ungroup any group represented by the supplied selected nodes. */
export function ungroupOverlayNodes(project, nodeIds) {
  const ids = [...new Set(Array.isArray(nodeIds) ? nodeIds.filter((id) => typeof id === 'string') : [])];
  const found = ids.map((id) => findNode(project, id)).filter((item) => item?.parent && item.node.type === 'shape' && item.node.positionMode === 'overlay' && item.node.groupId);
  if (!found.length) return false;
  const parents = new Set(found.map((item) => item.parent.id));
  const groupIds = new Set(found.map((item) => item.node.groupId));
  let changed = false;
  for (const section of project.page.sections) {
    if (!parents.has(section.id)) continue;
    for (const child of section.children) {
      if (child.type === 'shape' && child.positionMode === 'overlay' && groupIds.has(child.groupId)) {
        child.groupId = null;
        changed = true;
      }
    }
  }
  return changed;
}

function fontFamily(key) { return FONT_STACKS[key] || FONT_STACKS.system; }

function nodeMotionClass(node) { return node.animation && node.animation !== 'none' ? ` cf-motion-${node.animation}` : ''; }

function resolvePageHref(href, project, options = {}) {
  const match = typeof href === 'string' ? href.match(/^@page:([a-zA-Z0-9_-]{1,64})$/) : null;
  if (!match) return normalizeHref(href, '#hero');
  const pages = Array.isArray(project.pages) ? project.pages : [project.page];
  const target = pages.find((page) => page.id === match[1]);
  if (!target) return '#';
  const file = pages[0]?.id === target.id ? 'index.html' : `${target.slug}.html`;
  return `./${file}`;
}

function renderElement(node, options = {}) {
  if (node.type === 'component') {
    const resolved = resolveComponentInstance(node, options.project);
    if (!resolved) return `<div class="cf-component-missing node-${escapeHtml(node.id)}" data-cf-id="${escapeHtml(node.id)}" role="status">Missing component</div>`;
    return renderElement(resolved, options);
  }
  const id = escapeHtml(node.id);
  const nodeClass = `node-${id}`;
  const classes = `${nodeClass}${nodeMotionClass(node)}`;
  const previewAttr = `data-cf-id="${id}"${node.positioning?.mode === 'free' && node.positionMode !== 'overlay' ? ` data-cf-free="true" data-cf-free-x="${node.positioning.x}" data-cf-free-y="${node.positioning.y}" data-cf-free-x-unit="${node.positioning.xUnit}" data-cf-free-y-unit="${node.positioning.yUnit}" data-cf-free-rotation="${node.positioning.rotation}"` : ''}`;
  const lockAttr = `data-cf-locked="${node.locked ? 'true' : 'false'}"`;
  const motionAttr = `data-cf-animation="${node.animation}" data-cf-motion-trigger="${node.animationTrigger}"`;
  const componentAttr = node.componentId ? ` data-cf-component-id="${escapeHtml(node.componentId)}" data-cf-component-variant="${escapeHtml(node.componentVariant || 'default')}"` : '';
  if (node.type === 'container') {
    return `<div class="cf-layout-container ${classes}" ${previewAttr} ${lockAttr} ${motionAttr} aria-label="${escapeHtml(node.name || 'Layout container')}">${(node.children || []).map((child) => renderElement(child, options)).join('\n')}</div>`;
  }
  if (node.type === 'heading') {
    const tag = node.level === 1 ? 'h1' : node.level === 3 ? 'h3' : 'h2';
    return `<${tag} class="cf-heading ${classes}" ${previewAttr} ${lockAttr} ${motionAttr}${componentAttr}>${escapeHtml(node.text)}</${tag}>`;
  }
  if (node.type === 'paragraph') return `<p class="cf-paragraph ${classes}" ${previewAttr} ${lockAttr} ${motionAttr}${componentAttr}>${escapeHtml(node.text)}</p>`;
  if (node.type === 'button') {
    const pageMatch = typeof node.href === 'string' ? node.href.match(/^@page:([a-zA-Z0-9_-]{1,64})$/) : null;
    const pageAttr = options.preview && pageMatch ? ` data-cf-page-id="${escapeHtml(pageMatch[1])}"` : '';
    const action = node.interaction?.action || 'none';
    const target = node.interaction?.targetId || '';
    const actionAttr = action !== 'none' && target ? ` data-cf-action="${escapeHtml(action)}" data-cf-target="${escapeHtml(target)}"` : '';
    const href = action !== 'none' && target ? (action === 'scroll' ? `#${target}` : '#') : resolvePageHref(node.href, options.project || { page: null, pages: [] }, options);
    return `<a class="cf-button ${classes}" ${previewAttr} ${lockAttr}${pageAttr}${componentAttr}${actionAttr} href="${escapeHtml(href)}">${escapeHtml(node.text)}</a>`;
  }
  if (node.type === 'image') {
    const dataSource = imageSource(node, options.project);
    const src = options.exportAssets && dataSource ? imageAssetPath(node, options.project) : dataSource;
    if (!src) return `<div class="cf-image-placeholder ${classes}" ${previewAttr} ${lockAttr}${componentAttr} role="img" aria-label="Image placeholder">Add an image in Properties</div>`;
    return `<img class="cf-image ${classes}" ${previewAttr} ${lockAttr}${componentAttr} src="${escapeHtml(src)}" alt="${escapeHtml(node.alt)}" loading="lazy">`;
  }
  if (node.type === 'card') {
    return `<article class="cf-card ${classes}" ${previewAttr} ${lockAttr} ${motionAttr}${componentAttr}><span class="cf-card-symbol" aria-hidden="true">✳</span><h3>${escapeHtml(node.title)}</h3><p>${escapeHtml(node.body)}</p></article>`;
  }
  if (node.type === 'divider') return `<div class="cf-divider ${classes}" ${previewAttr} ${lockAttr}${componentAttr} role="separator" aria-orientation="horizontal"></div>`;
  if (node.type === 'vector') {
    const overlayAttrs = node.positionMode === 'overlay' ? ` data-cf-position="overlay" data-cf-x="${node.xPercent}" data-cf-y="${node.yPercent}" data-cf-z="${node.zIndex}"` : '';
    const path = vectorPathData(node);
    const fill = node.closed ? node.fillColor : 'none';
    const stroke = node.strokeWidth > 0 ? node.strokeColor : 'none';
    return `<svg class="cf-vector ${classes}" ${previewAttr}${overlayAttrs} ${lockAttr} ${motionAttr}${componentAttr} viewBox="0 0 1000 600" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(node.name)}" xmlns="http://www.w3.org/2000/svg"><path d="${escapeHtml(path)}" fill="${fill}" stroke="${stroke}" stroke-width="${node.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  }
  const shapeClass = ` shape-${node.shapeKind || 'rectangle'}`;
  const overlayAttrs = node.positionMode === 'overlay'
    ? ` data-cf-position="overlay" data-cf-x="${node.xPercent}" data-cf-y="${node.yPercent}" data-cf-z="${node.zIndex}"${node.groupId ? ` data-cf-group="${escapeHtml(node.groupId)}"` : ''}`
    : '';
  return `<div class="cf-shape ${classes}${shapeClass}" ${previewAttr}${overlayAttrs} ${lockAttr} ${motionAttr}${componentAttr} aria-hidden="true"></div>`;
}

function assetExtension(mime) { return ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' })[mime] || 'bin'; }
function assetFingerprint(dataUrl) {
  // Two independent 32-bit rolling hashes make accidental or crafted filename
  // collisions vastly less likely than the former single 32-bit FNV hash.
  // This remains synchronous so website export can stay dependency-free.
  let first = 2166136261;
  let second = 0x9e3779b9;
  for (let index = 0; index < dataUrl.length; index += 1) {
    const code = dataUrl.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ (code + (index & 255)), 0x85ebca6b);
    second ^= second >>> 13;
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
}
function findProjectAsset(project, assetId) { return (project?.assets || []).find((asset) => asset.id === assetId) || null; }
function imageSource(node, project) { return node?.assetId ? (findProjectAsset(project, node.assetId)?.dataUrl || '') : (node?.src || ''); }
function imageAssetPath(node, project) {
  if (!node) return '';
  if (node.assetId) {
    const asset = findProjectAsset(project, node.assetId);
    return asset ? `assets/asset-${assetFingerprint(asset.dataUrl)}.${assetExtension(asset.mime)}` : '';
  }
  if (!node.src) return '';
  const mime = node.src.match(/^data:image\/(png|jpeg|webp|gif);base64,/i)?.[1]?.toLowerCase();
  const extension = mime === 'jpeg' ? 'jpg' : mime || 'png';
  return `assets/image-${node.id}.${extension}`;
}

export function decodeImageDataUrl(dataUrl) {
  const match = typeof dataUrl === 'string' ? dataUrl.match(/^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=\r\n]+)$/) : null;
  if (!match) throw new Error('Unsupported image data. Use PNG, JPG, WebP or GIF.');
  const binary = atob(match[2].replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { mime: `image/${match[1]}`, bytes };
}

function decodeAssetDataUrl(dataUrl) {
  try { return decodeImageDataUrl(dataUrl); } catch {}
  const sanitized = sanitizeSvgDataUrl(dataUrl);
  const encoded = sanitized.slice(sanitized.indexOf(',') + 1);
  const binary = atob(encoded);
  return { mime: 'image/svg+xml', bytes: Uint8Array.from(binary, (char) => char.charCodeAt(0)) };
}

export function collectExportAssets(project) {
  const assets = {};
  const exportedData = new Set();
  const pages = Array.isArray(project.pages) ? project.pages : [project.page];
  for (const page of pages) for (const section of page.sections) walkNodeTree(section.children, (sourceNode) => {
    const node = sourceNode.type === 'component' ? resolveComponentInstance(sourceNode, project) : sourceNode;
    if (node?.type !== 'image') return;
    const dataUrl = imageSource(node, project);
    if (!dataUrl) return;
    if (node.assetId) {
      const path = imageAssetPath(node, project);
      if (exportedData.has(path)) return;
      const decoded = decodeAssetDataUrl(dataUrl); assets[path] = decoded.bytes; exportedData.add(path);
    } else {
      const path = imageAssetPath(node, project);
      if (!Object.hasOwn(assets, path)) assets[path] = decodeImageDataUrl(dataUrl).bytes;
    }
  });
  return assets;
}

function cssTokenColor(value, role, linked = false) {
  return linked ? `var(--cf-color-${role})` : value;
}

function normalizePageEditorSettings(raw = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const guides = Array.isArray(source.guides) ? source.guides.slice(0, 100).map((guide, index) => ({
    id: safeId(guide?.id, `guide-${index + 1}`),
    axis: guide?.axis === 'y' ? 'y' : 'x',
    position: Math.round(Math.max(-5000, Math.min(10000, Number.isFinite(Number(guide?.position)) ? Number(guide.position) : 0)) * 10) / 10,
    locked: guide?.locked === true,
    visible: guide?.visible !== false
  })) : [];
  const snapRaw = source.snap && typeof source.snap === 'object' ? source.snap : {};
  return {
    guides,
    gridStep: clampNumber(source.gridStep, 4, 128, 16),
    snap: {
      grid: snapRaw.grid !== false,
      parent: snapRaw.parent !== false,
      siblings: snapRaw.siblings !== false,
      guides: snapRaw.guides !== false,
      equalSpacing: snapRaw.equalSpacing === true,
      horizontal: snapRaw.horizontal !== false,
      vertical: snapRaw.vertical !== false
    }
  };
}

function freePositionCssValues(node, breakpoint = 'desktop') {
  const positioning = resolveFreePositioning(node.positioning, breakpoint);
  if (positioning.mode !== 'free' || node.positionMode === 'overlay') return '';
  const width = positioning.width > 0 ? `width:${positioning.width}px;` : '';
  const height = positioning.height > 0 ? `height:${positioning.height}px;` : '';
  const rotation = positioning.rotation ? `rotate(${positioning.rotation}deg)` : 'none';
  return `position:absolute;left:${positioning.x}${positioning.xUnit};top:${positioning.y}${positioning.yUnit};${width}${height}transform:${rotation};transform-origin:${positioning.transformOrigin};z-index:2;max-width:none;margin:0;`;
}

function nodeFreePositionCss(node) {
  if (node.positioning?.mode !== 'free' || node.positionMode === 'overlay') return '';
  const declarations = freePositionCssValues(node);
  if (!declarations) return '';
  const rules = [`.node-${node.id}[data-cf-free="true"] { ${declarations} }`];
  for (const breakpoint of BREAKPOINTS) {
    const responsive = node.positioning?.responsive?.[breakpoint];
    if (!responsive || !Object.keys(responsive).length) continue;
    const merged = resolveFreePositioning(node.positioning, breakpoint);
    const width = merged.width > 0 ? `width:${merged.width}px;` : 'width:auto;';
    const height = merged.height > 0 ? `height:${merged.height}px;` : 'height:auto;';
    rules.push(`@media (max-width:${breakpoint === 'tablet' ? 1024 : 760}px) { .node-${node.id}[data-cf-free="true"] { left:${merged.x}${merged.xUnit}; top:${merged.y}${merged.yUnit}; ${width} ${height} transform:${merged.rotation ? `rotate(${merged.rotation}deg)` : 'none'}; transform-origin:${merged.transformOrigin}; } }`);
  }
  return rules.join('\n');
}

function nodeCss(node, project = null) {
  if (node.type === 'component') { const resolved = resolveComponentInstance(node, project); return resolved ? nodeCss(resolved, project) : `.node-${node.id} { display:block; color:#a33b46; }`; }
  const selector = `.node-${node.id}`;
  const layerCss = `${node.visible === false ? 'display: none !important; ' : ''}--cf-element-opacity: ${Math.max(0, Math.min(100, node.opacity ?? 100)) / 100}; opacity: var(--cf-element-opacity);`;
  if (node.type === 'container') {
    const layout = node.layout || 'flex';
    const display = layout === 'grid' ? 'display:grid;' : 'display:flex;';
    const columns = node.gridMode === 'auto-fit' ? `repeat(auto-fit,minmax(min(100%,${node.gridMinColumnWidth}px),1fr))` : `repeat(${node.gridColumns},minmax(0,1fr))`;
    const justify = ({ start:'flex-start', center:'center', end:'flex-end', 'space-between':'space-between', 'space-around':'space-around', 'space-evenly':'space-evenly' })[node.justifyContent] || 'flex-start';
    const align = ({ start:'flex-start', center:'center', end:'flex-end', stretch:'stretch' })[node.alignItems] || 'stretch';
    const horizontalFlex = layout === 'flex' && ['row', 'row-reverse'].includes(node.flexDirection);
    const childLayoutCss = horizontalFlex ? `\n${selector} > .cf-layout-container, ${selector} > .cf-card { flex: 1 1 240px; width: auto; }` : '';
    return `${selector} { ${layerCss} position:relative; ${display} ${layout === 'grid' ? `grid-template-columns:${columns};` : `flex-direction:${node.layout === 'stack' ? 'column' : node.flexDirection}; flex-wrap:${node.flexWrap}; justify-content:${justify};`} align-items:${align}; gap:${node.rowGap}px ${node.columnGap}px; width:100%; max-width:${node.maxWidth}px; min-height:${node.minHeight}px; padding:${node.paddingY}px ${node.paddingX}px; margin-inline:auto; background:${node.backgroundColor}; border:1px solid ${node.borderColor}; border-radius:${node.borderRadius}px; }${childLayoutCss}`;
  }
  if (node.type === 'heading') {
    const minSize = Math.max(22, Math.round(node.fontSize * 0.56));
    return `${selector} { ${layerCss} max-width: min(100%, ${node.maxWidth || 980}px); color: ${cssTokenColor(node.color, 'text', node.designTokens?.color === 'text')}; font-size: ${node.designTokens?.fontSize ? `var(--cf-type-${node.designTokens.fontSize})` : `clamp(${minSize}px, 5.2vw, ${node.fontSize}px)`}; font-weight: ${node.designTokens?.fontWeight === 'headingWeight' ? 'var(--cf-font-heading-weight)' : node.fontWeight}; font-family: ${node.designTokens?.fontFamily === 'heading' ? 'var(--cf-font-heading)' : fontFamily(node.fontFamily)}; text-align: ${node.textAlign}; }`;
  }
  if (node.type === 'paragraph') {
    const minSize = Math.max(14, Math.round(node.fontSize * 0.82));
    return `${selector} { ${layerCss} max-width: min(100%, ${node.maxWidth || 760}px); color: ${cssTokenColor(node.color, 'muted', node.designTokens?.color === 'muted')}; font-size: ${node.designTokens?.fontSize === 'body' ? 'var(--cf-type-body)' : `clamp(${minSize}px, 1.8vw, ${node.fontSize}px)`}; font-weight: ${node.designTokens?.fontWeight === 'bodyWeight' ? 'var(--cf-font-body-weight)' : node.fontWeight}; font-family: ${node.designTokens?.fontFamily === 'body' ? 'var(--cf-font-body)' : fontFamily(node.fontFamily)}; text-align: ${node.textAlign}; }`;
  }
  if (node.type === 'button') return `${selector} { ${layerCss} color: ${node.textColor}; background: ${cssTokenColor(node.backgroundColor, 'primary', node.designTokens?.backgroundColor === 'primary')}; font-size: ${node.designTokens?.fontSize === 'button' ? 'var(--cf-type-button)' : `${node.fontSize}px`}; font-weight: ${node.fontWeight}; border-radius: ${node.designTokens?.borderRadius === 'medium' ? 'var(--cf-radius-medium)' : `${node.borderRadius}px`};${node.width ? ` width: min(100%, ${node.width}px);` : ''} }
${selector}:hover { color:${node.hoverTextColor || node.textColor}; background:${node.hoverBackgroundColor || node.backgroundColor}; }
${selector}:focus-visible { outline:3px solid ${node.focusOutlineColor || '#2f70db'}; outline-offset:4px; }
${selector}:active { transform:scale(${Math.max(.94, Math.min(1, node.activeScale ?? .98))}); }`;
  if (node.type === 'image') return `${selector} { ${layerCss} width: 100%; max-width: ${node.maxWidth}px; height: min(${node.height}px, 65vw); object-fit: ${node.objectFit}; object-position: ${node.objectPosition || '50% 50%'}; border-radius: ${node.borderRadius}px; }`;
  if (node.type === 'card') return `${selector} { ${layerCss} max-width: ${node.maxWidth || 1200}px; color: ${cssTokenColor(node.color, 'text', node.designTokens?.color === 'text')}; background: ${cssTokenColor(node.backgroundColor, 'surface', node.designTokens?.backgroundColor === 'surface')}; border-color: ${cssTokenColor(node.borderColor, 'border', node.designTokens?.borderColor === 'border')}; border-radius: ${node.designTokens?.borderRadius === 'large' ? 'var(--cf-radius-large)' : `${node.borderRadius}px`}; padding: ${node.padding}px; }`;
  if (node.type === 'divider') return `${selector} { ${layerCss} width: ${node.width}%; height: ${node.height}px; background: ${cssTokenColor(node.color, 'border', node.designTokens?.color === 'border')}; }`;
  if (node.type === 'vector') {
    const rule = `${selector} { ${layerCss} display: block; flex: 0 0 auto; width: ${node.width}px; height: ${node.height}px; max-width: 100%; overflow: visible; }`;
    return node.positionMode === 'overlay' ? `${rule}\n${selector}[data-cf-position=\"overlay\"] { position: absolute; left: ${node.xPercent}%; top: ${node.yPercent}%; z-index: ${node.zIndex}; transform: translate(-50%, -50%); max-width: none; margin: 0; pointer-events: none; }` : rule;
  }
  const isRing = node.shapeKind === 'ring';
  const shapeRule = `${selector} { ${layerCss} width: ${node.width}px; max-width: 100%; height: ${node.height}px; background: ${isRing ? 'transparent' : node.backgroundColor}; border-radius: ${node.shapeKind === 'circle' || isRing ? '50%' : node.shapeKind === 'pill' ? '999px' : `${node.borderRadius}px`};${isRing ? ` border: ${Math.max(4, Math.min(18, Math.round(Math.min(node.width, node.height) * 0.12)))}px solid ${node.backgroundColor};` : ''} }`;
  if (node.positionMode !== 'overlay') return shapeRule;
  return `${shapeRule}\n${selector}[data-cf-position=\"overlay\"] { position: absolute; left: ${node.xPercent}%; top: ${node.yPercent}%; z-index: ${node.zIndex}; transform: translate(-50%, -50%); max-width: none; flex: none; margin: 0; pointer-events: none; }`;
}

function nodeMotionCss(node, project = null) {
  if (node.type === 'component') { const resolved = resolveComponentInstance(node, project); return resolved ? nodeMotionCss(resolved, project) : ''; }
  if (node.animation === 'none') return '';
  const selector = `.node-${node.id}`;
  const trigger = MOTION_TRIGGERS.includes(node.animationTrigger) ? node.animationTrigger : 'load';
  const keyframe = MOTION_KEYFRAMES[node.animation];
  if (!keyframe) return '';
  const vars = `${selector} { --cf-motion-duration: ${node.animationDuration}ms; --cf-motion-delay: ${node.animationDelay}ms; --cf-motion-easing: ${MOTION_EASING_CSS[node.animationEasing] || 'ease'}; --cf-motion-direction: ${node.animationDirection}; }`;
  if (trigger === 'viewport') return `${vars}\n${selector}[data-cf-motion-trigger=\"viewport\"]:not(.cf-motion-active) { animation-name: none !important; }`;
  if (trigger === 'hover') return `${vars}\n${selector}[data-cf-motion-trigger=\"hover\"] { animation-name: none; }\n${selector}[data-cf-motion-trigger=\"hover\"]:hover, ${selector}[data-cf-motion-trigger=\"hover\"]:focus-visible { animation-name: ${keyframe}; }`;
  return vars;
}

function alignmentCss(node, value = node.alignSelf) {
  if (!['start', 'center', 'end', 'stretch'].includes(value)) return '';
  const alignValue = ({ start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' })[value];
  const justifyValue = ({ start: 'start', center: 'center', end: 'end', stretch: 'stretch' })[value];
  return `.node-${node.id} { align-self: ${alignValue}; justify-self: ${justifyValue}; }`;
}

function responsiveCssForNode(node, overrides) {
  const selector = `.node-${node.id}`;
  const declarations = [];
  const add = (property, value) => declarations.push(`${property}: ${value};`);
  for (const [prop, value] of Object.entries(overrides)) {
    if (['color', 'textColor', 'backgroundColor', 'borderColor'].includes(prop)) {
      const cssProp = prop === 'textColor' || prop === 'color' ? 'color' : prop === 'borderColor' ? 'border-color' : 'background-color';
      add(cssProp, value);
    } else if (prop === 'fontSize') add('font-size', `${value}px`);
    else if (prop === 'textAlign') add('text-align', value);
    else if (prop === 'maxWidth') {
      if (node.type === 'section') continue;
      add('max-width', `min(100%, ${value}px)`);
    } else if (prop === 'width') {
      if (node.type === 'divider') add('width', `${value}%`);
      else if (node.type === 'button' && value === 0) add('width', 'auto');
      else add('width', `min(100%, ${value}px)`);
    } else if (prop === 'height') add('height', `${value}px`);
    else if (prop === 'objectPosition') { const position = normalizeFocalPosition(value, ''); if (position) add('object-position', position); }
    else if (['shape', 'vector'].includes(node.type) && node.positionMode === 'overlay' && prop === 'xPercent') add('left', `${value}%`);
    else if (['shape', 'vector'].includes(node.type) && node.positionMode === 'overlay' && prop === 'yPercent') add('top', `${value}%`);
    else if (prop === 'borderRadius') add('border-radius', `${value}px`);
    else if (prop === 'padding') add('padding', `${value}px`);
    else if (prop === 'alignSelf' && ['auto', 'start', 'center', 'end', 'stretch'].includes(value)) {
      if (value === 'auto') { add('align-self', 'auto'); add('justify-self', 'auto'); }
      else {
        add('align-self', ({ start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' })[value]);
        add('justify-self', value);
      }
    }
  }
  const overlayPositionOverride = ['shape', 'vector'].includes(node.type) && node.positionMode === 'overlay' &&
    (Object.hasOwn(overrides, 'xPercent') || Object.hasOwn(overrides, 'yPercent'));
  // Match the base overlay selector's specificity so breakpoint positions can override desktop values.
  const effectiveSelector = overlayPositionOverride ? `${selector}[data-cf-position="overlay"]` : selector;
  const rules = [];
  if (node.type === 'container') {
    const layout = overrides.layout || node.layout || 'flex';
    if (Object.hasOwn(overrides, 'layout')) add('display', layout === 'grid' ? 'grid' : 'flex');
    if (layout === 'stack') add('flex-direction', 'column');
    if (layout === 'flex') {
      if (overrides.flexDirection) add('flex-direction', overrides.flexDirection);
      if (overrides.flexWrap) add('flex-wrap', overrides.flexWrap);
      if (overrides.justifyContent) add('justify-content', ({start:'flex-start',center:'center',end:'flex-end','space-between':'space-between','space-around':'space-around','space-evenly':'space-evenly'})[overrides.justifyContent]);
    }
    if (overrides.alignItems) add('align-items', ({start:'flex-start',center:'center',end:'flex-end',stretch:'stretch'})[overrides.alignItems]);
    if (layout === 'grid') {
      const mode = overrides.gridMode || node.gridMode;
      const minWidth = overrides.gridMinColumnWidth ?? node.gridMinColumnWidth;
      const cols = overrides.gridColumns ?? node.gridColumns;
      add('grid-template-columns', mode === 'auto-fit' ? `repeat(auto-fit,minmax(min(100%,${clampNumber(minWidth,120,480,240)}px),1fr))` : `repeat(${clampNumber(cols,1,6,2)},minmax(0,1fr))`);
    }
    if (Object.hasOwn(overrides, 'gap')) add('gap', `${overrides.gap}px`);
    if (Object.hasOwn(overrides, 'rowGap')) add('row-gap', `${overrides.rowGap}px`);
    if (Object.hasOwn(overrides, 'columnGap')) add('column-gap', `${overrides.columnGap}px`);
    if (Object.hasOwn(overrides, 'padding')) add('padding', `${overrides.padding}px`);
    if (Object.hasOwn(overrides, 'paddingX')) { add('padding-left', `${overrides.paddingX}px`); add('padding-right', `${overrides.paddingX}px`); }
    if (Object.hasOwn(overrides, 'paddingY')) { add('padding-top', `${overrides.paddingY}px`); add('padding-bottom', `${overrides.paddingY}px`); }
    if (Object.hasOwn(overrides, 'minHeight')) add('min-height', `${overrides.minHeight}px`);
    if (Object.hasOwn(overrides, 'maxWidth')) add('max-width', `min(100%, ${overrides.maxWidth}px)`);
    const horizontalFlex = layout === 'flex' && ['row', 'row-reverse'].includes(overrides.flexDirection || node.flexDirection);
    if (horizontalFlex) rules.push(`${selector} > .cf-layout-container, ${selector} > .cf-card { flex: 1 1 240px; width: auto; }`);
    else if (Object.hasOwn(overrides, 'layout') || Object.hasOwn(overrides, 'flexDirection')) rules.push(`${selector} > .cf-layout-container, ${selector} > .cf-card { flex: 0 1 auto; width: 100%; }`);
  }
  if (declarations.length) rules.unshift(`${effectiveSelector} { ${declarations.join(' ')} }`);
  if (node.type === 'section') {
    const container = [];
    const layout = overrides.layout || node.layout;
    if (Object.hasOwn(overrides, 'layout')) {
      if (layout === 'stack') container.push('display: flex;', 'flex-direction: column;', 'align-items: stretch;');
      else if (layout === 'flex') container.push('display: flex;');
      else container.push('display: grid;');
      if (layout === 'grid' || layout === 'two-column') rules.push(`.cf-section${selector} .cf-heading, .cf-section${selector} .cf-paragraph, .cf-section${selector} .cf-button { grid-column: 1 / -1; }`);
    }
    if (layout === 'flex') {
      const direction = overrides.flexDirection || node.flexDirection || 'row';
      const wrap = overrides.flexWrap || node.flexWrap || 'wrap';
      const justify = overrides.justifyContent || node.justifyContent || 'start';
      const align = overrides.alignItems || node.alignItems || 'stretch';
      container.push(`flex-direction: ${FLEX_DIRECTIONS.includes(direction) ? direction : 'row'};`, `flex-wrap: ${FLEX_WRAP_OPTIONS.includes(wrap) ? wrap : 'wrap'};`);
      container.push(`justify-content: ${{start:'flex-start',center:'center',end:'flex-end','space-between':'space-between','space-around':'space-around','space-evenly':'space-evenly'}[JUSTIFY_OPTIONS.includes(justify) ? justify : 'start']};`);
      container.push(`align-items: ${{start:'flex-start',center:'center',end:'flex-end',stretch:'stretch'}[ALIGN_ITEMS_OPTIONS.includes(align) ? align : 'stretch']};`);
    }
    if (layout === 'grid') {
      const mode = overrides.gridMode || node.gridMode || 'fixed';
      if (mode === 'auto-fit') {
        const minWidth = overrides.gridMinColumnWidth ?? node.gridMinColumnWidth ?? 240;
        container.push(`grid-template-columns: repeat(auto-fit, minmax(min(100%, ${clampNumber(minWidth, 120, 480, 240)}px), 1fr));`);
      } else {
        const columns = overrides.gridColumns ?? node.gridColumns ?? 3;
        container.push(`grid-template-columns: repeat(${clampNumber(columns, 1, 6, 3)}, minmax(0, 1fr));`);
      }
      const align = overrides.alignItems || (overrides.contentAlign ? (overrides.contentAlign === 'left' ? 'start' : 'center') : node.alignItems || 'center');
      container.push(`align-items: ${{start:'flex-start',center:'center',end:'flex-end',stretch:'stretch'}[ALIGN_ITEMS_OPTIONS.includes(align) ? align : 'stretch']};`);
    } else if (layout === 'two-column') {
      const align = overrides.contentAlign || node.contentAlign || 'center';
      container.push('grid-template-columns: repeat(2, minmax(0, 1fr));', `align-items: ${align === 'left' ? 'flex-start' : 'center'};`);
    }
    if (Number.isFinite(overrides.maxWidth)) container.push(`max-width: ${overrides.maxWidth}px;`);
    if (Number.isFinite(overrides.gap)) container.push(`gap: ${overrides.gap}px;`);
    if (['left', 'center'].includes(overrides.contentAlign) && !Object.hasOwn(overrides, 'alignItems') && layout !== 'flex' && layout !== 'grid') container.push(`align-items: ${overrides.contentAlign === 'left' ? 'flex-start' : 'center'};`);
    if (container.length) rules.push(`.cf-section${selector} .cf-container { ${container.join(' ')} }`);
    if (layout === 'flex') rules.push(`.cf-section${selector} .cf-container > .cf-card { flex: 1 1 240px; width: auto; }`);
    if (Number.isFinite(overrides.paddingY)) rules.push(`${selector} { padding-top: ${overrides.paddingY}px; padding-bottom: ${overrides.paddingY}px; }`);
  }
  return rules;
}

function freeParentSizingCss(nodes, selector, padding = 0) {
  const freeNodes = (Array.isArray(nodes) ? nodes : []).filter((node) => node?.positioning?.mode === 'free' && node.positionMode !== 'overlay');
  if (!freeNodes.length) return '';
  const bottom = freeNodes.reduce((max, node) => {
    const pos = resolveFreePositioning(node.positioning);
    if (pos.yUnit === '%') return max;
    return Math.max(max, pos.y + (pos.height || 0));
  }, 0);
  const minHeight = Math.max(280, Math.ceil(bottom + padding + 32));
  return `${selector} { position:relative; min-height:${minHeight}px; }`;
}

export function generateCss(project, options = {}) {
  const page = options.page || project.page;
  const ds = normalizeDesignSystem(project.designSystem);
  const rules = [
    '/* CanvasFlow website export — generated from the structured project model. */',
    `:root { color-scheme: light; --cf-color-primary: ${ds.colors.primary}; --cf-color-text: ${ds.colors.text}; --cf-color-muted: ${ds.colors.muted}; --cf-color-surface: ${ds.colors.surface}; --cf-color-border: ${ds.colors.border}; --cf-color-page: ${ds.colors.page}; --cf-font-heading: ${fontFamily(ds.typography.headingFont)}; --cf-font-body: ${fontFamily(ds.typography.bodyFont)}; --cf-font-heading-weight: ${ds.typography.headingWeight}; --cf-font-body-weight: ${ds.typography.bodyWeight}; --cf-type-body-base: ${getTypographyScale(ds).body}px; --cf-type-button-base: ${getTypographyScale(ds).button}px; --cf-type-h1-base: ${getTypographyScale(ds).h1}px; --cf-type-h2-base: ${getTypographyScale(ds).h2}px; --cf-type-h3-base: ${getTypographyScale(ds).h3}px; --cf-type-body: var(--cf-type-body-base); --cf-type-button: var(--cf-type-button-base); --cf-type-h1: var(--cf-type-h1-base); --cf-type-h2: var(--cf-type-h2-base); --cf-type-h3: var(--cf-type-h3-base); --cf-radius-small: ${ds.radius.small}px; --cf-radius-medium: ${ds.radius.medium}px; --cf-radius-large: ${ds.radius.large}px; --cf-space-section: ${ds.spacing.section}px; --cf-space-gap: ${ds.spacing.gap}px; --cf-width-content: ${ds.width.content}px; --cf-width-wide: ${ds.width.wide}px; }`,
    '@media (max-width: 1024px) { :root { --cf-type-body: calc(var(--cf-type-body-base) * .96); --cf-type-button: calc(var(--cf-type-button-base) * .96); --cf-type-h1: calc(var(--cf-type-h1-base) * .92); --cf-type-h2: calc(var(--cf-type-h2-base) * .94); --cf-type-h3: calc(var(--cf-type-h3-base) * .96); } }',
    '@media (max-width: 760px) { :root { --cf-type-body: calc(var(--cf-type-body-base) * .94); --cf-type-button: calc(var(--cf-type-button-base) * .94); --cf-type-h1: calc(var(--cf-type-h1-base) * .82); --cf-type-h2: calc(var(--cf-type-h2-base) * .88); --cf-type-h3: calc(var(--cf-type-h3-base) * .92); } }',
    '* { box-sizing: border-box; }',
    'html { scroll-behavior: smooth; }',
    `body { margin: 0; color: var(--cf-color-text); background: ${page.designTokens?.backgroundColor === 'page' ? 'var(--cf-color-page)' : (isHexColor(page.backgroundColor) ? page.backgroundColor : '#ffffff')}; font-family: var(--cf-font-body); }`,
    `.cf-page { width: 100%; min-height: 100vh; overflow: clip; background-color: ${page.designTokens?.backgroundColor === 'page' ? 'var(--cf-color-page)' : (isHexColor(page.backgroundColor) ? page.backgroundColor : '#ffffff')}; }`,
    `body#cf-page-${page.slug} .cf-page { background-color: ${page.designTokens?.backgroundColor === 'page' ? 'var(--cf-color-page)' : (isHexColor(page.backgroundColor) ? page.backgroundColor : '#ffffff')}; }`,
    '.cf-site-header { display:flex; align-items:center; justify-content:space-between; gap:24px; padding:18px clamp(20px,5vw,64px); border-bottom:1px solid var(--cf-color-border); background:var(--cf-color-page); }',
    '.cf-site-brand { color:var(--cf-color-text); font-weight:800; text-decoration:none; letter-spacing:-.03em; }',
    '.cf-site-navigation { display:flex; align-items:center; gap:clamp(14px,3vw,30px); flex-wrap:wrap; }',
    '.cf-site-navigation a,.cf-site-footer a { color:var(--cf-color-muted); text-decoration:none; font-size:14px; font-weight:600; }',
    '.cf-site-navigation a[aria-current="page"] { color:var(--cf-color-primary); }',
    '.cf-site-navigation a:hover,.cf-site-footer a:hover { color:var(--cf-color-primary); }',
    '.cf-site-footer { display:flex; align-items:center; justify-content:space-between; gap:20px; flex-wrap:wrap; padding:28px clamp(20px,5vw,64px); border-top:1px solid var(--cf-color-border); color:var(--cf-color-muted); background:var(--cf-color-page); font-size:13px; }',
    '.cf-site-footer nav { display:flex; flex-wrap:wrap; gap:18px; }',
    '.cf-section { position: relative; isolation: isolate; display: flex; justify-content: center; width: 100%; padding: 80px 28px; overflow-wrap: anywhere; }',
    '.cf-section.cf-interaction-force-visible { display: flex !important; }',
    '.cf-section.cf-interaction-force-hidden { display: none !important; }',
    '.cf-overlay-layer { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }',
    '.cf-overlay-layer .cf-vector[data-cf-position="overlay"] { pointer-events: auto; touch-action: none; }',
    '.cf-container { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 24px; width: 100%; margin: 0 auto; }',
    '.cf-layout-container { position: relative; display: flex; flex-direction: row; flex-wrap: wrap; align-items: stretch; gap: 20px; width: 100%; min-width: 0; margin-inline: auto; }',
    '.cf-layout-container > * { min-width: 0; }',
    '.cf-section.layout-two-column .cf-container { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; }',
    '.cf-section.layout-grid .cf-container { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: stretch; }',
    '.cf-section.layout-two-column .cf-heading, .cf-section.layout-two-column .cf-paragraph, .cf-section.layout-two-column .cf-button, .cf-section.layout-grid .cf-heading, .cf-section.layout-grid .cf-paragraph, .cf-section.layout-grid .cf-button { grid-column: 1 / -1; }',
    '.cf-section.align-left .cf-container { align-items: flex-start; }',
    '.cf-section.align-center .cf-container { align-items: center; }',
    '.cf-heading { max-width: 100%; margin: 0; line-height: 1.04; letter-spacing: -.045em; }',
    '.cf-paragraph { max-width: 66ch; margin: 0; line-height: 1.75; }',
    '.cf-button { display: inline-flex; justify-content: center; align-items: center; min-height: 48px; max-width: 100%; padding: 13px 22px; text-decoration: none; border: 1px solid transparent; box-shadow: 0 8px 20px rgba(63,43,156,.16); transition: transform .18s ease, filter .18s ease, box-shadow .18s ease; }',
    '.cf-button:hover:not([data-cf-free="true"]) { filter: brightness(1.05); transform: translateY(-2px); box-shadow: 0 12px 24px rgba(63,43,156,.22); }',
    '.cf-button[data-cf-free="true"]:hover { filter: brightness(1.05); box-shadow: 0 12px 24px rgba(63,43,156,.22); }',
    '.cf-button:focus-visible { outline: 3px solid #2f70db; outline-offset: 4px; }',
    '.cf-image { display: block; max-width: 100%; height: auto; object-position: center; }',
    '.cf-image-placeholder { display: grid; place-items: center; width: min(100%, 640px); min-height: 220px; padding: 24px; border: 1px dashed #aaa4c1; border-radius: 18px; color: #77718d; background: linear-gradient(135deg,#f4f1ff,#f9fafb); text-align: center; }',
    '.cf-card { width: 100%; min-width: 0; border: 1px solid; box-shadow: 0 12px 32px rgba(30,24,54,.045); }',
    '.cf-card-symbol { display: inline-grid; place-items: center; width: 34px; height: 34px; margin-bottom: 17px; border-radius: var(--cf-radius-small); color: var(--cf-color-primary); background: color-mix(in srgb, var(--cf-color-primary) 10%, white); font-size: 18px; }',
    '.cf-card h3 { margin: 0 0 10px; font-size: 18px; line-height: 1.3; letter-spacing: -.02em; }',
    '.cf-card p { margin: 0; color: inherit; opacity: .76; font-size: 14px; line-height: 1.7; }',
    '.cf-divider { flex: 0 0 auto; max-width: 100%; border-radius: 999px; }',
    '.cf-shape { max-width: 100%; flex: 0 0 auto; }',
    '.cf-vector { display: block; max-width: 100%; flex: 0 0 auto; overflow: visible; }',
    '.cf-shape.shape-triangle { clip-path: polygon(50% 0%, 0% 100%, 100% 100%); }',
    '.cf-shape.shape-diamond { clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); }',
    '.cf-shape.shape-hexagon { clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%); }',
    '.cf-shape.shape-star { clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 95%, 50% 72%, 21% 95%, 32% 57%, 2% 35%, 39% 35%); }',
    '.cf-motion-fade { animation: cf-fade-in var(--cf-motion-duration, 700ms) var(--cf-motion-easing, ease) var(--cf-motion-delay, 0ms) var(--cf-motion-direction, normal) both; }',
    '.cf-motion-rise { animation: cf-rise-in var(--cf-motion-duration, 700ms) var(--cf-motion-easing, cubic-bezier(.2,.75,.25,1)) var(--cf-motion-delay, 0ms) var(--cf-motion-direction, normal) both; }',
    '.cf-motion-slide-left { animation: cf-slide-left var(--cf-motion-duration, 650ms) var(--cf-motion-easing, cubic-bezier(.2,.75,.25,1)) var(--cf-motion-delay, 0ms) var(--cf-motion-direction, normal) both; }',
    '.cf-motion-slide-right { animation: cf-slide-right var(--cf-motion-duration, 650ms) var(--cf-motion-easing, cubic-bezier(.2,.75,.25,1)) var(--cf-motion-delay, 0ms) var(--cf-motion-direction, normal) both; }',
    '.cf-motion-zoom { animation: cf-zoom-in var(--cf-motion-duration, 600ms) var(--cf-motion-easing, cubic-bezier(.2,.75,.25,1)) var(--cf-motion-delay, 0ms) var(--cf-motion-direction, normal) both; }',
    '.cf-motion-blur { animation: cf-blur-in var(--cf-motion-duration, 800ms) var(--cf-motion-easing, ease) var(--cf-motion-delay, 0ms) var(--cf-motion-direction, normal) both; }',
    '[data-cf-motion-trigger="viewport"]:not(.cf-motion-active) { animation-name: none !important; }',
    '.cf-motion-pending { opacity: 0 !important; }',
    '@keyframes cf-fade-in { from { opacity: 0; } to { opacity: var(--cf-element-opacity, 1); } }',
    '@keyframes cf-rise-in { from { opacity: 0; transform: translateY(18px); } to { opacity: var(--cf-element-opacity, 1); transform: translateY(0); } }',
    '@keyframes cf-slide-left { from { opacity: 0; transform: translateX(24px); } to { opacity: var(--cf-element-opacity, 1); transform: translateX(0); } }',
    '@keyframes cf-slide-right { from { opacity: 0; transform: translateX(-24px); } to { opacity: var(--cf-element-opacity, 1); transform: translateX(0); } }',
    '@keyframes cf-zoom-in { from { opacity: 0; transform: scale(.94); } to { opacity: var(--cf-element-opacity, 1); transform: scale(1); } }',
    '@keyframes cf-blur-in { from { opacity: 0; filter: blur(8px); } to { opacity: var(--cf-element-opacity, 1); filter: blur(0); } }',
    ...page.sections.flatMap((section) => [
      `.node-${section.id} { ${section.visible === false ? 'display: none !important; ' : ''}opacity: ${Math.max(0, Math.min(100, section.opacity ?? 100)) / 100}; background-color: ${section.designTokens?.backgroundColor === 'page' ? 'var(--cf-color-page)' : section.designTokens?.backgroundColor === 'surface' ? 'var(--cf-color-surface)' : section.backgroundColor}; padding-top: ${section.designTokens?.paddingY === 'section' ? 'var(--cf-space-section)' : `${section.paddingY}px`}; padding-bottom: ${section.designTokens?.paddingY === 'section' ? 'var(--cf-space-section)' : `${section.paddingY}px`}; }`,
      `.node-${section.id} .cf-container { max-width: ${section.designTokens?.maxWidth === 'content' ? 'var(--cf-width-content)' : section.designTokens?.maxWidth === 'wide' ? 'var(--cf-width-wide)' : `${section.maxWidth}px`}; gap: ${section.designTokens?.gap === 'gap' ? 'var(--cf-space-gap)' : `${section.gap}px`}; }`,
      `.cf-section.node-${section.id} .cf-container { ${section.layout === 'flex' ? `display:flex; flex-direction:${section.flexDirection}; flex-wrap:${section.flexWrap}; justify-content:${({start:'flex-start',center:'center',end:'flex-end','space-between':'space-between','space-around':'space-around','space-evenly':'space-evenly'})[section.justifyContent]}; align-items:${({start:'flex-start',center:'center',end:'flex-end',stretch:'stretch'})[section.alignItems]};` : section.layout === 'grid' ? `grid-template-columns:${section.gridMode === 'auto-fit' ? `repeat(auto-fit, minmax(min(100%, ${section.gridMinColumnWidth}px), 1fr))` : `repeat(${section.gridColumns}, minmax(0, 1fr))`}; align-items:${({start:'flex-start',center:'center',end:'flex-end',stretch:'stretch'})[section.alignItems]};` : section.layout === 'two-column' ? `grid-template-columns:repeat(2,minmax(0,1fr)); align-items:${section.contentAlign === 'left' ? 'flex-start' : 'center'};` : 'flex-direction:column;'} }`,
      ...(section.componentKind === 'navigation' ? [`.node-${section.id}.cf-component-navigation .cf-container { display: flex; flex-direction: row; align-items: center; justify-content: space-between; flex-wrap: wrap; }`] : []),
      ...(section.componentKind === 'footer' ? [`.node-${section.id}.cf-component-footer .cf-container { display: flex; flex-direction: row; align-items: center; justify-content: space-between; flex-wrap: wrap; }`] : []),
      ...(section.layout === 'grid' || section.layout === 'two-column' ? [`.cf-section.node-${section.id} .cf-heading, .cf-section.node-${section.id} .cf-paragraph, .cf-section.node-${section.id} .cf-button { grid-column: 1 / -1; }`] : []),
      ...(section.layout === 'flex' ? [`.cf-section.node-${section.id} .cf-container > .cf-card { flex: 1 1 240px; width: auto; }`] : []),
      `.node-${section.id}.layout-stack { align-items: center; }`,
      freeParentSizingCss(section.children, `.node-${section.id} .cf-container`, 56),
      ...(() => { const output = []; walkNodeTree(section.children, (sourceNode) => { const node = sourceNode.type === 'component' ? resolveComponentInstance(sourceNode, project) : sourceNode; if (!node) return; output.push(nodeCss(sourceNode, project), nodeFreePositionCss(node), nodeMotionCss(sourceNode, project)); if (node.alignSelf !== 'auto') output.push(alignmentCss(node)); if (node.type === 'container') output.push(freeParentSizingCss(node.children, `.node-${node.id}`, (node.paddingY || 0) * 2)); }); return output; })()
    ]),
    '@media (max-width: 760px) { .cf-site-header { align-items:flex-start; flex-direction:column; gap:12px; } .cf-site-navigation { gap:14px; } .cf-site-footer { align-items:flex-start; flex-direction:column; } .cf-section { padding-left: 20px; padding-right: 20px; padding-top: clamp(44px, 10vw, 80px); padding-bottom: clamp(44px, 10vw, 80px); } .cf-container, .cf-section.layout-two-column .cf-container, .cf-section.layout-grid .cf-container { display: flex; flex-direction: column; align-items: stretch; gap: 20px; } .cf-section.align-center .cf-container { align-items: center; } .cf-heading { letter-spacing: -.03em; } .cf-paragraph { max-width: 42ch; } .cf-button { min-height: 48px; } .cf-card { align-self: stretch; } }',
    '@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } *, *::before, *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; animation-delay: 0ms !important; animation-iteration-count: 1 !important; } }'
  ];
  for (const breakpoint of BREAKPOINTS) {
    const mediaRules = [];
    for (const section of page.sections) {
      const sectionOverrides = section.responsive?.[breakpoint];
      if (sectionOverrides && Object.keys(sectionOverrides).length) mediaRules.push(...responsiveCssForNode({ ...section, type: 'section' }, sectionOverrides));
      walkNodeTree(section.children, (sourceNode) => { const node = sourceNode.type === 'component' ? resolveComponentInstance(sourceNode, project) : sourceNode; const overrides = node?.responsive?.[breakpoint]; if (node && overrides && Object.keys(overrides).length) mediaRules.push(...responsiveCssForNode(node, overrides)); });
    }
    if (mediaRules.length) rules.push(`@media (max-width: ${breakpoint === 'tablet' ? 1024 : 760}px) {\n${mediaRules.map((rule) => `  ${rule}`).join('\n')}\n}`);
  }
  if (options.preview) {
    rules.push('.cf-section, .cf-layout-container, .cf-heading, .cf-paragraph, .cf-button, .cf-image, .cf-image-placeholder, .cf-card, .cf-divider, .cf-shape, .cf-vector { cursor: pointer; }');
    // Let pointer events pass through the transparent container box to decorative overlays,
    // while keeping actual content elements directly selectable.
    rules.push('.cf-container { pointer-events: none; } .cf-container > * { pointer-events: auto; }');
    rules.push('.cf-layout-container { pointer-events: none; } .cf-layout-container > * { pointer-events: auto; }');
    rules.push('.cf-overlay-layer .cf-shape[data-cf-position="overlay"], .cf-overlay-layer .cf-vector[data-cf-position="overlay"] { pointer-events: auto; cursor: move; touch-action: none; }');
    rules.push('[data-cf-locked="true"] { cursor: not-allowed !important; }');
    const selectedIds = Array.isArray(options.selectedIds) ? options.selectedIds.filter((id) => ID_RE.test(String(id || ''))) : [];
    const outlineIds = [...new Set([...selectedIds, ...(options.selectedId && ID_RE.test(options.selectedId) ? [options.selectedId] : [])])];
    if (outlineIds.length) rules.push(`${outlineIds.map((id) => `.node-${id}`).join(', ')} { outline: 2px solid #8767f5; outline-offset: 3px; }`);
    rules.push('.cf-section:hover, .cf-layout-container:hover, .cf-heading:hover, .cf-paragraph:hover, .cf-button:hover, .cf-image:hover, .cf-image-placeholder:hover, .cf-card:hover, .cf-divider:hover, .cf-shape:hover, .cf-vector:hover { outline: 1px dashed #a995ff; outline-offset: 3px; }');
  }
  return `${rules.join('\n\n')}\n`;
}

export function generateHtml(project, options = {}) {
  const page = options.page || project.page;
  const pages = Array.isArray(project.pages) && project.pages.length ? project.pages : [page];
  const title = escapeHtml(page.title || project.name || 'My website');
  const allSourceNodes = page.sections.flatMap((section) => { const out = []; walkNodeTree(section.children, (node) => out.push(node)); return out; });
  const firstParagraph = allSourceNodes.map((source) => source.type === 'component' ? resolveComponentInstance(source, project) : source).find((node) => node?.type === 'paragraph')?.text;
  const description = escapeHtml(page.description || firstParagraph || 'A website created with CanvasFlow.');
  const pageFile = (target) => pages[0]?.id === target.id ? 'index.html' : `${target.slug}.html`;
  const routeLink = (target) => `./${pageFile(target)}`;
  const navigation = project.siteChrome?.navigationEnabled ? `<header class="cf-site-header"><a class="cf-site-brand" href="${routeLink(pages[0])}" ${options.preview ? `data-cf-page-id="${escapeHtml(pages[0].id)}"` : ''}>${escapeHtml(project.siteChrome.brandName || project.name)}</a><nav class="cf-site-navigation" aria-label="Main navigation">${pages.map((item) => `<a href="${routeLink(item)}"${item.id === page.id ? ' aria-current="page"' : ''}${options.preview ? ` data-cf-page-id="${escapeHtml(item.id)}"` : ''}>${escapeHtml(item.name)}</a>`).join('')}</nav></header>` : '';
  const footer = project.siteChrome?.footerEnabled ? `<footer class="cf-site-footer"><span>${escapeHtml(project.siteChrome.footerText || '')}</span><nav aria-label="Footer navigation">${pages.map((item) => `<a href="${routeLink(item)}"${options.preview ? ` data-cf-page-id="${escapeHtml(item.id)}"` : ''}>${escapeHtml(item.name)}</a>`).join('')}</nav></footer>` : '';
  const sections = page.sections.map((section, index) => {
    const id = escapeHtml(section.id);
    const anchor = escapeHtml(section.anchor || `section-${index + 1}`);
    const sectionClass = `node-${id}`;
    const isOverlayElement = (sourceNode) => {
      const node = sourceNode.type === 'component' ? resolveComponentInstance(sourceNode, project) : sourceNode;
      return Boolean(node && ['shape', 'vector'].includes(node.type) && node.positionMode === 'overlay');
    };
    const overlays = section.children.filter(isOverlayElement);
    const flowChildren = section.children.filter((node) => !isOverlayElement(node));
    const overlayLayer = (overlays.length || options.preview) ? `  <div class="cf-overlay-layer"${options.preview ? '' : ' aria-hidden="true"'}>\n    ${overlays.map((node) => renderElement(node, { ...options, project })).join('\n    ')}\n  </div>\n` : '';
    const componentClass = section.componentKind ? ` cf-component-${section.componentKind}` : '';
    const tag = section.componentKind === 'navigation' ? 'nav' : section.componentKind === 'footer' ? 'footer' : 'div';
    const label = section.componentKind === 'navigation' ? 'aria-label="Main navigation"' : section.componentKind === 'footer' ? 'aria-label="Site footer"' : '';
    return `<section id="${anchor}" class="cf-section ${sectionClass}${componentClass} layout-${section.layout} align-${section.contentAlign}" data-cf-id="${id}" data-cf-locked="${section.locked ? 'true' : 'false'}" aria-label="${escapeHtml(section.name)}">\n${overlayLayer}  <${tag} class="cf-container" ${label}>\n    ${flowChildren.map((node) => renderElement(node, { ...options, project })).join('\n    ')}\n  </${tag}>\n</section>`;
  }).join('\n\n');
  const resolvedNodes = allSourceNodes.map((source) => source.type === 'component' ? resolveComponentInstance(source, project) : source).filter(Boolean);
  const hasViewportMotion = resolvedNodes.some((node) => node.animation !== 'none' && node.animationTrigger === 'viewport');
  const hasInteractions = resolvedNodes.some((node) => node.type === 'button' && node.interaction?.action !== 'none' && node.interaction?.targetId);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${description}">
  <title>${title}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body id="cf-page-${escapeHtml(page.slug)}">
${navigation}
<main class="cf-page">
${sections}
</main>
${footer}
${hasViewportMotion ? `<script>
(function () {
  'use strict';
  var items = Array.prototype.slice.call(document.querySelectorAll('[data-cf-motion-trigger="viewport"][data-cf-animation]:not([data-cf-animation="none"])'));
  if (!items.length) return;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  if (!('IntersectionObserver' in window)) { items.forEach(function (item) { item.classList.add('cf-motion-active'); }); return; }
  items.forEach(function (item) { item.classList.add('cf-motion-pending'); });
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('cf-motion-pending');
      entry.target.classList.add('cf-motion-active');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15 });
  items.forEach(function (item) { observer.observe(item); });
}());
</script>` : ''}
${hasInteractions ? `<script>
(function () {
  'use strict';
  document.addEventListener('click', function (event) {
    var control = event.target && event.target.closest ? event.target.closest('[data-cf-action]') : null;
    if (!control) return;
    var action = control.getAttribute('data-cf-action');
    var targetId = control.getAttribute('data-cf-target');
    if (!targetId || !/^[A-Za-z0-9_-]{1,64}$/.test(targetId)) return;
    var target = document.getElementById(targetId);
    if (!target) return;
    event.preventDefault();
    if (action === 'scroll') target.scrollIntoView({ behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    else if (action === 'show' || action === 'hide' || action === 'toggle') {
      var isHidden = target.hidden || (window.getComputedStyle && window.getComputedStyle(target).display === 'none');
      var shouldShow = action === 'show' ? true : action === 'hide' ? false : isHidden;
      target.hidden = !shouldShow;
      target.classList.toggle('cf-interaction-force-visible', shouldShow);
      target.classList.toggle('cf-interaction-force-hidden', !shouldShow);
      target.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
    }
  });
}());
</script>` : ''}
</body>
</html>
`;
}

export function generatePreviewDocument(project, selectedId, breakpoint = 'desktop', options = {}) {
  const html = generateHtml(project, { preview: true }).replace('  <link rel="stylesheet" href="styles.css">', `  <style>\n${generateCss(project, { preview: true, selectedId, selectedIds: options.selectedIds })}  </style>`);
  const safeSelectedId = ID_RE.test(String(selectedId || '')) ? selectedId : '';
  const bridge = `<style>
  .cf-editor-resize-handle{position:fixed;z-index:2147483000;width:24px;height:24px;box-sizing:border-box;border:2px solid #fff;border-radius:7px;background:#8065f3;box-shadow:0 1px 8px #24124f90;transform:translate(-50%,-50%);cursor:nwse-resize;touch-action:none;user-select:none;-webkit-user-select:none}@media(pointer:fine){.cf-editor-resize-handle{width:14px;height:14px;border-radius:4px}}
  body{touch-action:none} .cf-editor-transform-handle{position:fixed;z-index:2147483001;width:12px;height:12px;box-sizing:border-box;border:2px solid #fff;border-radius:4px;background:#8065f3;box-shadow:0 1px 7px #24124f90;transform:translate(-50%,-50%);padding:0;touch-action:none;user-select:none;-webkit-user-select:none}
  .cf-editor-transform-handle[data-cf-transform-handle="n"],.cf-editor-transform-handle[data-cf-transform-handle="s"]{cursor:ns-resize}
  .cf-editor-transform-handle[data-cf-transform-handle="e"],.cf-editor-transform-handle[data-cf-transform-handle="w"]{cursor:ew-resize}
  .cf-editor-transform-handle[data-cf-transform-handle="ne"],.cf-editor-transform-handle[data-cf-transform-handle="sw"]{cursor:nesw-resize}
  .cf-editor-transform-handle[data-cf-transform-handle="nw"],.cf-editor-transform-handle[data-cf-transform-handle="se"]{cursor:nwse-resize}
  .cf-editor-transform-handle.rotate{width:16px;height:16px;border-radius:50%;background:#15a6a0;border-color:#fff;cursor:grab}
  .cf-editor-transform-frame{position:fixed;z-index:2147482999;border:1px solid #8065f3;pointer-events:none;box-shadow:0 0 0 1px #8065f333}
  .cf-editor-drop-before{outline:2px solid #8065f3!important;outline-offset:-2px!important;box-shadow:inset 0 4px 0 #8065f3!important}
  .cf-editor-drop-after{outline:2px solid #8065f3!important;outline-offset:-2px!important;box-shadow:inset 0 -4px 0 #8065f3!important}
  body.cf-editor-interacting,body.cf-editor-interacting *{user-select:none!important;cursor:grabbing!important}
  .cf-editor-guide-layer{position:absolute;left:0;top:0;z-index:2147482000;pointer-events:none;overflow:visible}
  .cf-editor-guide-line{position:absolute;pointer-events:none;background:#57c8dd;box-shadow:0 0 0 1px #57c8dd16}
  .cf-editor-guide-line.vertical{width:1px}
  .cf-editor-guide-line.horizontal{height:1px}
  .cf-editor-guide-line.selected-guide{background:#a58cff;box-shadow:0 0 0 1px #a58cff24}
  .cf-editor-guide-tag{position:absolute;padding:3px 5px;border:1px solid #3a7381;border-radius:4px;background:#10232a;color:#a8eef7;font:600 9px/1.2 ui-monospace,monospace;letter-spacing:.1px;white-space:nowrap}
  .cf-editor-guide-tag.selected-guide{border-color:#5a4b8d;background:#211a39;color:#d1c4ff}
  .cf-editor-snap-layer{position:fixed;inset:0;z-index:2147482500;pointer-events:none}
  .cf-editor-snap-line{position:absolute;background:#57c8dd;box-shadow:0 0 0 1px #57c8dd20}
  .cf-editor-snap-line.vertical{width:1px}
  .cf-editor-snap-line.horizontal{height:1px}
  .cf-editor-snap-label{position:absolute;padding:3px 5px;border:1px solid #3a7381;border-radius:4px;background:#10232a;color:#a8eef7;font:600 9px/1.2 ui-monospace,monospace}
  .cf-editor-user-guide{position:absolute;z-index:2147481800;pointer-events:none;background:#e2ae54;opacity:.9}
  .cf-editor-user-guide.x{top:0;bottom:0;width:1px}
  .cf-editor-user-guide.y{left:0;right:0;height:1px}
  .cf-editor-user-guide.is-hidden{display:none}
  </style>
  <script>
  (function () {
    'use strict';
    var selectedId = ${JSON.stringify(safeSelectedId)};
    var selectedIds = ${JSON.stringify(Array.isArray(options.selectedIds) && options.selectedIds.length ? options.selectedIds.filter((id) => ID_RE.test(String(id || ''))) : [safeSelectedId])};
    var resizeHandle = null;
    var transformHandles = [];
    var activeResize = null;
    var activeTransform = null;
    var activeDrag = null;
    var suppressClick = false;
    var touchPointers = Object.create(null);
    var touchCameraActive = false;
    var suppressTouchUntilAllUp = false;
    var guidesEnabled = ${options.showGuides === true ? 'true' : 'false'};
    var userGuides = ${JSON.stringify(Array.isArray(options.userGuides) ? options.userGuides.filter((guide) => guide && ['x','y'].includes(guide.axis) && Number.isFinite(Number(guide.position))).slice(0,100) : [])};
    var editorGridStep = ${Math.max(4, Math.min(128, Number(options.gridStep) || 16))};
    var editorZoom = ${Math.max(0.25, Math.min(2, Number(options.editorZoom) || 1))};
    var snapSettings = ${JSON.stringify(options.snapSettings && typeof options.snapSettings === 'object' ? options.snapSettings : {})};
    var vectorTool = ${JSON.stringify(options.vectorTool || 'select')};
    var vectorDrawing = null;
    var guideLayer = null;
    var snapLayer = null;
    function post(message) { window.parent.postMessage(message, '*'); }
    function byId(id) { return Array.prototype.find.call(document.querySelectorAll('[data-cf-id]'), function (item) { return item.getAttribute('data-cf-id') === id; }) || null; }
    function selectedElement() { return byId(selectedId); }
    function drawUserGuides() {
      document.querySelectorAll('.cf-editor-user-guide').forEach(function (item) { item.remove(); });
      var page = document.querySelector('.cf-page'); if (!page) return;
      userGuides.forEach(function (guide) { var line = document.createElement('div'); line.className = 'cf-editor-user-guide ' + guide.axis + (guide.visible === false ? ' is-hidden' : ''); line.style[guide.axis === 'x' ? 'left' : 'top'] = Number(guide.position) + 'px'; line.setAttribute('aria-hidden','true'); page.appendChild(line); });
    }
    var motionKeyframes = { fade: 'cf-fade-in', rise: 'cf-rise-in', 'slide-left': 'cf-slide-left', 'slide-right': 'cf-slide-right', zoom: 'cf-zoom-in', blur: 'cf-blur-in' };
    window.addEventListener('message', function (event) {
      var message = event.data;
      if (!message) return;
      if (message.type === 'canvasflow:set-vector-tool' && ['select', 'freehand', 'bezier', 'rect', 'ellipse'].includes(message.tool)) { vectorTool = message.tool; return; }
      if (message.type === 'canvasflow:set-editor-zoom' && Number.isFinite(Number(message.zoom))) { editorZoom = Math.max(0.25, Math.min(2, Number(message.zoom))); return; }
      if (message.type === 'canvasflow:measure-selection' && Array.isArray(message.ids) && message.ids.length > 0 && message.ids.length <= 20) {
        var measuredSelection = message.ids.filter(function(id){return typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id);}).map(byId).filter(function(item){return item && item.getClientRects().length && window.getComputedStyle(item).display !== 'none';});
        if (!measuredSelection.length) return;
        var selectionRects = measuredSelection.map(function(item){return item.getBoundingClientRect();});
        var selectionLeft = Math.min.apply(null, selectionRects.map(function(r){return r.left;}));
        var selectionTop = Math.min.apply(null, selectionRects.map(function(r){return r.top;}));
        var selectionRight = Math.max.apply(null, selectionRects.map(function(r){return r.right;}));
        var selectionBottom = Math.max.apply(null, selectionRects.map(function(r){return r.bottom;}));
        post({type:'canvasflow:selection-bounds',left:selectionLeft,top:selectionTop,right:selectionRight,bottom:selectionBottom}); return;
      }
      if (message.type === 'canvasflow:measure-free-position' && typeof message.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(message.id)) {
        var measured = byId(message.id); if (!measured) return;
        var parent = measured.parentElement && measured.parentElement.closest('.cf-layout-container, .cf-container');
        if (!parent) return;
        var er = measured.getBoundingClientRect(); var pr = parent.getBoundingClientRect(); var ps = window.getComputedStyle(parent);
        var borderLeft = parseFloat(ps.borderLeftWidth) || 0; var borderRight = parseFloat(ps.borderRightWidth) || 0;
        var borderTop = parseFloat(ps.borderTopWidth) || 0; var borderBottom = parseFloat(ps.borderBottomWidth) || 0;
        var originX = pr.left + borderLeft;
        var originY = pr.top + borderTop;
        var measuredStyle = window.getComputedStyle(measured);
        var measuredWidth = Number.parseFloat(measuredStyle.width); var measuredHeight = Number.parseFloat(measuredStyle.height);
        post({ type: 'canvasflow:measure-free-position', id: message.id, x: er.left - originX, y: er.top - originY, width: Number.isFinite(measuredWidth) && measuredWidth > 0 ? measuredWidth : er.width, height: Number.isFinite(measuredHeight) && measuredHeight > 0 ? measuredHeight : er.height }); return;
      }
      if (message.type === 'canvasflow:arrange-free' && Array.isArray(message.ids) && message.ids.length >= 2 && message.ids.length <= 20 && ['left','center-x','right','top','center-y','bottom','distribute-x','distribute-y','match-width','match-height','match-size'].indexOf(message.action) >= 0) {
        var moving = message.ids.map(byId); if (moving.some(function(item){return !item || item.getAttribute('data-cf-free') !== 'true' || isLocked(item);})) return;
        var arrangeParent = moving[0].parentElement; if (moving.some(function(item){return item.parentElement !== arrangeParent;})) return;
        var arrangeRects = moving.map(function(item){var cs=window.getComputedStyle(item);var left=Number.parseFloat(cs.left)||0;var top=Number.parseFloat(cs.top)||0;var width=Number.parseFloat(cs.width)||item.getBoundingClientRect().width;var height=Number.parseFloat(cs.height)||item.getBoundingClientRect().height;return {id:item.getAttribute('data-cf-id'),left:left,top:top,width:width,height:height,right:left+width,bottom:top+height};});
        var minLeft=Math.min.apply(null,arrangeRects.map(function(r){return r.left;}));var minTop=Math.min.apply(null,arrangeRects.map(function(r){return r.top;}));var maxRight=Math.max.apply(null,arrangeRects.map(function(r){return r.right;}));var maxBottom=Math.max.apply(null,arrangeRects.map(function(r){return r.bottom;}));
        var centerX=(minLeft+maxRight)/2;var centerY=(minTop+maxBottom)/2;var action=message.action;
        if (action==='distribute-x' || action==='distribute-y') {
          var horizontal=action==='distribute-x';var ordered=arrangeRects.slice().sort(function(a,b){return horizontal?a.left-b.left:a.top-b.top;});var total=ordered.reduce(function(sum,r){return sum+(horizontal?r.width:r.height);},0);var start=horizontal?ordered[0].left:ordered[0].top;var end=horizontal?ordered[ordered.length-1].right:ordered[ordered.length-1].bottom;var gap=(end-start-total)/(ordered.length-1);var cursor=start;
          ordered.forEach(function(r){if(horizontal)r.left=cursor;else r.top=cursor;r.right=r.left+r.width;r.bottom=r.top+r.height;cursor+=(horizontal?r.width:r.height)+gap;});
          arrangeRects=ordered;
        } else if (action==='match-width' || action==='match-height' || action==='match-size') {
          var reference=arrangeRects[0];
          arrangeRects.forEach(function(r){if(action==='match-width'||action==='match-size')r.width=reference.width;if(action==='match-height'||action==='match-size')r.height=reference.height;r.right=r.left+r.width;r.bottom=r.top+r.height;});
        } else arrangeRects.forEach(function(r){if(action==='left')r.left=minLeft;else if(action==='center-x')r.left=centerX-r.width/2;else if(action==='right')r.left=maxRight-r.width;else if(action==='top')r.top=minTop;else if(action==='center-y')r.top=centerY-r.height/2;else if(action==='bottom')r.top=maxBottom-r.height;r.right=r.left+r.width;r.bottom=r.top+r.height;});
        post({type:'canvasflow:free-arrange',id:arrangeRects[0].id,items:arrangeRects.map(function(r){return {id:r.id,x:r.left,y:r.top,width:r.width,height:r.height,xUnit:'px',yUnit:'px'};})}); return;
      }
      if (message.type !== 'canvasflow:replay-motion' || typeof message.id !== 'string') return;
      var element = byId(message.id);
      if (!element) return;
      var keyframe = motionKeyframes[element.getAttribute('data-cf-animation')];
      if (!keyframe || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
      if (element.getAttribute('data-cf-motion-trigger') === 'viewport') { element.classList.remove('cf-motion-pending'); element.classList.add('cf-motion-active'); }
      element.style.animationName = 'none';
      void element.offsetWidth;
      element.style.animationName = keyframe;
      var clearOverride = function () { element.style.removeProperty('animation-name'); };
      element.addEventListener('animationend', clearOverride, { once: true });
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', drawUserGuides, { once: true }); else drawUserGuides();
    function isLocked(element) { for (var current = element; current && current !== document.body; current = current.parentElement) { if (current.getAttribute && current.getAttribute('data-cf-locked') === 'true') return true; } return false; }
    function removeDropCues() { document.querySelectorAll('.cf-editor-drop-before,.cf-editor-drop-after').forEach(function (item) { item.classList.remove('cf-editor-drop-before','cf-editor-drop-after'); }); }
    function clearSnapGuides() { if (snapLayer) snapLayer.remove(); snapLayer = null; }
    function drawSnapGuides(rect, snapX, snapY) {
      clearSnapGuides();
      if (!snapX && !snapY) return;
      snapLayer = document.createElement('div'); snapLayer.className = 'cf-editor-snap-layer'; snapLayer.setAttribute('aria-hidden', 'true');
      if (snapX) { var vx = document.createElement('div'); vx.className = 'cf-editor-snap-line vertical'; vx.style.left = Math.round(rect.left + snapX.line) + 'px'; vx.style.top = Math.round(rect.top) + 'px'; vx.style.height = Math.round(rect.height) + 'px'; snapLayer.appendChild(vx); var xt = document.createElement('span'); xt.className = 'cf-editor-snap-label'; xt.textContent = snapX.label; xt.style.left = Math.round(Math.max(4, rect.left + snapX.line + 4)) + 'px'; xt.style.top = Math.round(Math.max(4, rect.top + 4)) + 'px'; snapLayer.appendChild(xt); }
      if (snapY) { var hy = document.createElement('div'); hy.className = 'cf-editor-snap-line horizontal'; hy.style.left = Math.round(rect.left) + 'px'; hy.style.top = Math.round(rect.top + snapY.line) + 'px'; hy.style.width = Math.round(rect.width) + 'px'; snapLayer.appendChild(hy); var yt = document.createElement('span'); yt.className = 'cf-editor-snap-label'; yt.textContent = snapY.label; yt.style.left = Math.round(Math.max(4, rect.left + 4)) + 'px'; yt.style.top = Math.round(Math.max(4, rect.top + snapY.line + 4)) + 'px'; snapLayer.appendChild(yt); }
      document.body.appendChild(snapLayer);
    }
    function clampValue(value, min, max) { return Math.max(min, Math.min(max, value)); }
    function snapOverlayAxis(value, limit, halfSize, event, axis) {
      // X/Y are stored as the shape centre in section percentages. Keep the centre in
      // 0..100%; clamping it by half the shape size would make an edge-positioned shape jump.
      var min = 0; var max = limit;
      if (event && event.altKey) return { value: clampValue(value, min, max), guide: null };
      var candidates = axis === 'x'
        ? [{ value: halfSize, line: 0, label: 'SECTION LEFT' }, { value: limit / 2, line: limit / 2, label: 'SECTION CENTER' }, { value: limit - halfSize, line: limit, label: 'SECTION RIGHT' }]
        : [{ value: halfSize, line: 0, label: 'SECTION TOP' }, { value: limit / 2, line: limit / 2, label: 'SECTION CENTER' }, { value: limit - halfSize, line: limit, label: 'SECTION BOTTOM' }];
      // Align decorative shapes to the centres and edges of neighbouring overlays too.
      // Group members are excluded so a grouped move does not snap against itself.
      if (activeDrag && activeDrag.overlayLayer) {
        var movingIds = activeDrag.starts.map(function (item) { return item.id; });
        Array.prototype.forEach.call(activeDrag.overlayLayer.querySelectorAll('[data-cf-position="overlay"]'), function (other) {
          var otherId = other.getAttribute('data-cf-id');
          if (movingIds.indexOf(otherId) >= 0 || window.getComputedStyle(other).display === 'none') return;
          var computed = window.getComputedStyle(other);
          var center = Number.parseFloat(axis === 'x' ? computed.left : computed.top);
          var dimension = axis === 'x' ? other.getBoundingClientRect().width : other.getBoundingClientRect().height;
          if (!Number.isFinite(center)) center = (Number(other.getAttribute(axis === 'x' ? 'data-cf-x' : 'data-cf-y')) || 50) / 100 * limit;
          var halfOther = dimension / 2;
          candidates.push({ value: center, line: center, label: 'ALIGN CENTER' });
          candidates.push({ value: center - halfOther + halfSize, line: center - halfOther, label: axis === 'x' ? 'ALIGN LEFT' : 'ALIGN TOP' });
          candidates.push({ value: center + halfOther - halfSize, line: center + halfOther, label: axis === 'x' ? 'ALIGN RIGHT' : 'ALIGN BOTTOM' });
        });
      }
      var nearest = null; var distance = 9;
      candidates.forEach(function (candidate) { var delta = Math.abs(value - candidate.value); if (delta < distance) { distance = delta; nearest = candidate; } });
      if (nearest && distance <= 8) return { value: clampValue(nearest.value, min, max), guide: { line: nearest.line, label: nearest.label } };
      return { value: clampValue(Math.round(value / 8) * 8, min, max), guide: null };
    }
    function restoreOverlayStyles(state) {
      if (!state || !state.starts) return;
      state.starts.forEach(function (item) { if (item.originalStyle === null) item.element.removeAttribute('style'); else item.element.setAttribute('style', item.originalStyle); });
    }
    function addGuideLine(layer, direction, left, top, length, label, selected) {
      var line = document.createElement('div'); line.className = 'cf-editor-guide-line ' + direction + (selected ? ' selected-guide' : '');
      line.style.left = Math.round(left) + 'px'; line.style.top = Math.round(top) + 'px';
      if (direction === 'vertical') line.style.height = Math.max(1, Math.round(length)) + 'px'; else line.style.width = Math.max(1, Math.round(length)) + 'px';
      layer.appendChild(line);
      if (label) { var tag = document.createElement('span'); tag.className = 'cf-editor-guide-tag' + (selected ? ' selected-guide' : ''); tag.textContent = label; var minX = window.scrollX + 4; var maxX = window.scrollX + Math.max(4, document.documentElement.clientWidth - 122); tag.style.left = Math.round(Math.max(minX, Math.min(maxX, left))) + 'px'; tag.style.top = Math.max(4, Math.round(top - 17)) + 'px'; layer.appendChild(tag); }
    }
    function updateGuides() {
      if (!guidesEnabled) { if (guideLayer) guideLayer.remove(); guideLayer = null; return; }
      if (!guideLayer) { guideLayer = document.createElement('div'); guideLayer.className = 'cf-editor-guide-layer'; guideLayer.setAttribute('aria-hidden', 'true'); document.body.appendChild(guideLayer); }
      guideLayer.replaceChildren();
      // Size the editor-only overlay from page content, not document scrollWidth: the
      // overlay itself contributes to scrollWidth and can otherwise preserve an old
      // desktop width after the iframe is narrowed to a mobile viewport.
      var pageContent = document.querySelector('.cf-page');
      guideLayer.style.width = Math.max(pageContent ? pageContent.scrollWidth : 0, document.documentElement.clientWidth, window.innerWidth) + 'px';
      guideLayer.style.height = Math.max(pageContent ? pageContent.scrollHeight : 0, document.documentElement.clientHeight, window.innerHeight) + 'px';
      var selected = selectedElement(); if (!selected) return;
      var section = selected.tagName === 'SECTION' ? selected : selected.closest('section[data-cf-id]');
      var container = section && section.querySelector('.cf-container'); if (!container) return;
      var cr = container.getBoundingClientRect(); var sr = selected.tagName === 'SECTION' ? cr : selected.getBoundingClientRect();
      var sx = window.scrollX; var sy = window.scrollY; var left = cr.left + sx; var top = cr.top + sy; var width = cr.width; var height = cr.height;
      addGuideLine(guideLayer, 'vertical', left, top, height, 'CONTENT LEFT', false);
      addGuideLine(guideLayer, 'vertical', left + width / 2, top, height, 'CENTER', false);
      addGuideLine(guideLayer, 'vertical', left + width, top, height, 'CONTENT RIGHT', false);
      var selectedTop = sr.top + sy;
      addGuideLine(guideLayer, 'vertical', sr.left + sx, top, height, 'X ' + Math.round(sr.left - cr.left) + ' px', true);
      addGuideLine(guideLayer, 'horizontal', left, selectedTop, width, Math.round(sr.width) + ' × ' + Math.round(sr.height) + ' px', true);
      var siblings = Array.prototype.filter.call(container.children, function (node) { return node.hasAttribute('data-cf-id') && node !== selected; });
      var nearestAbove = null; var nearestBelow = null;
      siblings.forEach(function (node) { var r = node.getBoundingClientRect(); if (r.bottom <= sr.top && (!nearestAbove || r.bottom > nearestAbove.bottom)) nearestAbove = r; if (r.top >= sr.bottom && (!nearestBelow || r.top < nearestBelow.top)) nearestBelow = r; });
      if (nearestAbove) { var gapAbove = Math.round(sr.top - nearestAbove.bottom); if (gapAbove > 0 && gapAbove <= 220) addGuideLine(guideLayer, 'vertical', Math.min(cr.right - 8, sr.right + 8) + sx, nearestAbove.bottom + sy, gapAbove, gapAbove + ' px gap', false); }
      if (nearestBelow) { var gapBelow = Math.round(nearestBelow.top - sr.bottom); if (gapBelow > 0 && gapBelow <= 220) addGuideLine(guideLayer, 'vertical', Math.min(cr.right - 8, sr.right + 8) + sx, sr.bottom + sy, gapBelow, gapBelow + ' px gap', false); }
    }
    function handlePoint(element) {
      if (!element) return;
      var rect = element.getBoundingClientRect();
      if (element.getAttribute('data-cf-free') === 'true') {
        var positions = { nw:[rect.left,rect.top], n:[rect.left+rect.width/2,rect.top], ne:[rect.right,rect.top], e:[rect.right,rect.top+rect.height/2], se:[rect.right,rect.bottom], s:[rect.left+rect.width/2,rect.bottom], sw:[rect.left,rect.bottom], w:[rect.left,rect.top+rect.height/2], rotate:[rect.left+rect.width/2,rect.top-26] };
        transformHandles.forEach(function (handle) { var point = positions[handle.getAttribute('data-cf-transform-handle')]; if (!point) return; handle.style.left = Math.max(4, Math.min(window.innerWidth-4, point[0])) + 'px'; handle.style.top = Math.max(4, Math.min(window.innerHeight-4, point[1])) + 'px'; });
        return;
      }
      if (!resizeHandle) return;
      resizeHandle.style.left = Math.max(8, Math.min(window.innerWidth - 8, rect.right - 2)) + 'px';
      resizeHandle.style.top = Math.max(8, Math.min(window.innerHeight - 8, rect.bottom - 2)) + 'px';
    }
    function clearHandle() {
      if (resizeHandle) resizeHandle.remove(); resizeHandle = null;
      transformHandles.forEach(function (handle) { handle.remove(); }); transformHandles = [];
    }
    function widthLimits(element) {
      if (element.classList.contains('cf-shape') || element.classList.contains('cf-vector')) return { min: 24, max: 4000 };
      if (element.classList.contains('cf-divider')) return { min: 20, max: 4000 };
      if (element.classList.contains('cf-button')) return { min: 40, max: 4000 };
      return { min: 40, max: 4000 };
    }
    function heightLimits(element) {
      if (element.classList.contains('cf-shape') || element.classList.contains('cf-vector')) return { min: 24, max: 4000 };
      return { min: 1, max: 4000 };
    }
    function updateHandle() {
      clearHandle();
      var element = selectedElement();
      if (!element || element.hasAttribute('data-cf-component-id') || isLocked(element) || !element.getClientRects().length || window.getComputedStyle(element).display === 'none' || element.tagName === 'SECTION' || element.classList.contains('cf-image-placeholder')) return;
      if (element.getAttribute('data-cf-free') === 'true') {
        ['nw','n','ne','e','se','s','sw','w','rotate'].forEach(function (direction) {
          var handle = document.createElement('button'); handle.type = 'button';
          handle.className = 'cf-editor-transform-handle' + (direction === 'rotate' ? ' rotate' : '');
          handle.setAttribute('data-cf-transform-handle', direction); handle.setAttribute('aria-label', direction === 'rotate' ? 'Rotate selected element' : 'Resize selected element from ' + direction);
          handle.title = direction === 'rotate' ? 'Drag to rotate' : 'Drag to resize'; document.body.appendChild(handle); transformHandles.push(handle);
        });
        handlePoint(element); updateGuides(); return;
      }
      resizeHandle = document.createElement('button'); resizeHandle.type = 'button';
      resizeHandle.className = 'cf-editor-resize-handle'; resizeHandle.setAttribute('aria-label', 'Resize selected element'); resizeHandle.title = 'Drag to resize';
      document.body.appendChild(resizeHandle); handlePoint(element);
      resizeHandle.addEventListener('keydown', function (event) {
        var directions = { ArrowRight: [8, 0], ArrowLeft: [-8, 0], ArrowDown: [0, 8], ArrowUp: [0, -8] };
        var delta = directions[event.key]; if (!delta) return;
        event.preventDefault(); var rect = element.getBoundingClientRect();
        var values = resizeValues(element, rect.width + delta[0], rect.height + delta[1]);
        if (values) post({ type: 'canvasflow:resize', id: selectedId, values: values });
      });
      updateGuides();
    }
    function snapDimension(value, element, axis, event) {
      if (event && event.altKey) return Math.round(value);
      var snapped = Math.round(value / 8) * 8;
      var section = element.closest('section[data-cf-id]');
      var container = section && section.querySelector('.cf-container');
      var candidate = null; var distance = 9;
      if (container) {
        Array.prototype.forEach.call(container.children, function (sibling) {
          if (!sibling.hasAttribute('data-cf-id') || sibling === element) return;
          var rect = sibling.getBoundingClientRect(); var dimension = axis === 'width' ? rect.width : rect.height;
          var delta = Math.abs(value - dimension);
          if (delta < distance) { distance = delta; candidate = dimension; }
        });
      }
      if (candidate !== null && Math.abs(value - candidate) <= 8) snapped = candidate;
      return Math.round(snapped);
    }
    function updateHandle() {
      clearHandle();
      var element = selectedElement();
      if (!element || element.hasAttribute('data-cf-component-id') || isLocked(element) || !element.getClientRects().length || window.getComputedStyle(element).display === 'none' || element.tagName === 'SECTION' || element.classList.contains('cf-image-placeholder')) return;
      resizeHandle = document.createElement('button');
      resizeHandle.type = 'button';
      resizeHandle.className = 'cf-editor-resize-handle';
      resizeHandle.setAttribute('aria-label', 'Resize selected element');
      resizeHandle.title = 'Drag to resize';
      document.body.appendChild(resizeHandle);
      handlePoint(element);
      resizeHandle.addEventListener('keydown', function (event) {
        var directions = { ArrowRight: [8, 0], ArrowLeft: [-8, 0], ArrowDown: [0, 8], ArrowUp: [0, -8] };
        var delta = directions[event.key]; if (!delta) return;
        event.preventDefault(); var rect = element.getBoundingClientRect();
        var values = resizeValues(element, rect.width + delta[0], rect.height + delta[1]);
        if (values) post({ type: 'canvasflow:resize', id: selectedId, values: values });
      });
      updateGuides();
    }
    function visualResize(element, width, height) {
      var widthLimit = widthLimits(element); var heightLimit = heightLimits(element);
      var w = Math.max(widthLimit.min, Math.min(widthLimit.max, width));
      var h = Math.max(heightLimit.min, Math.min(heightLimit.max, height));
      if (element.classList.contains('cf-heading') || element.classList.contains('cf-paragraph') || element.classList.contains('cf-card')) {
        element.style.maxWidth = w + 'px';
      } else if (element.classList.contains('cf-button')) {
        element.style.width = w + 'px'; element.style.maxWidth = '100%';
      } else if (element.classList.contains('cf-image')) {
        element.style.width = w + 'px'; element.style.maxWidth = '100%'; element.style.height = h + 'px';
      } else if (element.classList.contains('cf-divider')) {
        var parentWidth = element.parentElement ? element.parentElement.clientWidth : 100;
        element.style.width = Math.max(20, Math.min(100, (w / Math.max(1, parentWidth)) * 100)) + '%';
      } else if (element.classList.contains('cf-shape') || element.classList.contains('cf-vector')) {
        element.style.width = Math.min(600, w) + 'px'; element.style.maxWidth = '100%'; element.style.height = Math.min(600, h) + 'px';
      }
      handlePoint(element);
      updateGuides();
    }
    function resizeValues(element, width, height) {
      var widthLimit = widthLimits(element); var heightLimit = heightLimits(element);
      var w = Math.round(Math.max(widthLimit.min, Math.min(widthLimit.max, width)));
      var h = Math.round(Math.max(heightLimit.min, Math.min(heightLimit.max, height)));
      if (element.classList.contains('cf-heading') || element.classList.contains('cf-paragraph') || element.classList.contains('cf-card')) return { maxWidth: w };
      if (element.classList.contains('cf-button')) return { width: w };
      if (element.classList.contains('cf-image')) return { maxWidth: w, height: h };
      if (element.classList.contains('cf-divider')) {
        var parentWidth = element.parentElement ? element.parentElement.clientWidth : 100;
        return { width: Math.round(Math.max(20, Math.min(100, (w / Math.max(1, parentWidth)) * 100))) };
      }
      if (element.classList.contains('cf-shape') || element.classList.contains('cf-vector')) return { width: w, height: h };
      return null;
    }
    function snapFreePosition(x,y,element,parentRect,event,movingIds) {
      if (event && event.altKey) return {x:x,y:y,guideX:null,guideY:null};
      var tolerance=8/Math.max(0.25,Math.min(2,editorZoom)); var rect=element.getBoundingClientRect(); var elementStyle=window.getComputedStyle(element); var width=Number.parseFloat(elementStyle.width)||rect.width; var height=Number.parseFloat(elementStyle.height)||rect.height;
      var xCandidates=[]; var yCandidates=[]; var siblingRects=[]; var moving=movingIds||[element.getAttribute('data-cf-id')];
      if (snapSettings.grid !== false) { xCandidates.push({value:Math.round(x/editorGridStep)*editorGridStep,label:'GRID'}); yCandidates.push({value:Math.round(y/editorGridStep)*editorGridStep,label:'GRID'}); }
      if (snapSettings.parent !== false) {
        xCandidates.push({value:0,label:'PARENT LEFT'},{value:parentRect.width-width,label:'PARENT RIGHT'},{value:(parentRect.width-width)/2,label:'PARENT CENTRE'});
        yCandidates.push({value:0,label:'PARENT TOP'},{value:parentRect.height-height,label:'PARENT BOTTOM'},{value:(parentRect.height-height)/2,label:'PARENT CENTRE'});
      }
      if (element.parentElement) {
        Array.prototype.forEach.call(element.parentElement.children,function(other){ if(moving.indexOf(other.getAttribute('data-cf-id'))>=0 || !other.hasAttribute('data-cf-id') || window.getComputedStyle(other).display==='none')return; var r=other.getBoundingClientRect(); var left=r.left-parentRect.left, top=r.top-parentRect.top; var otherWidth=r.width, otherHeight=r.height; siblingRects.push({left:left,top:top,width:otherWidth,height:otherHeight}); if(snapSettings.siblings !== false){xCandidates.push({value:left,label:'SIBLING LEFT'},{value:left+otherWidth,label:'SIBLING RIGHT'},{value:left+(otherWidth-width)/2,label:'SIBLING CENTRE'}); yCandidates.push({value:top,label:'SIBLING TOP'},{value:top+otherHeight,label:'SIBLING BOTTOM'},{value:top+(otherHeight-height)/2,label:'SIBLING CENTRE'});} });
      }
      if (snapSettings.equalSpacing === true) {
        var horizontalSiblings=siblingRects.slice().sort(function(a,b){return a.left-b.left;});var verticalSiblings=siblingRects.slice().sort(function(a,b){return a.top-b.top;});
        for(var i=0;i<horizontalSiblings.length-1;i++){var a=horizontalSiblings[i],b=horizontalSiblings[i+1],gap=b.left-(a.left+a.width);if(gap>=0){xCandidates.push({value:a.left+a.width+gap,label:'EQUAL HORIZONTAL GAP'},{value:b.left-width-gap,label:'EQUAL HORIZONTAL GAP'});}}
        for(var j=0;j<verticalSiblings.length-1;j++){var c=verticalSiblings[j],d=verticalSiblings[j+1],vgap=d.top-(c.top+c.height);if(vgap>=0){yCandidates.push({value:c.top+c.height+vgap,label:'EQUAL VERTICAL GAP'},{value:d.top-height-vgap,label:'EQUAL VERTICAL GAP'});}}
      }
      if (snapSettings.guides !== false) { var page=document.querySelector('.cf-page');var pageRect=page?page.getBoundingClientRect():{left:0,top:0};userGuides.forEach(function(guide){ if(guide.visible===false)return; if(guide.axis==='x')xCandidates.push({value:pageRect.left+guide.position-parentRect.left,label:'GUIDE'}); else yCandidates.push({value:pageRect.top+guide.position-parentRect.top,label:'GUIDE'}); }); }
      var snapX=snapSettings.horizontal===false?{value:x,snapped:false}:nearestSnap(x,xCandidates,tolerance);
      var snapY=snapSettings.vertical===false?{value:y,snapped:false}:nearestSnap(y,yCandidates,tolerance);
      var guideX=snapX.snapped?{line:snapX.value,label:snapX.label||'SNAP'}:null; var guideY=snapY.snapped?{line:snapY.value,label:snapY.label||'SNAP'}:null;
      return {x:snapX.value,y:snapY.value,guideX:guideX,guideY:guideY};
    }
    function nearestSnap(value,candidates,tolerance){ var best=null; candidates.forEach(function(candidate){var distance=Math.abs(value-candidate.value);if(distance<=tolerance&&(!best||distance<best.distance))best={value:candidate.value,distance:distance,label:candidate.label,snapped:true};}); return best||{value:value,snapped:false}; }
    function vectorPointFromEvent(event, state) {
      return { x: clampValue(event.clientX - state.rect.left, 0, state.rect.width), y: clampValue(event.clientY - state.rect.top, 0, state.rect.height) };
    }
    function drawVectorDraft(state) {
      if (!state || !state.svg) return;
      var d = '';
      if (state.tool === 'rect' && state.points.length > 1) {
        var a = state.points[0], b = state.points[state.points.length - 1]; var x = Math.min(a.x, b.x), y = Math.min(a.y, b.y); var w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
        d = 'M ' + x + ' ' + y + ' H ' + (x + w) + ' V ' + (y + h) + ' H ' + x + ' Z';
      } else if (state.tool === 'ellipse' && state.points.length > 1) {
        var ea = state.points[0], eb = state.points[state.points.length - 1]; var ex = Math.min(ea.x, eb.x), ey = Math.min(ea.y, eb.y); var ew = Math.abs(eb.x - ea.x), eh = Math.abs(eb.y - ea.y);
        var rx = ew / 2, ry = eh / 2, cx = ex + rx, cy = ey + ry;
        d = 'M ' + (cx - rx) + ' ' + cy + ' a ' + rx + ' ' + ry + ' 0 1 0 ' + (2 * rx) + ' 0 a ' + rx + ' ' + ry + ' 0 1 0 ' + (-2 * rx) + ' 0';
      } else if (state.points.length) {
        d = 'M ' + state.points.map(function (point) { return point.x + ' ' + point.y; }).join(' L ');
      }
      var path = state.svg.querySelector('path'); if (path) path.setAttribute('d', d);
    }
    function vectorDraftStart(section, event, tool) {
      var layer = section && section.querySelector('.cf-overlay-layer');
      if (!layer || isLocked(section)) return null;
      var rect = layer.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return null;
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 ' + rect.width + ' ' + rect.height); svg.setAttribute('class', 'cf-editor-vector-draft');
      svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:2147480000;';
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('fill', ['rect','ellipse'].includes(tool) ? '#8065f340' : 'none'); path.setAttribute('stroke', '#8065f3'); path.setAttribute('stroke-width', '2'); path.setAttribute('stroke-dasharray', '6 4'); path.setAttribute('vector-effect', 'non-scaling-stroke'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round'); svg.appendChild(path); layer.appendChild(svg);
      var state = { tool: tool, sectionId: section.getAttribute('data-cf-id'), layer: layer, rect: rect, svg: svg, points: [], pointerId: event.pointerId };
      state.points.push(vectorPointFromEvent(event, state)); drawVectorDraft(state); return state;
    }
    function finishVectorDraft(state) {
      if (!state) return;
      if (state.svg) state.svg.remove();
      if (state.points.length < (['rect','ellipse'].includes(state.tool) ? 2 : 2)) return;
      var xs = state.points.map(function (point) { return point.x; }), ys = state.points.map(function (point) { return point.y; });
      var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs), minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
      var centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
      if (maxX - minX < 24) { minX = centerX - 12; maxX = centerX + 12; }
      if (maxY - minY < 24) { minY = centerY - 12; maxY = centerY + 12; }
      var width = Math.max(24, Math.min(600, maxX - minX)), height = Math.max(24, Math.min(600, maxY - minY));
      var scaleX = 1000 / Math.max(1, maxX - minX), scaleY = 600 / Math.max(1, maxY - minY);
      var sourcePoints = state.points;
      if (sourcePoints.length > 80) sourcePoints = Array.from({ length: 80 }, function (_, index) { return state.points[Math.round(index * (state.points.length - 1) / 79)]; });
      var points = sourcePoints.map(function (point) { return { x: Math.round(clampValue((point.x - minX) * scaleX, 0, 1000)), y: Math.round(clampValue((point.y - minY) * scaleY, 0, 600)) }; });
      if (state.tool === 'rect' || state.tool === 'ellipse') points = [];
      post({ type: 'canvasflow:create-vector', sectionId: state.sectionId, vectorKind: ({ freehand: 'freehand', bezier: 'bezier', rect: 'rect', ellipse: 'ellipse' })[state.tool], points: points, width: width, height: height, xPercent: Math.max(0, Math.min(100, centerX / state.rect.width * 100)), yPercent: Math.max(0, Math.min(100, centerY / state.rect.height * 100)), closed: ['rect','ellipse'].includes(state.tool) });
    }
    function activeTouchPoints() { return Object.keys(touchPointers).map(function(id){return touchPointers[id];}); }
    function cancelEditsForTouchCamera() {
      if (vectorDrawing) { vectorDrawing.svg?.remove(); vectorDrawing = null; }
      if (activeTransform) { var t=activeTransform; activeTransform=null; if(t.originalStyle===null)t.element.removeAttribute('style');else t.element.setAttribute('style',t.originalStyle); }
      if (activeResize) { var r=activeResize; activeResize=null; if(r.originalStyle===null)r.element.removeAttribute('style');else r.element.setAttribute('style',r.originalStyle); }
      if (activeDrag && (activeDrag.kind === 'overlay' || activeDrag.kind === 'free-position')) restoreOverlayStyles(activeDrag);
      activeDrag=null; document.body.classList.remove('cf-editor-interacting'); removeDropCues(); clearSnapGuides(); handlePoint(selectedElement()); updateGuides();
    }
    function handleEditorTouchDown(event) {
      if (event.pointerType !== 'touch') return;
      touchPointers[event.pointerId] = {x:event.clientX,y:event.clientY};
      if (suppressTouchUntilAllUp) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      var points=activeTouchPoints();
      if (points.length >= 2) {
        if (!touchCameraActive) { cancelEditsForTouchCamera(); touchCameraActive=true; suppressTouchUntilAllUp=true; post({type:'canvasflow:touch-camera',phase:'start',points:points.slice(0,2)}); }
        event.preventDefault(); event.stopImmediatePropagation();
      }
    }
    function handleEditorTouchMove(event) {
      if (event.pointerType !== 'touch' || !Object.prototype.hasOwnProperty.call(touchPointers,event.pointerId)) return;
      touchPointers[event.pointerId] = {x:event.clientX,y:event.clientY};
      if (touchCameraActive) { post({type:'canvasflow:touch-camera',phase:'move',points:activeTouchPoints().slice(0,2)}); event.preventDefault(); event.stopImmediatePropagation(); }
      else if (suppressTouchUntilAllUp) { event.preventDefault(); event.stopImmediatePropagation(); }
    }
    function handleEditorTouchEnd(event) {
      if (event.pointerType !== 'touch' || !Object.prototype.hasOwnProperty.call(touchPointers,event.pointerId)) return;
      delete touchPointers[event.pointerId];
      if (touchCameraActive) { touchCameraActive=false; post({type:'canvasflow:touch-camera',phase:'end'}); suppressClick=true; event.preventDefault(); event.stopImmediatePropagation(); }
      if (!Object.keys(touchPointers).length) suppressTouchUntilAllUp=false;
    }
    document.addEventListener('pointerdown', handleEditorTouchDown, true);
    document.addEventListener('pointermove', handleEditorTouchMove, true);
    document.addEventListener('pointerup', handleEditorTouchEnd, true);
    document.addEventListener('pointercancel', handleEditorTouchEnd, true);

    document.addEventListener('pointerdown', function (event) {
      if (event.button !== 0 || vectorTool === 'select') return;
      var section = event.target && event.target.closest ? event.target.closest('section[data-cf-id]') : null;
      if (!section || isLocked(section)) return;
      if (vectorTool === 'bezier') {
        if (!vectorDrawing || vectorDrawing.sectionId !== section.getAttribute('data-cf-id')) vectorDrawing = vectorDraftStart(section, event, vectorTool);
        else vectorDrawing.points.push(vectorPointFromEvent(event, vectorDrawing));
        if (vectorDrawing) { drawVectorDraft(vectorDrawing); if (event.detail >= 2) { var state = vectorDrawing; vectorDrawing = null; finishVectorDraft(state); } }
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      vectorDrawing = vectorDraftStart(section, event, vectorTool);
      if (vectorDrawing) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    document.addEventListener('pointermove', function (event) {
      if (!vectorDrawing || vectorDrawing.tool === 'bezier' || event.pointerId !== vectorDrawing.pointerId) return;
      var point = vectorPointFromEvent(event, vectorDrawing); var last = vectorDrawing.points[vectorDrawing.points.length - 1];
      if (!last || Math.hypot(point.x - last.x, point.y - last.y) >= 2) vectorDrawing.points.push(point);
      drawVectorDraft(vectorDrawing); event.preventDefault();
    }, true);
    document.addEventListener('pointerup', function (event) {
      if (!vectorDrawing || vectorDrawing.tool === 'bezier' || event.pointerId !== vectorDrawing.pointerId) return;
      var state = vectorDrawing; vectorDrawing = null;
      var point = vectorPointFromEvent(event, state); var last = state.points[state.points.length - 1];
      if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 1) state.points.push(point);
      finishVectorDraft(state); event.preventDefault(); event.stopImmediatePropagation();
    }, true);
    document.addEventListener('dblclick', function (event) {
      if (!vectorDrawing || vectorDrawing.tool !== 'bezier') return;
      var state = vectorDrawing; vectorDrawing = null; finishVectorDraft(state); event.preventDefault(); event.stopImmediatePropagation();
    }, true);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && vectorDrawing) { vectorDrawing.svg?.remove(); vectorDrawing = null; event.preventDefault(); return; }
      if ((event.key === 'Enter' || event.key === 'Escape') && vectorDrawing?.tool === 'bezier') { var state = vectorDrawing; vectorDrawing = null; finishVectorDraft(state); event.preventDefault(); }
    }, true);
    document.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      var transformHandle = event.target && event.target.closest ? event.target.closest('[data-cf-transform-handle]') : null;
      if (transformHandle) {
        var transformElement = selectedElement(); if (!transformElement || isLocked(transformElement)) return;
        var direction = transformHandle.getAttribute('data-cf-transform-handle'); var tr = transformElement.getBoundingClientRect();
        var parent = transformElement.parentElement && transformElement.parentElement.closest('.cf-layout-container, .cf-container'); if (!parent) return;
        var pr = parent.getBoundingClientRect(); var ps = window.getComputedStyle(parent); var elementStyle = window.getComputedStyle(transformElement);
        var originX = pr.left + (parseFloat(ps.borderLeftWidth)||0);
        var originY = pr.top + (parseFloat(ps.borderTopWidth)||0);
        var left = Number.parseFloat(elementStyle.left); var top = Number.parseFloat(elementStyle.top);
        if (!Number.isFinite(left)) left = tr.left - originX;
        if (!Number.isFinite(top)) top = tr.top - originY;
        // getBoundingClientRect() is the rotated outer box. Use the untransformed CSS
        // dimensions for geometry so a second resize does not compound the AABB size.
        var width = Number.parseFloat(elementStyle.width); var height = Number.parseFloat(elementStyle.height);
        if (!Number.isFinite(width) || width <= 0) width = tr.width;
        if (!Number.isFinite(height) || height <= 0) height = tr.height;
        var transformOrigin = (elementStyle.transformOrigin || '50% 50%').split(/\s+/);
        var originLocalX = Number.parseFloat(transformOrigin[0]); var originLocalY = Number.parseFloat(transformOrigin[1]);
        if (!Number.isFinite(originLocalX)) originLocalX = width/2;
        if (!Number.isFinite(originLocalY)) originLocalY = height/2;
        var centerX = originX + left + originLocalX, centerY = originY + top + originLocalY;
        var rotation = Number(transformElement.getAttribute('data-cf-free-rotation')) || 0;
        activeTransform = { id:selectedId, pointerId:event.pointerId, kind:direction === 'rotate' ? 'rotate' : 'resize', direction:direction, element:transformElement, startX:event.clientX, startY:event.clientY, rect:{left:left,top:top,width:width,height:height}, screenRect:tr, ratio:width/Math.max(1,height), rotation:rotation, originalStyle:transformElement.getAttribute('style'), centerX:centerX, centerY:centerY, startAngle:Math.atan2(event.clientY-centerY,event.clientX-centerX)*180/Math.PI, moved:false };
        document.body.classList.add('cf-editor-interacting'); event.preventDefault(); event.stopPropagation();
        try { transformHandle.setPointerCapture(event.pointerId); } catch (_) {} return;
      }
      if (event.target === resizeHandle) {
        var element = selectedElement(); if (!element || isLocked(element) || !element.getClientRects().length) return;
        event.preventDefault(); event.stopPropagation();
        var rect = element.getBoundingClientRect();
        activeResize = { id: selectedId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, width: rect.width, height: rect.height, ratio: rect.width / Math.max(1, rect.height), originalStyle: element.getAttribute('style'), element: element, moved: false };
        document.body.classList.add('cf-editor-interacting');
        try { resizeHandle.setPointerCapture(event.pointerId); } catch (_) {}
        return;
      }
      var element = event.target && event.target.closest ? event.target.closest('[data-cf-id]') : null;
      if (!element || element.hasAttribute('data-cf-component-id') || isLocked(element) || element.getAttribute('data-cf-id') !== selectedId || element.tagName === 'SECTION' || !element.getClientRects().length) return;
      if (element.getAttribute('data-cf-position') === 'overlay') {
        var overlayLayer = element.closest('.cf-overlay-layer'); if (!overlayLayer) return;
        var layerRect = overlayLayer.getBoundingClientRect();
        var groupId = element.getAttribute('data-cf-group');
        var movingElements = [element];
        if (groupId) movingElements = Array.prototype.filter.call(overlayLayer.querySelectorAll('[data-cf-position="overlay"]'), function (item) { return item.getAttribute('data-cf-group') === groupId; });
        if (movingElements.some(function (item) { return isLocked(item); })) return;
        var starts = movingElements.map(function (item) { var computed = window.getComputedStyle(item); var effectiveX = Number.parseFloat(computed.left); var effectiveY = Number.parseFloat(computed.top); return { id: item.getAttribute('data-cf-id'), element: item, x: Number.isFinite(effectiveX) ? effectiveX / Math.max(1, layerRect.width) * 100 : (Number(item.getAttribute('data-cf-x')) || 50), y: Number.isFinite(effectiveY) ? effectiveY / Math.max(1, layerRect.height) * 100 : (Number(item.getAttribute('data-cf-y')) || 50), originalStyle: item.getAttribute('style') }; });
        var start = starts.find(function (item) { return item.id === selectedId; }) || starts[0];
        activeDrag = { kind: 'overlay', id: selectedId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false, sourceSection: element.closest('section[data-cf-id]'), overlayLayer: overlayLayer, layerRect: { left: layerRect.left, top: layerRect.top, width: layerRect.width, height: layerRect.height }, starts: starts, startPosition: { x: start.x, y: start.y }, nextPosition: null };
      } else if (element.getAttribute('data-cf-free') === 'true') {
        var freeParent = element.parentElement && element.parentElement.closest('.cf-layout-container, .cf-container'); if (!freeParent) return;
        var freeParentRect = freeParent.getBoundingClientRect(); var freeStyles = window.getComputedStyle(freeParent);
        // Absolute-position offsets are measured from the containing block's padding edge
        // (the inner border edge), not from the content edge. Keep this identical to the
        // conversion, transform-handle, and arrangement coordinate calculations.
        var borderLeft = parseFloat(freeStyles.borderLeftWidth)||0, borderRight = parseFloat(freeStyles.borderRightWidth)||0;
        var borderTop = parseFloat(freeStyles.borderTopWidth)||0, borderBottom = parseFloat(freeStyles.borderBottomWidth)||0;
        var originX = freeParentRect.left + borderLeft;
        var originY = freeParentRect.top + borderTop;
        var selectedMoveElements = [element];
        if (selectedIds.length > 1) {
          var candidates = selectedIds.map(byId).filter(function(item){ return item && item.getAttribute('data-cf-free') === 'true' && !isLocked(item) && item.parentElement === element.parentElement; });
          if (candidates.length === selectedIds.length) selectedMoveElements = candidates;
        }
        var starts = selectedMoveElements.map(function(item){ var cs=window.getComputedStyle(item); var visualRect=item.getBoundingClientRect(); return { id:item.getAttribute('data-cf-id'), element:item, x:Number.parseFloat(cs.left)||0, y:Number.parseFloat(cs.top)||0, width:Number.parseFloat(cs.width)||visualRect.width, height:Number.parseFloat(cs.height)||visualRect.height, rotation:Number(item.getAttribute('data-cf-free-rotation'))||0, originalStyle:item.getAttribute('style') }; });
        activeDrag = { kind:'free-position', id:selectedId, pointerId:event.pointerId, startX:event.clientX, startY:event.clientY, moved:false, parentRect:{left:originX,top:originY,width:Math.max(1,freeParentRect.width-borderLeft-borderRight),height:Math.max(1,freeParentRect.height-borderTop-borderBottom)}, starts:starts, nextItems:null, element:element };
      } else {
        activeDrag = { kind: 'reorder', id: selectedId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false, targetId: null, placement: 'before', sourceSection: element.closest('section[data-cf-id]'), element: element };
      }
      try { element.setPointerCapture(event.pointerId); } catch (_) {}
    }, true);
    document.addEventListener('pointermove', function (event) {
      if (activeTransform && event.pointerId !== activeTransform.pointerId) return;
      if (activeResize && event.pointerId !== activeResize.pointerId) return;
      if (activeDrag && event.pointerId !== activeDrag.pointerId) return;
      if (activeTransform) {
        var transform = activeTransform; var dx = event.clientX-transform.startX; var dy = event.clientY-transform.startY; transform.moved = transform.moved || Math.abs(dx)+Math.abs(dy)>2;
        if (transform.kind === 'rotate') {
          var angle = Math.atan2(event.clientY-transform.centerY,event.clientX-transform.centerX)*180/Math.PI;
          transform.nextRotation = Math.round((transform.rotation + angle-transform.startAngle)*10)/10;
          transform.element.style.transform = 'rotate('+transform.nextRotation+'deg)';
        } else {
          var dir = transform.direction; var left=transform.rect.left, top=transform.rect.top, width=transform.rect.width, height=transform.rect.height;
          if (dir.indexOf('e')>=0) width += dx; if (dir.indexOf('w')>=0) { left += dx; width -= dx; }
          if (dir.indexOf('s')>=0) height += dy; if (dir.indexOf('n')>=0) { top += dy; height -= dy; }
          if (event.shiftKey) { var ratio=transform.ratio||1; if (Math.abs(dx)>=Math.abs(dy)) height=width/ratio; else width=height*ratio; if (dir.indexOf('w')>=0) left=transform.rect.left+transform.rect.width-width; if (dir.indexOf('n')>=0) top=transform.rect.top+transform.rect.height-height; }
          width=clampValue(width,24,4000); height=clampValue(height,1,4000);
          transform.nextRect={left:left,top:top,width:width,height:height};
          // left and top are already in the parent's CSS containing-block space.
          transform.element.style.left=left+'px'; transform.element.style.top=top+'px'; transform.element.style.width=width+'px'; transform.element.style.height=height+'px'; transform.element.style.transform='rotate('+(transform.rotation||0)+'deg)';
        }
        handlePoint(transform.element); event.preventDefault(); return;
      }
      if (activeResize) {
        var dx = event.clientX - activeResize.startX;
        var dy = event.clientY - activeResize.startY;
        var element = activeResize.element;
        var widthOnly = element.classList.contains('cf-heading') || element.classList.contains('cf-paragraph') || element.classList.contains('cf-button') || element.classList.contains('cf-card') || element.classList.contains('cf-divider');
        var width = activeResize.width + dx;
        var height = widthOnly ? activeResize.height : activeResize.height + dy;
        if (event.shiftKey && !widthOnly) {
          var dominant = Math.abs(dx) >= Math.abs(dy);
          if (dominant) height = width / Math.max(.1, activeResize.ratio); else width = height * activeResize.ratio;
        }
        width = snapDimension(width, element, 'width', event);
        if (!widthOnly) height = snapDimension(height, element, 'height', event);
        activeResize.moved = activeResize.moved || Math.abs(dx) + Math.abs(dy) > 2;
        activeResize.nextWidth = width;
        activeResize.nextHeight = height;
        visualResize(element, width, height);
        resizeHandle.style.left = Math.max(8, Math.min(window.innerWidth - 8, event.clientX)) + 'px';
        resizeHandle.style.top = Math.max(8, Math.min(window.innerHeight - 8, event.clientY)) + 'px';
        event.preventDefault(); return;
      }
      if (!activeDrag) return;
      if (!activeDrag.moved && Math.abs(event.clientX - activeDrag.startX) + Math.abs(event.clientY - activeDrag.startY) < 8) return;
      activeDrag.moved = true;
      document.body.classList.add('cf-editor-interacting');
      if (activeDrag.kind === 'overlay') {
        var rect = activeDrag.layerRect;
        var start = activeDrag.startPosition;
        var element = byId(activeDrag.id);
        var dimensions = element ? element.getBoundingClientRect() : { width: 0, height: 0 };
        var rawX = start.x / 100 * rect.width + (event.clientX - activeDrag.startX);
        var rawY = start.y / 100 * rect.height + (event.clientY - activeDrag.startY);
        var snappedX = snapOverlayAxis(rawX, rect.width, dimensions.width / 2, event, 'x');
        var snappedY = snapOverlayAxis(rawY, rect.height, dimensions.height / 2, event, 'y');
        var nextX = snappedX.value / Math.max(1, rect.width) * 100;
        var nextY = snappedY.value / Math.max(1, rect.height) * 100;
        var dxPercent = nextX - start.x; var dyPercent = nextY - start.y;
        var allX = activeDrag.starts.map(function (item) { return item.x; }); var allY = activeDrag.starts.map(function (item) { return item.y; });
        dxPercent = clampValue(dxPercent, -Math.min.apply(null, allX), 100 - Math.max.apply(null, allX));
        dyPercent = clampValue(dyPercent, -Math.min.apply(null, allY), 100 - Math.max.apply(null, allY));
        activeDrag.nextPosition = { x: Math.round((start.x + dxPercent) * 10) / 10, y: Math.round((start.y + dyPercent) * 10) / 10 };
        activeDrag.starts.forEach(function (item) { item.element.style.left = clampValue(item.x + dxPercent, 0, 100) + '%'; item.element.style.top = clampValue(item.y + dyPercent, 0, 100) + '%'; });
        drawSnapGuides(rect, snappedX.guide, snappedY.guide);
        handlePoint(selectedElement()); updateGuides(); event.preventDefault(); return;
      }
      if (activeDrag.kind === 'free-position') {
        var rawDx=event.clientX-activeDrag.startX, rawDy=event.clientY-activeDrag.startY;
        var main=activeDrag.starts[0]; var rawX=main.x+rawDx, rawY=main.y+rawDy;
        var snapped=snapFreePosition(rawX,rawY,main.element,activeDrag.parentRect,event,activeDrag.starts.map(function(item){return item.id;}));
        var dxFinal=snapped.x-main.x, dyFinal=snapped.y-main.y;
        activeDrag.nextItems=activeDrag.starts.map(function(item){ return {id:item.id,x:Math.round((item.x+dxFinal)*10)/10,y:Math.round((item.y+dyFinal)*10)/10,width:item.width,height:item.height,rotation:item.rotation}; });
        activeDrag.nextItems.forEach(function(item){ var start=activeDrag.starts.find(function(source){return source.id===item.id;}); start.element.style.left=item.x+'px'; start.element.style.top=item.y+'px'; });
        drawSnapGuides(activeDrag.parentRect, snapped.guideX, snapped.guideY); handlePoint(selectedElement()); updateGuides(); event.preventDefault(); return;
      }
      var underPointer = document.elementFromPoint(event.clientX, event.clientY);
      var target = underPointer && underPointer.closest ? underPointer.closest('[data-cf-id]') : null;
      removeDropCues(); activeDrag.targetId = null;
      if (!target || target.tagName === 'SECTION' || target.getAttribute('data-cf-id') === activeDrag.id) { event.preventDefault(); return; }
      var targetSection = target.closest('section[data-cf-id]');
      if (!activeDrag.sourceSection || targetSection !== activeDrag.sourceSection) { event.preventDefault(); return; }
      var rect = target.getBoundingClientRect();
      activeDrag.targetId = target.getAttribute('data-cf-id');
      activeDrag.placement = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      target.classList.add(activeDrag.placement === 'before' ? 'cf-editor-drop-before' : 'cf-editor-drop-after');
      event.preventDefault();
    }, true);
    function finishPointer(event) {
      if (activeTransform && event && event.pointerId !== activeTransform.pointerId) return;
      if (activeResize && event && event.pointerId !== activeResize.pointerId) return;
      if (activeDrag && event && event.pointerId !== activeDrag.pointerId) return;
      if (activeTransform) {
        var transform=activeTransform; activeTransform=null; document.body.classList.remove('cf-editor-interacting');
        if(transform.moved) { var next=transform.nextRect || transform.rect; var parent=transform.element.parentElement && transform.element.parentElement.closest('.cf-layout-container, .cf-container'); post({type:'canvasflow:free-transform',id:transform.id,x:next.left,y:next.top,width:next.width,height:next.height,rotation:transform.nextRotation===undefined?transform.rotation:transform.nextRotation,xUnit:'px',yUnit:'px'}); suppressClick=true; }
        return;
      }
      if (activeResize) {
        var state = activeResize; activeResize = null;
        document.body.classList.remove('cf-editor-interacting');
        removeDropCues();
        if (state.moved) {
          var values = resizeValues(state.element, state.nextWidth || state.width, state.nextHeight || state.height);
          if (values) post({ type: 'canvasflow:resize', id: state.id, values: values });
          suppressClick = true;
        }
        return;
      }
      if (!activeDrag) return;
      var state = activeDrag; activeDrag = null;
      document.body.classList.remove('cf-editor-interacting'); removeDropCues(); clearSnapGuides();
      if (state.kind === 'overlay') {
        if (state.moved && state.nextPosition) {
          post({ type: 'canvasflow:move-overlay', id: state.id, xPercent: state.nextPosition.x, yPercent: state.nextPosition.y });
          suppressClick = true;
        }
        return;
      }
      if (state.kind === 'free-position') { if(state.moved && state.nextItems) { post({type:'canvasflow:free-move',id:state.id,items:state.nextItems}); suppressClick=true; } return; }
      if (state.moved && state.targetId) {
        post({ type: 'canvasflow:reorder-node', id: state.id, targetId: state.targetId, placement: state.placement });
        suppressClick = true;
      }
    }
    document.addEventListener('pointerup', finishPointer, true);
    document.addEventListener('pointercancel', function (event) {
      if (activeTransform && event.pointerId === activeTransform.pointerId) { var state=activeTransform; activeTransform=null; if(state.originalStyle===null)state.element.removeAttribute('style');else state.element.setAttribute('style',state.originalStyle); document.body.classList.remove('cf-editor-interacting'); handlePoint(selectedElement()); return; }
      if (activeResize && event.pointerId === activeResize.pointerId) {
        var state = activeResize; activeResize = null;
        if (state.originalStyle === null) state.element.removeAttribute('style'); else state.element.setAttribute('style', state.originalStyle);
        document.body.classList.remove('cf-editor-interacting'); handlePoint(selectedElement()); updateGuides(); removeDropCues(); return;
      }
      if (activeDrag && event.pointerId === activeDrag.pointerId) { if (activeDrag.kind === 'overlay' || activeDrag.kind === 'free-position') restoreOverlayStyles(activeDrag); activeDrag = null; document.body.classList.remove('cf-editor-interacting'); removeDropCues(); clearSnapGuides(); handlePoint(selectedElement()); updateGuides(); }
    }, true);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (activeTransform) { var transformed=activeTransform; activeTransform=null; if(transformed.originalStyle===null)transformed.element.removeAttribute('style');else transformed.element.setAttribute('style',transformed.originalStyle); }
        if (activeResize) { var state = activeResize; activeResize = null; if (state.originalStyle === null) state.element.removeAttribute('style'); else state.element.setAttribute('style', state.originalStyle); }
        if (activeDrag && (activeDrag.kind === 'overlay' || activeDrag.kind === 'free-position')) restoreOverlayStyles(activeDrag); activeDrag = null; document.body.classList.remove('cf-editor-interacting'); removeDropCues(); clearSnapGuides(); handlePoint(selectedElement()); updateGuides();
        return;
      }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      if (event.target && event.target.closest && event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      var selected = selectedElement();
      if (!selected || isLocked(selected)) return;
      var amount = event.altKey ? 0.1 : event.shiftKey ? 5 : 1;
      var dx = event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0;
      var dy = event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0;
      if (selected.getAttribute('data-cf-free') === 'true') {
        var nudgeItems=selectedIds.map(function(id){var item=byId(id);if(!item||item.getAttribute('data-cf-free')!=='true'||item.parentElement!==selected.parentElement||isLocked(item))return null;var css=window.getComputedStyle(item);return {id:id,x:(Number.parseFloat(css.left)||0)+dx,y:(Number.parseFloat(css.top)||0)+dy};}).filter(Boolean);
        event.preventDefault(); post({type:'canvasflow:free-nudge',id:selectedId,dx:dx,dy:dy,items:nudgeItems.length?nudgeItems:undefined}); return;
      }
      if (selected.getAttribute('data-cf-position') !== 'overlay') return;
      event.preventDefault(); post({ type: 'canvasflow:nudge-overlay', id: selectedId, dx: dx, dy: dy });
    }, true);
    document.addEventListener('click', function (event) {
      var pageLink = event.target && event.target.closest ? event.target.closest('[data-cf-page-id]') : null;
      if (pageLink) { event.preventDefault(); event.stopPropagation(); post({ type: 'canvasflow:navigate', pageId: pageLink.getAttribute('data-cf-page-id') }); return; }
      var interactionControl = event.target && event.target.closest ? event.target.closest('[data-cf-action]') : null;
      if (interactionControl) { event.stopPropagation(); return; }
      if (suppressClick) { suppressClick = false; event.preventDefault(); event.stopPropagation(); return; }
      var element = event.target && event.target.closest ? event.target.closest('[data-cf-id]') : null;
      if (!element) return;
      event.preventDefault(); event.stopPropagation();
      if (isLocked(element)) { post({ type: 'canvasflow:locked-click', id: element.getAttribute('data-cf-id') }); return; }
      var clickedId = element.getAttribute('data-cf-id');
      var toggleSelection = event.shiftKey || event.ctrlKey || event.metaKey;
      var clickedGroup = !event.altKey ? element.getAttribute('data-cf-group') : null;
      var clickedSection = element.closest('section[data-cf-id]');
      var groupMembers = clickedGroup && clickedSection ? Array.prototype.filter.call(clickedSection.querySelectorAll('[data-cf-group]'), function (item) { return item.getAttribute('data-cf-group') === clickedGroup; }).map(function (item) { return item.getAttribute('data-cf-id'); }) : [clickedId];
      if (clickedGroup && groupMembers.length > 1) {
        if (toggleSelection) {
          var allSelected = groupMembers.every(function (id) { return selectedIds.indexOf(id) >= 0; });
          if (allSelected) selectedIds = selectedIds.filter(function (id) { return groupMembers.indexOf(id) < 0; });
          else groupMembers.forEach(function (id) { if (selectedIds.indexOf(id) < 0 && selectedIds.length < 20) selectedIds.push(id); });
          if (!selectedIds.length) selectedIds = [clickedId];
        } else selectedIds = groupMembers.slice(0, 20);
        selectedId = selectedIds.indexOf(clickedId) >= 0 ? clickedId : selectedIds[0];
      } else if (toggleSelection && element.tagName !== 'SECTION') {
        var current = byId(selectedId);
        var currentSection = current && current.closest('section[data-cf-id]');
        if (current && current.tagName !== 'SECTION' && currentSection === clickedSection) {
          var foundIndex = selectedIds.indexOf(clickedId);
          if (foundIndex >= 0) { if (selectedIds.length > 1) selectedIds.splice(foundIndex, 1); }
          else if (selectedIds.length < 20) selectedIds.push(clickedId);
          selectedId = selectedIds.indexOf(clickedId) >= 0 ? clickedId : selectedIds[selectedIds.length - 1];
        } else { selectedId = clickedId; selectedIds = [clickedId]; }
      } else { selectedId = clickedId; selectedIds = [clickedId]; }
      updateHandle(); updateGuides();
      post({ type: 'canvasflow:selection', id: selectedId, ids: selectedIds.slice() });
    }, true);
    document.addEventListener('focusin', function (event) {
      var element = event.target && event.target.closest ? event.target.closest('[data-cf-id]') : null;
      if (element && !isLocked(element) && selectedIds.length <= 1) { selectedId = element.getAttribute('data-cf-id'); selectedIds = [selectedId]; post({ type: 'canvasflow:selection', id: selectedId, ids: selectedIds.slice() }); }
    });
    window.addEventListener('scroll', function () { handlePoint(selectedElement()); updateGuides(); }, true);
    window.addEventListener('resize', function () { handlePoint(selectedElement()); updateGuides(); });
    updateHandle();
    updateGuides();
  }());
  </script>`;
  return html.replace('</body>', `${bridge}\n</body>`);
}

export function reorderSection(project, sourceId, targetId, placement = 'before') {
  const sections = project?.page?.sections;
  if (!Array.isArray(sections) || sourceId === targetId || !['before', 'after'].includes(placement)) return false;
  const from = sections.findIndex((section) => section.id === sourceId);
  const to = sections.findIndex((section) => section.id === targetId);
  if (from < 0 || to < 0) return false;
  const [moved] = sections.splice(from, 1);
  const targetIndex = sections.findIndex((section) => section.id === targetId);
  const insertIndex = targetIndex + (placement === 'after' ? 1 : 0);
  if (insertIndex === from) { sections.splice(from, 0, moved); return false; }
  sections.splice(insertIndex, 0, moved);
  return true;
}

export function moveSection(project, sectionId, offset) {
  if (!project?.page?.sections || ![-1, 1].includes(Math.sign(Number(offset)))) return false;
  const sections = project.page.sections;
  const from = sections.findIndex((section) => section.id === sectionId);
  if (from < 0) return false;
  const to = from + Math.sign(Number(offset));
  if (to < 0 || to >= sections.length) return false;
  [sections[from], sections[to]] = [sections[to], sections[from]];
  return true;
}

export function removeSection(project, sectionId) {
  if (!project?.page?.sections || project.page.sections.length <= 1) return false;
  const index = project.page.sections.findIndex((section) => section.id === sectionId);
  if (index < 0) return false;
  project.page.sections.splice(index, 1);
  return true;
}

export function duplicateSection(project, sectionId) {
  if (!project?.page?.sections) return null;
  const index = project.page.sections.findIndex((section) => section.id === sectionId);
  if (index < 0) return null;
  const source = project.page.sections[index];
  const usedIds = new Set();
  for (const pageSection of project.page.sections) { usedIds.add(pageSection.id); if (pageSection.anchor) usedIds.add(pageSection.anchor); walkNodeTree(pageSection.children, (node) => usedIds.add(node.id)); }
  const uniqueId = (base) => {
    let candidate = `${base}-copy`.slice(0, 64);
    let suffix = 2;
    while (usedIds.has(candidate)) { candidate = `${base}`.slice(0, Math.max(1, 58 - String(suffix).length)) + `-${suffix++}`; }
    usedIds.add(candidate);
    return candidate;
  };
  const copy = deepClone(source);
  copy.id = uniqueId(source.id); copy.anchor = uniqueId(source.anchor || source.id); copy.name = `${source.name} copy`.slice(0, 80);
  const rekeyTree = (node, original) => {
    node.id = uniqueId(original?.id || node.id); node.name = `${original?.name || node.name} copy`.slice(0, 80);
    if (node.type === 'heading' && node.level === 1) node.level = 2;
    if (node.type === 'button' && node.href === `#${source.anchor}`) node.href = `#${copy.anchor}`;
    if (node.type === 'container') node.children.forEach((child, index) => rekeyTree(child, original?.children?.[index]));
    return node;
  };
  copy.children = copy.children.map((node, childIndex) => rekeyTree(node, source.children[childIndex]));
  project.page.sections.splice(index + 1, 0, copy);
  return copy;
}

export function moveNode(project, nodeId, offset) {
  if (![-1, 1].includes(Math.sign(Number(offset)))) return false;
  const found = findNode(project, nodeId);
  if (!found || !found.parent) return false;
  const siblings = found.parent.children;
  const from = siblings.findIndex((node) => node.id === nodeId);
  const to = from + Math.sign(Number(offset));
  if (from < 0 || to < 0 || to >= siblings.length) return false;
  [siblings[from], siblings[to]] = [siblings[to], siblings[from]];
  return true;
}

export function reorderNode(project, sourceId, targetId, placement = 'before') {
  if (sourceId === targetId || !['before', 'after'].includes(placement)) return false;
  const source = findNode(project, sourceId);
  const target = findNode(project, targetId);
  if (!source?.parent || !target?.parent || source.parent.id !== target.parent.id) return false;
  const siblings = source.parent.children;
  const from = siblings.findIndex((node) => node.id === sourceId);
  const [moved] = siblings.splice(from, 1);
  const targetIndex = siblings.findIndex((node) => node.id === targetId);
  if (targetIndex < 0) { siblings.splice(from, 0, moved); return false; }
  const insertIndex = targetIndex + (placement === 'after' ? 1 : 0);
  if (insertIndex === from) { siblings.splice(from, 0, moved); return false; }
  siblings.splice(insertIndex, 0, moved);
  return true;
}

/** Reorder a decorative overlay in its visual z-stack without moving flow content. */
export function reorderOverlayLayer(project, sourceId, targetId = null, placement = 'raise') {
  const source = findNode(project, sourceId);
  if (!source?.parent || source.node.type !== 'shape' || source.node.positionMode !== 'overlay') return false;
  const parent = source.parent;
  const overlays = parent.children.filter((node) => node.type === 'shape' && node.positionMode === 'overlay');
  if (overlays.length < 2) return false;
  overlays.sort((a, b) => Number(a.zIndex || 0) - Number(b.zIndex || 0) || parent.children.indexOf(a) - parent.children.indexOf(b));
  const original = overlays.slice();
  const sourceIndex = overlays.findIndex((node) => node.id === sourceId);
  if (sourceIndex < 0) return false;
  if (targetId !== null) {
    const target = findNode(project, targetId);
    if (!target?.parent || target.parent.id !== parent.id || target.node.type !== 'shape' || target.node.positionMode !== 'overlay' || !['before', 'after'].includes(placement)) return false;
    if (targetId === sourceId) return false;
    overlays.splice(sourceIndex, 1);
    const targetIndex = overlays.findIndex((node) => node.id === targetId);
    overlays.splice(targetIndex + (placement === 'after' ? 1 : 0), 0, source.node);
  } else {
    const destination = placement === 'front' ? overlays.length - 1
      : placement === 'back' ? 0
      : placement === 'raise' ? Math.min(overlays.length - 1, sourceIndex + 1)
      : placement === 'lower' ? Math.max(0, sourceIndex - 1) : sourceIndex;
    if (destination === sourceIndex) return false;
    overlays.splice(sourceIndex, 1);
    overlays.splice(destination, 0, source.node);
  }
  if (overlays.every((node, index) => node.id === original[index]?.id)) return false;
  const max = 100;
  overlays.forEach((node, index) => { node.zIndex = overlays.length < 2 ? 0 : Math.round(index * max / (overlays.length - 1)); });
  return true;
}

export function duplicateNode(project, nodeId) {
  const found = findNode(project, nodeId);
  if (!found?.parent) return null;
  const nodes = found.parent.children;
  const index = nodes.findIndex((node) => node.id === nodeId);
  const copy = deepClone(found.node);
  const usedIds = new Set(); for (const section of project.page.sections) { usedIds.add(section.id); walkNodeTree(section.children, (item) => usedIds.add(item.id)); }
  const assignIds = (item) => { let id = idFrom(item.type); while (usedIds.has(id)) id = idFrom(item.type); usedIds.add(id); item.id = id; if (item.type === 'container') item.children.forEach(assignIds); };
  assignIds(copy); copy.name = `${copy.name} copy`.slice(0, 80);
  if (copy.type === 'heading' && copy.level === 1) copy.level = 2;
  nodes.splice(index + 1, 0, copy);
  return copy;
}

export function removeNode(project, nodeId) {
  const found = findNode(project, nodeId);
  if (!found?.parent || found.parent.children.length <= 1) return false;
  const index = found.parent.children.findIndex((node) => node.id === nodeId);
  found.parent.children.splice(index, 1);
  return true;
}

function basicTextNode(sectionId, type) {
  const defaults = {
    heading: { name: 'New heading', level: 2, text: 'A clear, compelling headline', color: '#1c1830', fontSize: 38, fontWeight: '750', fontFamily: 'system', textAlign: 'center', animation: 'none' },
    paragraph: { name: 'New paragraph', text: 'Add useful context that helps visitors understand your message.', color: '#625d78', fontSize: 17, fontWeight: '400', fontFamily: 'system', textAlign: 'center', animation: 'none' },
    button: { name: 'New button', text: 'Explore more', href: `#${sectionId}`, textColor: '#ffffff', backgroundColor: '#7055ed', fontSize: 16, fontWeight: '700', borderRadius: 12, animation: 'none' }
  };
  return normalizeNode({ id: idFrom(type), type, ...defaults[type] }, 0, 0);
}

export function createElementNode(type, sectionId = 'hero') {
  if (['heading', 'paragraph', 'button'].includes(type)) return basicTextNode(sectionId, type);
  const shared = { id: idFrom(type), type, animation: 'none' };
  if (type === 'image') return normalizeNode({ ...shared, name: 'Image', src: '', alt: '', maxWidth: 640, height: 360, borderRadius: 18, objectFit: 'cover', objectPosition: '50% 50%' }, 0, 0);
  if (type === 'card') return normalizeNode({ ...shared, name: 'Feature card', title: 'A useful feature', body: 'Explain why this matters to your visitors.', backgroundColor: '#f8f7fc', color: '#28223d', borderColor: '#e9e6f4', borderRadius: 18, padding: 24, maxWidth: 1200 }, 0, 0);
  if (type === 'divider') return normalizeNode({ ...shared, name: 'Divider', color: '#dedbea', width: 100, height: 1 }, 0, 0);
  if (type === 'shape') return normalizeNode({ ...shared, name: 'Decorative shape', shapeKind: 'rectangle', backgroundColor: '#8c75f5', width: 180, height: 90, borderRadius: 16 }, 0, 0);
  if (type === 'container') return normalizeNode({ ...shared, name: 'Layout container', layout: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'start', alignItems: 'stretch', gridMode: 'fixed', gridColumns: 2, gridMinColumnWidth: 240, gap: 20, rowGap: 20, columnGap: 20, padding: 20, paddingX: 20, paddingY: 20, maxWidth: 1200, minHeight: 0, backgroundColor: '#ffffff', borderColor: '#e9e6f4', borderRadius: 16, children: [] }, 0, 0);
  if (type === 'vector') return normalizeNode({ ...shared, name: 'Vector path', vectorKind: 'bezier', points: [{ x: 100, y: 440 }, { x: 500, y: 80 }, { x: 900, y: 440 }], width: 260, height: 150, fillColor: '#8c75f5', strokeColor: '#3b2d6b', strokeWidth: 4, closed: false, positionMode: 'overlay', xPercent: 50, yPercent: 50, zIndex: 1 }, 0, 0);
  throw new Error(`Unsupported element type: ${type}`);
}

export function createBlankSection(index = 0, backgroundColor = '#ffffff') {
  const slug = `section-${index + 1}`;
  return {
    id: slug, anchor: slug, name: `Canvas section ${index + 1}`,
    backgroundColor: isHexColor(backgroundColor) ? backgroundColor : '#ffffff',
    paddingY: 80, maxWidth: 1080, layout: 'stack', contentAlign: 'center', gap: 24, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'start', alignItems: 'stretch', gridMode: 'fixed', gridColumns: 3, gridMinColumnWidth: 240,
    responsive: {}, opacity: 100, visible: true, locked: false, children: []
  };
}

export function createSection(index, template = 'content', rawDesignSystem = null) {
  const ds = normalizeDesignSystem(rawDesignSystem);
  const slug = `section-${index + 1}`;
  const heading = (text, level = 2, size = 40) => applyDesignTokensToNode({ ...createElementNode('heading', slug), level, name: 'Section heading', text, fontSize: size }, ds);
  const paragraph = (text) => applyDesignTokensToNode({ ...createElementNode('paragraph', slug), name: 'Supporting copy', text }, ds);
  const button = (text, href = `#${slug}`) => applyDesignTokensToNode({ ...createElementNode('button', slug), text, href }, ds);
  const card = (title, body) => applyDesignTokensToNode({ ...createElementNode('card', slug), title, body }, ds);
  let section;
  if (template === 'navigation') {
    section = {
      id: slug, anchor: 'top', name: `Navigation bar ${index + 1}`, componentKind: 'navigation', backgroundColor: ds.colors.surface,
      paddingY: 20, maxWidth: ds.width.wide, layout: 'stack', contentAlign: 'center', gap: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gridMode: 'fixed', gridColumns: 3, gridMinColumnWidth: 240, responsive: {}, opacity: 100, visible: true, locked: false,
      children: [
        { ...heading('CanvasFlow', 2, 25), name: 'Brand name', textAlign: 'left', maxWidth: 240 },
        { ...button('Home', '#top'), name: 'Home link' },
        { ...button('About', '#about'), name: 'About link' },
        { ...button('Contact', '#contact'), name: 'Contact link' }
      ]
    };
  } else if (template === 'hero') {
    section = {
      id: slug, anchor: slug, name: `Hero section ${index + 1}`, componentKind: 'hero', backgroundColor: ds.colors.surface,
      paddingY: ds.spacing.section, maxWidth: ds.width.content, layout: 'stack', contentAlign: 'center', gap: ds.spacing.gap, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'start', alignItems: 'stretch', gridMode: 'fixed', gridColumns: 3, gridMinColumnWidth: 240, responsive: {}, opacity: 100, visible: true, locked: false,
      children: [heading('A headline that makes your idea memorable.', 1, 58), paragraph('Introduce your project with one clear sentence. Give visitors a reason to keep exploring.'), button('Get started')]
    };
  } else if (template === 'features') {
    section = {
      id: slug, anchor: slug, name: `Feature grid ${index + 1}`, componentKind: 'feature-grid', backgroundColor: ds.colors.page, paddingY: 84, maxWidth: ds.width.wide, layout: 'grid', contentAlign: 'center', gap: ds.spacing.gap, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'start', alignItems: 'stretch', gridMode: 'fixed', gridColumns: 3, gridMinColumnWidth: 240, responsive: {}, opacity: 100, visible: true, locked: false,
      children: [heading('Built for the way you work', 2, 40), paragraph('Showcase your strongest ideas with a few well-chosen details.'), card('Thoughtful design', 'Bring structure and consistency to every detail.'), card('Responsive layout', 'Create a clear experience across screen sizes.'), card('Your code, yours', 'Export readable HTML and CSS you can keep editing.')]
    };
  } else if (template === 'cta') {
    section = {
      id: slug, anchor: slug, name: `Call to action ${index + 1}`, componentKind: 'cta', backgroundColor: '#171525', paddingY: 76, maxWidth: ds.width.content, layout: 'stack', contentAlign: 'center', gap: ds.spacing.gap, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'start', alignItems: 'stretch', gridMode: 'fixed', gridColumns: 3, gridMinColumnWidth: 240, responsive: {}, opacity: 100, visible: true, locked: false,
      children: [heading('Ready to make something?', 2, 40), paragraph('Write one last sentence that helps your visitors take the next step.'), button('Get started')]
    };
    section.children[0].color = '#ffffff'; section.children[1].color = '#c1bdd2';
  } else if (template === 'footer') {
    section = {
      id: slug, anchor: slug, name: `Site footer ${index + 1}`, componentKind: 'footer', backgroundColor: ds.colors.surface,
      paddingY: 36, maxWidth: ds.width.wide, layout: 'stack', contentAlign: 'center', gap: 14, responsive: {}, opacity: 100, visible: true, locked: false,
      children: [
        { ...heading('CanvasFlow', 2, 22), name: 'Footer brand', textAlign: 'left', maxWidth: 220 },
        { ...paragraph(`© ${new Date().getFullYear()} Your brand. All rights reserved.`), name: 'Copyright text', textAlign: 'left' },
        { ...button('Back to top', '#top'), name: 'Back to top link' }
      ]
    };
  } else {
    section = {
      id: slug, anchor: slug, name: `Content section ${index + 1}`, backgroundColor: ds.colors.page, paddingY: ds.spacing.section, maxWidth: ds.width.content, layout: 'stack', contentAlign: 'center', gap: ds.spacing.gap, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'start', alignItems: 'stretch', gridMode: 'fixed', gridColumns: 3, gridMinColumnWidth: 240, responsive: {}, opacity: 100, visible: true, locked: false,
      children: [heading('A section of your story', 2, 42), paragraph('Explain what makes this part of your website useful, interesting, or worth remembering.'), button('Learn more')]
    };
  }
  // All starter components inherit the active project tokens for new elements while
  // retaining deliberate contrast choices in the dark call-to-action section.
  if (template === 'cta') {
    for (const node of section.children) {
      if (node.type === 'button') applyDesignTokensToNode(node, ds);
      if (node.type === 'heading') { node.fontFamily = ds.typography.headingFont; node.fontWeight = ds.typography.headingWeight; }
      if (node.type === 'paragraph') { node.fontFamily = ds.typography.bodyFont; node.fontWeight = ds.typography.bodyWeight; }
    }
  }
  section.designTokens = {};
  if (section.backgroundColor === ds.colors.page) section.designTokens.backgroundColor = 'page';
  else if (section.backgroundColor === ds.colors.surface) section.designTokens.backgroundColor = 'surface';
  if (section.paddingY === ds.spacing.section) section.designTokens.paddingY = 'section';
  if (section.maxWidth === ds.width.content) section.designTokens.maxWidth = 'content';
  else if (section.maxWidth === ds.width.wide) section.designTokens.maxWidth = 'wide';
  if (section.gap === ds.spacing.gap) section.designTokens.gap = 'gap';
  return section;
}

export const FONT_LABELS_EXPORT = FONT_LABELS;
