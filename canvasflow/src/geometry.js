/** Pure geometry helpers shared by CanvasFlow's precision editor and tests. */
export const CANVAS_ZOOM_LEVELS = [25, 33, 50, 67, 75, 100, 125, 150, 200];
export const CANVAS_GRID_STEPS = [4, 8, 16, 24, 32];

export function finiteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clamp(value, min, max, fallback = min) {
  const parsed = finiteNumber(value, fallback);
  return Math.max(min, Math.min(max, parsed));
}

export function normalizeFreePositioning(raw = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const unit = (value) => value === '%' ? '%' : 'px';
  const normalizePoint = (point) => {
    const value = point && typeof point === 'object' ? point : {};
    return {
      x: Math.round(clamp(value.x, -5000, 10000, 0) * 10) / 10,
      y: Math.round(clamp(value.y, -5000, 10000, 0) * 10) / 10,
      xUnit: unit(value.xUnit),
      yUnit: unit(value.yUnit),
      width: Math.round(clamp(value.width, 0, 4000, 0) * 10) / 10,
      height: Math.round(clamp(value.height, 0, 4000, 0) * 10) / 10,
      rotation: Math.round(clamp(value.rotation, -3600, 3600, 0) * 10) / 10,
      transformOrigin: ['center', 'top left', 'top right', 'bottom left', 'bottom right'].includes(value.transformOrigin) ? value.transformOrigin : 'center'
    };
  };
  const base = normalizePoint(source);
  const responsive = {};
  for (const breakpoint of ['tablet', 'mobile']) {
    if (!source.responsive || typeof source.responsive !== 'object') continue;
    const candidate = source.responsive[breakpoint];
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const values = normalizePoint({ ...base, ...candidate });
    const overrides = {};
    for (const key of ['x', 'y', 'xUnit', 'yUnit', 'width', 'height', 'rotation', 'transformOrigin']) {
      if (Object.hasOwn(candidate, key) && values[key] !== base[key]) overrides[key] = values[key];
    }
    if (Object.keys(overrides).length) responsive[breakpoint] = overrides;
  }
  return { mode: source.mode === 'free' ? 'free' : 'flow', ...base, responsive };
}

export function resolveFreePositioning(positioning, breakpoint = 'desktop') {
  const base = normalizeFreePositioning(positioning);
  if (breakpoint === 'desktop') return { ...base, responsive: undefined };
  const tablet = base.responsive?.tablet || {};
  const mobile = base.responsive?.mobile || {};
  return {
    ...base,
    ...tablet,
    ...(breakpoint === 'mobile' ? mobile : {}),
    responsive: undefined
  };
}

export function pointerToDocumentPoint(clientPoint, frameRect, zoom = 1) {
  const scale = clamp(zoom, 0.25, 2, 1);
  return {
    x: (finiteNumber(clientPoint?.x) - finiteNumber(frameRect?.left)) / scale,
    y: (finiteNumber(clientPoint?.y) - finiteNumber(frameRect?.top)) / scale
  };
}

export function rectFromPosition(position, parentSize) {
  const p = normalizeFreePositioning(position);
  const width = Math.max(1, finiteNumber(parentSize?.width, 1));
  const height = Math.max(1, finiteNumber(parentSize?.height, 1));
  return {
    left: p.xUnit === '%' ? p.x / 100 * width : p.x,
    top: p.yUnit === '%' ? p.y / 100 * height : p.y,
    width: p.width,
    height: p.height,
    right: (p.xUnit === '%' ? p.x / 100 * width : p.x) + p.width,
    bottom: (p.yUnit === '%' ? p.y / 100 * height : p.y) + p.height
  };
}

export function selectionBounds(rects) {
  const valid = (Array.isArray(rects) ? rects : []).filter((r) => r && [r.left, r.top, r.right, r.bottom].every((n) => Number.isFinite(Number(n))));
  if (!valid.length) return null;
  const left = Math.min(...valid.map((r) => Number(r.left)));
  const top = Math.min(...valid.map((r) => Number(r.top)));
  const right = Math.max(...valid.map((r) => Number(r.right)));
  const bottom = Math.max(...valid.map((r) => Number(r.bottom)));
  return { left, top, right, bottom, width: right - left, height: bottom - top, centerX: (left + right) / 2, centerY: (top + bottom) / 2 };
}

export function resizeRectFromHandle(rect, handle, dx, dy, options = {}) {
  const minWidth = clamp(options.minWidth, 1, 10000, 24);
  const minHeight = clamp(options.minHeight, 1, 10000, 24);
  const maxWidth = clamp(options.maxWidth, minWidth, 20000, 4000);
  const maxHeight = clamp(options.maxHeight, minHeight, 20000, 4000);
  let { left, top, width, height } = rect;
  const right = left + width;
  const bottom = top + height;
  if (handle.includes('e')) width += dx;
  if (handle.includes('w')) { left += dx; width -= dx; }
  if (handle.includes('s')) height += dy;
  if (handle.includes('n')) { top += dy; height -= dy; }
  if (options.lockAspect && width > 0 && height > 0) {
    const ratio = rect.width / Math.max(1, rect.height);
    if (Math.abs(dx) >= Math.abs(dy)) height = width / ratio;
    else width = height * ratio;
    if (handle.includes('w')) left = right - width;
    if (handle.includes('n')) top = bottom - height;
  }
  width = clamp(width, minWidth, maxWidth, rect.width);
  height = clamp(height, minHeight, maxHeight, rect.height);
  return { left: Math.round(left * 10) / 10, top: Math.round(top * 10) / 10, width: Math.round(width * 10) / 10, height: Math.round(height * 10) / 10 };
}

export function snapCoordinate(value, candidates = [], tolerance = 6, enabled = true) {
  const target = finiteNumber(value);
  if (!enabled) return { value: target, snapped: false, candidate: null };
  let best = null;
  for (const candidate of candidates) {
    const position = finiteNumber(candidate?.value, NaN);
    if (!Number.isFinite(position)) continue;
    const distance = Math.abs(target - position);
    if (distance <= tolerance && (!best || distance < best.distance || (distance === best.distance && (candidate.priority || 0) > (best.priority || 0)))) best = { ...candidate, value: position, distance };
  }
  return best ? { value: best.value, snapped: true, candidate: best } : { value: target, snapped: false, candidate: null };
}

export function alignRects(rects, mode) {
  const bounds = selectionBounds(rects);
  if (!bounds || rects.length < 2) return [];
  return rects.map((rect) => {
    let left = rect.left, top = rect.top;
    if (mode === 'left') left = bounds.left;
    else if (mode === 'center-x') left = bounds.centerX - rect.width / 2;
    else if (mode === 'right') left = bounds.right - rect.width;
    else if (mode === 'top') top = bounds.top;
    else if (mode === 'center-y') top = bounds.centerY - rect.height / 2;
    else if (mode === 'bottom') top = bounds.bottom - rect.height;
    return { ...rect, left, top };
  });
}

export function distributeRects(rects, axis = 'x') {
  if (!Array.isArray(rects) || rects.length < 3) return [];
  const sorted = [...rects].sort((a, b) => axis === 'x' ? a.left - b.left : a.top - b.top);
  const first = sorted[0]; const last = sorted[sorted.length - 1];
  const totalSize = sorted.reduce((sum, rect) => sum + (axis === 'x' ? rect.width : rect.height), 0);
  const start = axis === 'x' ? first.left : first.top;
  const end = axis === 'x' ? last.left + last.width : last.top + last.height;
  const gap = (end - start - totalSize) / (sorted.length - 1);
  let cursor = start;
  return sorted.map((rect) => {
    const updated = { ...rect, left: axis === 'x' ? cursor : rect.left, top: axis === 'y' ? cursor : rect.top };
    cursor += (axis === 'x' ? rect.width : rect.height) + gap;
    return updated;
  });
}
