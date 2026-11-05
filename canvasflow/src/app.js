import {
  applyDesignTokensToNode, collectExportAssets, createBlankProject, createBlankSection, createDefaultDesignSystem, createElementNode, createSection, createStarterProject, createComponentDefinition, resolveComponentInstance, duplicateNode, duplicateSection,
  escapeHtml, findNode, walkNodeTree, generateCss, generateHtml, generatePreviewDocument, groupOverlayNodes, moveNode, moveSection, reorderNode, reorderOverlayLayer, reorderSection,
  generateVectorSvg, getTypographyScale, normalizeDesignSystem, normalizeProject, sanitizeSvgDataUrl, removeNode, removeSection, ungroupOverlayNodes
} from './model.js';
import { HistoryManager } from './history.js';
import { createZipBytes, downloadBlob, downloadText } from './zip.js';
import { loadFirstValidProject, writeProjectSaves } from './project-storage.js';
import { CANVAS_ZOOM_LEVELS, normalizeFreePositioning, resolveFreePositioning } from './geometry.js';

const STORAGE_KEY = 'canvasflow.mvp.project.v12';
const LEGACY_STORAGE_KEYS = ['canvasflow.mvp.project.v11', 'canvasflow.mvp.project.v10', 'canvasflow.mvp.project.v9', 'canvasflow.mvp.project.v8', 'canvasflow.mvp.project.v7', 'canvasflow.mvp.project.v6', 'canvasflow.mvp.project.v5', 'canvasflow.mvp.project.v4', 'canvasflow.mvp.project.v3', 'canvasflow.mvp.project.v2', 'canvasflow.mvp.project.v1'];
const LEGACY_COMPAT_STORAGE_KEY = 'canvasflow.mvp.project.v5';
const app = document.querySelector('#app');
const insertDialog = document.querySelector('#insertDialog');
const insertSearchInput = document.querySelector('#insertSearchInput');
const insertSearchEmpty = document.querySelector('#insertSearchEmpty');
const previewStatusText = document.querySelector('#previewStatusText');
const emptyCanvasState = document.querySelector('#emptyCanvasState');
const workspaceBackdrop = document.querySelector('#workspaceBackdrop');
const structurePanelBtn = document.querySelector('#structurePanelBtn');
const inspectorPanelBtn = document.querySelector('#inspectorPanelBtn');
const mobileStructureBtn = document.querySelector('#mobileStructureBtn');
const mobilePropertiesBtn = document.querySelector('#mobilePropertiesBtn');
let activeWorkspacePanel = null;
const inspectorCollapsedGroups = new Set();
const previewFrame = document.querySelector('#sitePreview');
const previewStage = document.querySelector('#previewStage');
const frameWrap = document.querySelector('#frameWrap');
const customWidthInput = document.querySelector('#customWidthInput');
const applyCustomWidthBtn = document.querySelector('#applyCustomWidthBtn');
const fitCanvasBtn = document.querySelector('#fitCanvasBtn');
const zoomOutBtn = document.querySelector('#zoomOutBtn');
const zoomInBtn = document.querySelector('#zoomInBtn');
const zoomPercentInput = document.querySelector('#zoomPercentInput');
const handToolBtn = document.querySelector('#handToolBtn');
const centerSelectionBtn = document.querySelector('#centerSelectionBtn');
const guidesBtn = document.querySelector('#guidesBtn');
const gridBtn = document.querySelector('#gridBtn');
const rulersBtn = document.querySelector('#rulersBtn');
const frameRulerTop = document.querySelector('#rulerTop');
const frameRulerLeft = document.querySelector('#rulerLeft');
const layersList = document.querySelector('#layersList');
const layerSearchInput = document.querySelector('#layerSearchInput');
const layerFilterStatus = document.querySelector('#layerFilterStatus');
const inspectorContent = document.querySelector('#inspectorContent');
const projectNameInput = document.querySelector('#projectName');
const saveStatus = document.querySelector('#saveStatus');
const saveDot = document.querySelector('#saveDot');
const toast = document.querySelector('#toast');
const importInput = document.querySelector('#importInput');
const imageInput = document.querySelector('#imageInput');
const assetUploadInput = document.querySelector('#assetUploadInput');
const assetLibraryDialog = document.querySelector('#assetLibraryDialog');
const componentsDialog = document.querySelector('#componentsDialog');
const componentLibraryContent = document.querySelector('#componentLibraryContent');
const assetLibraryContent = document.querySelector('#assetLibraryContent');
const assetSearchInput = document.querySelector('#assetSearchInput');
const sectionTemplate = document.querySelector('#sectionTemplate');
const desktopBtn = document.querySelector('#desktopBtn');
const tabletBtn = document.querySelector('#tabletBtn');
const mobileBtn = document.querySelector('#mobileBtn');
const viewportLabel = document.querySelector('#viewportLabel');
const canvasWidthLabel = document.querySelector('#canvasWidthLabel');
const sectionCount = document.querySelector('#sectionCount');
const undoBtn = document.querySelector('#undoBtn');
const redoBtn = document.querySelector('#redoBtn');
const history = new HistoryManager(50);
const PAGE_SELECTION_ID = '__canvasflow_page_settings__';
const newProjectDialog = document.querySelector('#newProjectDialog');
const pageSettingsBtn = document.querySelector('#pageSettingsBtn');
const pageCardName = document.querySelector('#pageCardName');
const designSystemDialog = document.querySelector('#designSystemDialog');
const productGuideDialog = document.querySelector('#productGuideDialog');
const pageList = document.querySelector('#pageList');
const siteChromeDialog = document.querySelector('#siteChromeDialog');

let pendingHistoryGroup = null;
let initialProjectLoadedFromStorage = false;
let browserStorageAvailable = true;
let project = loadInitialProject();
let selectedId = project.page.sections[0]?.children[0]?.id || project.page.sections[0]?.id || PAGE_SELECTION_ID;
let selectedIds = selectedId === PAGE_SELECTION_ID ? [] : [selectedId];
let viewport = 'desktop';
let vectorTool = 'select';
let customPreviewWidth = null;
let fitCanvasEnabled = false;
let canvasZoom = 1;
let canvasPan = { x: 0, y: 0 };
let handToolEnabled = false;
let spaceHeld = false;
let activePan = null;
let touchCameraState = null;
const stageTouchPointers = new Map();
let stageTouchSuppressed = false;
let rulerGuideDrag = null;
let showGuides = false;
let showGrid = false;
let showRulers = false;
let dirty = false;
let toastTimeout = null;
let autosaveTimer = null;
let pendingImageMode = 'insert';
let draggedLayer = null;

function captureEditorState() {
  const projectSnapshot = JSON.parse(JSON.stringify(project));
  delete projectSnapshot.updatedAt;
  return { project: projectSnapshot, selectedId, selectedIds: [...selectedIds] };
}
function updateHistoryButtons() {
  undoBtn.disabled = !history.canUndo;
  redoBtn.disabled = !history.canRedo;
}
function recordBeforeMutation(input = null) {
  if (input && pendingHistoryGroup?.element === input) {
    if (!pendingHistoryGroup.recorded) {
      history.record(pendingHistoryGroup.before);
      pendingHistoryGroup.recorded = true;
    }
  } else {
    pendingHistoryGroup = null;
    history.record(captureEditorState());
  }
  updateHistoryButtons();
}
function restoreHistoryState(state, label) {
  if (!state?.project) return;
  pendingHistoryGroup = null;
  project = normalizeProject(state.project);
  const fallbackId = project.page.sections[0]?.children[0]?.id || project.page.sections[0]?.id || PAGE_SELECTION_ID;
  setSelectionState(findNode(project, state.selectedId) ? state.selectedId : (state.selectedId === PAGE_SELECTION_ID ? PAGE_SELECTION_ID : fallbackId), state.selectedIds || (fallbackId === PAGE_SELECTION_ID ? [] : [state.selectedId || fallbackId]));
  markDirty(); renderAll(); showToast(`${label} applied.`);
}
function undoEdit() { const previous = history.undo(captureEditorState()); if (previous) restoreHistoryState(previous, 'Undo'); updateHistoryButtons(); }
function redoEdit() { const next = history.redo(captureEditorState()); if (next) restoreHistoryState(next, 'Redo'); updateHistoryButtons(); }

function loadInitialProject() {
  let storage;
  try { storage = window.localStorage; }
  catch (error) {
    browserStorageAvailable = false;
    console.warn('CanvasFlow browser storage is unavailable:', error);
    return createStarterProject();
  }
  const result = loadFirstValidProject(storage, [STORAGE_KEY, ...LEGACY_STORAGE_KEYS], normalizeProject);
  initialProjectLoadedFromStorage = Boolean(result.key);
  if (result.storageUnavailable) browserStorageAvailable = false;
  for (const entry of result.errors) console.warn(`CanvasFlow could not restore saved project from ${entry.key}:`, entry.error);
  if (result.storageUnavailable) console.warn('CanvasFlow could not access browser storage.');
  return result.project || createStarterProject();
}
function slugify(value) {
  return String(value || 'canvasflow-site').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'canvasflow-site';
}
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.classList.toggle('error', type === 'error'); toast.classList.add('visible');
  window.clearTimeout(toastTimeout); toastTimeout = window.setTimeout(() => toast.classList.remove('visible'), 3300);
}
function markDirty() {
  dirty = true; saveStatus.textContent = 'Unsaved changes'; saveDot.className = 'save-dot unsaved';
  window.clearTimeout(autosaveTimer); autosaveTimer = window.setTimeout(() => saveProject(false), 850);
}
function markSaved() { dirty = false; saveStatus.textContent = 'Saved locally'; saveStatus.title = `Last saved ${new Date().toLocaleString()}`; saveDot.className = 'save-dot saved'; }
function hasPrecisionOnlyFeatures(candidateProject) {
  const pages = Array.isArray(candidateProject?.pages) && candidateProject.pages.length ? candidateProject.pages : [candidateProject?.page].filter(Boolean);
  for (const page of pages) {
    const editor = page.editor || {};
    if ((Array.isArray(editor.guides) && editor.guides.length) || (editor.gridStep !== undefined && editor.gridStep !== 16)) return true;
    const defaults = { grid: true, parent: true, siblings: true, guides: true, equalSpacing: false, horizontal: true, vertical: true };
    if (Object.entries(defaults).some(([key, value]) => editor.snap && editor.snap[key] !== undefined && editor.snap[key] !== value)) return true;
    let hasFreePosition = false;
    for (const section of page.sections || []) walkNodeTree(section.children || [], (node) => { if (node.positioning?.mode === 'free') hasFreePosition = true; });
    if (hasFreePosition) return true;
  }
  return false;
}
function saveProject(showMessage = true) {
  window.clearTimeout(autosaveTimer); autosaveTimer = null;
  try {
    project.updatedAt = new Date().toISOString();
    const serialized = JSON.stringify(project);
    // Keep a schema-5 compatibility copy only when no feature data would be lost.
    // Reusable component definitions are not representable in schema 5.
    const compatibilitySerialized = !(project.components || []).length && !(project.layoutPresets || []).length && !hasPrecisionOnlyFeatures(project) && !serialized.includes('data:image/') && !serialized.includes('\"type\":\"container\"')
      ? JSON.stringify({ ...project, schemaVersion: 5, page: { ...project.page, sections: project.page.sections.map(({ children, ...section }) => ({ ...section, children: children.map(({ positionMode, xPercent, yPercent, zIndex, groupId, ...node }) => node) })) } })
      : null;
    const result = writeProjectSaves(window.localStorage, {
      currentKey: STORAGE_KEY, serialized,
      compatibilityKey: compatibilitySerialized === null ? null : LEGACY_COMPAT_STORAGE_KEY,
      compatibilitySerialized
    });
    if (!result.saved) throw result.error || new Error('Browser storage is unavailable.');
    markSaved();
    if (result.compatibilitySaved === false) {
      saveStatus.title = 'The current project was saved. The optional older-version compatibility copy could not be refreshed.';
      console.warn('CanvasFlow saved the current project, but could not refresh the optional compatibility copy:', result.error);
    }
    if (showMessage) showToast('Project saved in this browser.');
    return true;
  } catch (error) {
    console.error('CanvasFlow could not save this project:', error);
    saveStatus.textContent = 'Save failed'; saveDot.className = 'save-dot unsaved';
    showToast('Browser storage is full or unavailable. Download a project backup before leaving.', 'error'); return false;
  }
}
function openSavedProject() {
  try {
    const result = loadFirstValidProject(window.localStorage, [STORAGE_KEY, ...LEGACY_STORAGE_KEYS], normalizeProject);
    if (!result.project) {
      const detail = result.errors[0]?.error?.message;
      showToast(detail ? `No valid saved project could be reopened: ${detail}` : 'No saved project was found in this browser.', 'error');
      return;
    }
    if (dirty && !window.confirm('Discard unsaved changes and reopen the last saved project?')) return;
    recordBeforeMutation(); window.clearTimeout(autosaveTimer); autosaveTimer = null;
    project = result.project;
    const firstId = project.page.sections[0]?.children[0]?.id || project.page.sections[0]?.id || PAGE_SELECTION_ID;
    setSelectionState(firstId, firstId === PAGE_SELECTION_ID ? [] : [firstId]);
    markSaved(); renderAll();
    if (result.errors.length) showToast('A damaged newer save was skipped. The last valid saved project was reopened.');
    else showToast('Last saved project reopened.');
  } catch (error) { showToast(`Could not reopen project: ${error.message}`, 'error'); }
}
function activeSelection() { return findNode(project, selectedId) || { node: project.page.sections[0], parent: null }; }
function setSelectionState(primaryId, requestedIds = [primaryId]) {
  if (primaryId === PAGE_SELECTION_ID || (!project.page.sections.length && !findNode(project, primaryId))) {
    selectedId = PAGE_SELECTION_ID; selectedIds = []; return;
  }
  const primary = findNode(project, primaryId);
  if (!primary) {
    selectedId = project.page.sections[0]?.children[0]?.id || project.page.sections[0]?.id;
    selectedIds = [selectedId];
    return;
  }
  if (!primary.parent) { selectedId = primaryId; selectedIds = [primaryId]; return; }
  const sameParentIds = [...new Set((Array.isArray(requestedIds) ? requestedIds : [primaryId])
    .filter((id) => typeof id === 'string')
    .filter((id) => { const found = findNode(project, id); return found?.parent?.id === primary.parent.id; }))].slice(0, 20);
  selectedIds = sameParentIds.length ? sameParentIds : [primaryId];
  selectedId = selectedIds.includes(primaryId) ? primaryId : selectedIds[0];
}
function getSelectedNodes() {
  return selectedIds.map((id) => findNode(project, id)).filter((found) => found?.parent).map((found) => found.node);
}
function selectionParent() {
  const found = findNode(project, selectedIds[0] || selectedId);
  return found?.parent || null;
}
function selectionIsAllSiblings() {
  const parent = selectionParent();
  return !!parent && selectedIds.length === parent.children.length && parent.children.every((node) => selectedIds.includes(node.id));
}
function alignControls(value = 'auto') {
  const choices = [['start', 'Left'], ['center', 'Centre'], ['end', 'Right'], ['stretch', 'Stretch']];
  return `<div class="arrange-controls" role="group" aria-label="Align selected elements">${choices.map(([key, label]) => `<button type="button" data-arrange-align="${key}" aria-pressed="${value === key}" class="${value === key ? 'active' : ''}" title="Align ${label.toLowerCase()}">${label}</button>`).join('')}</div>`;
}
function renderMultiInspector(nodes) {
  const parent = selectionParent();
  const allSiblings = selectionIsAllSiblings();
  const alignValues = new Set(nodes.map((node) => getEffectiveValue(node, 'alignSelf') || 'auto'));
  const alignValue = alignValues.size === 1 ? [...alignValues][0] : 'auto';
  const overlayOnly = nodes.length > 1 && nodes.every((node) => node.type === 'shape' && node.positionMode === 'overlay');
  const hasGroup = overlayOnly && nodes.every((node) => node.groupId && node.groupId === nodes[0].groupId);
  const overlayGroupAction = overlayOnly ? `<div class="selection-actions"><button type="button" data-selection-action="${hasGroup ? 'ungroup-overlays' : 'group-overlays'}">${hasGroup ? 'Ungroup overlays' : 'Group selected overlays'}</button></div><p class="field-help">Grouped overlays stay independently editable, but drag together on the canvas.</p>` : '';
  const allFree = nodes.every((node) => effectivePositioning(node).mode === 'free');
  const freeArrange = allFree ? propGroup('Precision arrangement', 'Free-position elements', `<div class="free-arrange-grid" role="group" aria-label="Geometric alignment">${[['left','Align left'],['center-x','Centre horizontally'],['right','Align right'],['top','Align top'],['center-y','Centre vertically'],['bottom','Align bottom'],['distribute-x','Distribute horizontally'],['distribute-y','Distribute vertically'],['match-width','Match width'],['match-height','Match height'],['match-size','Match size']].map(([action,label]) => `<button type="button" data-free-arrange="${action}" title="${label}">${label}</button>`).join('')}</div><p class="field-help">Align and match size for two or more siblings; distribution requires at least three. The active preview measures the true dimensions.</p>`) : '';

  inspectorContent.innerHTML = `<div class="selection-summary"><div class="selection-icon" aria-hidden="true">▦</div><div class="selection-summary-copy"><strong>${nodes.length} elements selected</strong><small>Multi-selection · Same section</small></div></div>
    <div class="inspector-note"><strong>Batch arrange</strong>Shift-click or Ctrl/Cmd-click elements in the same section. Alignment is stored in the project and exported to CSS.</div>
    ${propGroup('Alignment', 'Selected elements', alignControls(alignValue))}
    ${freeArrange}
    ${propGroup('Distribution', allSiblings ? 'All siblings selected' : 'Select all siblings to apply', `<p class="field-help">Set one consistent gap between every element in this section. This uses responsive layout spacing, not fixed coordinates.</p><div class="arrange-controls gap-controls" role="group" aria-label="Equal section spacing">${[16, 24, 32, 40, 48].map((gap) => `<button type="button" data-distribute-gap="${gap}" ${allSiblings ? '' : 'disabled'}>${gap} px</button>`).join('')}</div>`)}
    ${overlayGroupAction}
    <div class="selection-actions"><button type="button" data-selection-action="clear">Clear selection</button></div>
    <div class="inspector-note"><strong>Layout-aware</strong>${escapeHtml(parent?.name || 'The selected section')} retains normal flow. CanvasFlow doesn't pin these elements to fragile screen coordinates.</div>`;
}
function activeSection() {
  const found = activeSelection();
  return found.node?.type === 'section' ? found.node : found.section || found.parent || project.page.sections[0] || null;
}
function selectPageSettings() {
  if (activeWorkspacePanel === 'structure') setWorkspacePanel(null);
  setSelectionState(PAGE_SELECTION_ID, []);
  pageSettingsBtn.classList.toggle('selected', true);
  renderLayers(); renderInspector(); renderPreview();
}
function selectNode(id, options = {}) {
  if (!findNode(project, id)) return;
  if (activeWorkspacePanel === 'structure') setWorkspacePanel(null);
  if (options.toggle) {
    const target = findNode(project, id);
    const currentParent = selectionParent();
    if (target.parent && currentParent?.id === target.parent.id) {
      const currentIndex = selectedIds.indexOf(id);
      if (currentIndex >= 0) { if (selectedIds.length > 1) selectedIds.splice(currentIndex, 1); }
      else if (selectedIds.length < 20) selectedIds.push(id);
      setSelectionState(selectedIds.includes(id) ? id : selectedIds[selectedIds.length - 1], selectedIds);
    } else setSelectionState(id, [id]);
  } else setSelectionState(id, [id]);
  pageSettingsBtn.classList.toggle('selected', false);
  renderLayers(); renderInspector(); renderPreview();
  if (options.focusTree) layersList.querySelector(`[data-select-id="${CSS.escape(id)}"]`)?.focus();
}
function nodeSymbol(node) {
  return ({ heading: 'T', paragraph: '¶', button: '↗', image: '▧', card: '▦', divider: '―', shape: '◇', vector: '∿', component: '◈', container: '▤' })[node.type] || '•';
}
function nodeLabel(node) {
  if (node.type === 'heading' || node.type === 'paragraph' || node.type === 'button') return node.text;
  if (node.type === 'card') return node.title;
  if (node.type === 'image') return node.alt || 'Image';
  if (node.type === 'vector') return node.name || 'Vector path';
  if (node.type === 'component') return project.components.find((item) => item.id === node.componentId)?.name || 'Missing component';
  return node.name;
}
function applyLayerSearch() {
  if (!layersList || !layerSearchInput) return;
  const query = layerSearchInput.value.trim().toLocaleLowerCase();
  let matches = 0;
  const filterContainer = (container, revealAll = false) => {
    let found = false;
    for (const child of [...container.children]) {
      if (child.classList.contains('layer-row')) {
        const ownText = child.querySelector('.layer-item-name')?.textContent?.toLocaleLowerCase() || '';
        const nested = [...child.children].find((item) => item.classList.contains('layer-nested-children'));
        const descendantFound = nested ? filterContainer(nested, revealAll) : false;
        const ownMatch = !query || revealAll || ownText.includes(query);
        const visible = ownMatch || descendantFound;
        child.hidden = Boolean(query) && !visible;
        if (visible && query && (ownMatch || descendantFound)) found = true;
        if (query && ownMatch && !revealAll) matches += 1;
      } else if (child.classList.contains('layer-nested-children') || child.classList.contains('layer-children')) {
        if (filterContainer(child, revealAll)) found = true;
      }
    }
    return found;
  };
  layersList.querySelectorAll(':scope > .layer-group').forEach((group) => {
    const sectionName = group.querySelector(':scope > .layer-section-row .layer-section-name')?.textContent?.toLocaleLowerCase() || '';
    const sectionMatch = Boolean(query && sectionName.includes(query));
    const childMatch = filterContainer(group, sectionMatch);
    group.hidden = Boolean(query) && !sectionMatch && !childMatch;
    if (sectionMatch) matches += 1;
  });
  const empty = layersList.querySelector('.layer-filter-empty');
  if (query && matches === 0 && !layersList.querySelector(':scope > .empty-layers-state')) {
    if (!empty) layersList.insertAdjacentHTML('beforeend', '<div class="layer-filter-empty"><span>⌕</span><strong>No matching layers</strong><small>Try another name or element type.</small></div>');
  } else if (empty) empty.remove();
  if (layerFilterStatus) layerFilterStatus.textContent = query ? `${matches} match${matches === 1 ? '' : 'es'}` : `${project.page.sections.length} section${project.page.sections.length === 1 ? '' : 's'}`;
}

function renderLayers() {
  layersList.replaceChildren();
  layersList.setAttribute('role', 'tree');
  layersList.setAttribute('aria-label', 'Website layers. Use arrow keys to navigate; Alt plus up or down reorders the selected item.');
  if (!project.page.sections.length) {
    layersList.innerHTML = `<div class="empty-layers-state"><span aria-hidden="true">＋</span><strong>Your canvas is empty</strong><p>Add a section or insert an element to begin building.</p><button type="button" data-open-page-settings>Page settings</button></div>`;
  }
  project.page.sections.forEach((section, sectionIndex) => {
    const wrap = document.createElement('div');
    wrap.className = `layer-group${section.visible === false ? ' is-hidden' : ''}${section.locked ? ' is-locked' : ''}`;
    wrap.setAttribute('role', 'treeitem');
    wrap.setAttribute('aria-level', '1');
    wrap.setAttribute('aria-expanded', 'true');
    wrap.setAttribute('aria-selected', String(selectedIds.includes(section.id)));
    wrap.setAttribute('aria-label', section.name);
    wrap.tabIndex = selectedIds.includes(section.id) ? 0 : -1;
    wrap.dataset.selectId = section.id;

    const sectionRow = document.createElement('div');
    sectionRow.className = 'layer-section-row';
    const sectionButton = document.createElement('div');
    sectionButton.className = `layer-section-label${selectedIds.includes(section.id) ? ' selected' : ''}`;
    sectionButton.setAttribute('role', 'presentation');
    sectionButton.draggable = true;
    sectionButton.dataset.dragType = 'section';
    sectionButton.dataset.dragId = section.id;
    sectionButton.innerHTML = `<span class="layer-caret" aria-hidden="true">⌄</span><span class="layer-section-name">${escapeHtml(section.name)}</span><span class="layer-section-chip">${String(sectionIndex + 1).padStart(2, '0')}</span>`;
    sectionRow.append(sectionButton);
    sectionRow.insertAdjacentHTML('beforeend', layerActionButton(section, 'visible') + layerActionButton(section, 'locked'));
    wrap.append(sectionRow);

    const childrenWrap = document.createElement('div');
    childrenWrap.className = 'layer-children';
    childrenWrap.setAttribute('role', 'group');
    const appendLayerNodes = (nodes, target, depth = 0) => {
      for (const node of nodes || []) {
        const row = document.createElement('div');
        row.className = `layer-row${node.visible === false ? ' is-hidden' : ''}${node.locked ? ' is-locked' : ''}${node.type === 'container' ? ' layer-row-container' : ''}`;
        row.style.setProperty('--layer-depth', String(depth));
        const button = document.createElement('button');
        button.type = 'button'; button.draggable = true; button.dataset.dragType = 'node'; button.dataset.dragId = node.id;
        button.className = `layer-item${selectedIds.includes(node.id) ? ' selected' : ''}`; button.dataset.selectId = node.id;
        button.setAttribute('role', 'treeitem'); button.setAttribute('aria-level', String(depth + 2));
        button.setAttribute('aria-selected', String(selectedIds.includes(node.id))); button.tabIndex = selectedIds.includes(node.id) ? 0 : -1;
        const overlayBadge = node.type === 'shape' && node.positionMode === 'overlay' ? `<span class="overlay-chip">${node.groupId ? 'grouped' : 'overlay'}</span>` : '';
        button.innerHTML = `<span class="layer-kind" aria-hidden="true">${nodeSymbol(node)}</span><span class="layer-item-name">${escapeHtml(nodeLabel(node) || node.name)}</span>${overlayBadge}<span class="layer-type${overlayBadge ? ' layer-type-overlay' : ''}">${node.type}</span>`;
        row.append(button); row.insertAdjacentHTML('beforeend', layerActionButton(node, 'visible') + layerActionButton(node, 'locked') + layerOrderButton(node, 'raise') + layerOrderButton(node, 'lower'));
        target.append(row);
        if (node.type === 'container' && node.children?.length) {
          const nested = document.createElement('div'); nested.className = 'layer-nested-children'; nested.setAttribute('role', 'group');
          appendLayerNodes(node.children, nested, depth + 1); target.append(nested);
        }
      }
    };
    appendLayerNodes(section.children, childrenWrap);
    wrap.append(childrenWrap);
    layersList.append(wrap);
  });
  sectionCount.textContent = String(project.page.sections.length).padStart(2, '0');
  applyLayerSearch();
}

function fieldText(label, prop, value, options = {}) {
  const cls = options.multiline ? 'text-area' : 'text-input';
  if (options.multiline) return `<label class="field"><span class="field-label">${label}</span><textarea class="${cls}" data-prop="${prop}" rows="3" maxlength="${options.maxLength || 2000}">${escapeHtml(value)}</textarea></label>`;
  return `<label class="field"><span class="field-label">${label}</span><input class="${cls}" data-prop="${prop}" type="text" maxlength="${options.maxLength || 500}" value="${escapeHtml(value)}"></label>`;
}
function fieldColor(label, prop, value) {
  return `<label class="field"><span class="field-label">${label}</span><span class="color-control"><input type="color" data-prop="${prop}" value="${value}" aria-label="${label}"><span class="color-value" data-color-value="${prop}">${value.toUpperCase()}</span></span></label>`;
}
function fieldNumber(label, prop, value, min, max, suffix = 'px') {
  return `<label class="field"><span class="field-label">${label}<span class="field-hint">${suffix}</span></span><input class="number-input" type="number" data-prop="${prop}" min="${min}" max="${max}" step="1" value="${value}"></label>`;
}
function fieldRange(label, prop, value, min, max, unit = 'px') {
  return `<label class="field"><span class="field-label">${label}<span class="field-hint"><span data-range-value="${prop}">${value}</span> ${unit}</span></span><span class="range-row"><input type="range" data-prop="${prop}" min="${min}" max="${max}" value="${value}" aria-label="${label}"><span class="range-value" data-range-echo="${prop}">${value}${unit}</span></span></label>`;
}
function fieldSelect(label, prop, value, options) {
  return `<label class="field"><span class="field-label">${label}</span><select class="select-input" data-prop="${prop}">${options.map(([key, text]) => `<option value="${key}"${key === value ? ' selected' : ''}>${text}</option>`).join('')}</select></label>`;
}
function focalPointPicker(value = '50% 50%') {
  const points = [
    ['0% 0%', 'tl', 'Top left'], ['50% 0%', 'tc', 'Top centre'], ['100% 0%', 'tr', 'Top right'],
    ['0% 50%', 'ml', 'Middle left'], ['50% 50%', 'mc', 'Centre'], ['100% 50%', 'mr', 'Middle right'],
    ['0% 100%', 'bl', 'Bottom left'], ['50% 100%', 'bc', 'Bottom centre'], ['100% 100%', 'br', 'Bottom right']
  ];
  return `<div class="field"><span class="field-label">Focal point</span><div class="focal-point-grid" role="group" aria-label="Image focal point">${points.map(([pos, key, label]) => `<button type="button" class="focal-point-option focal-${key}${pos === value ? ' active' : ''}" data-focal-point="${pos}" aria-label="${label}" title="${label}" aria-pressed="${pos === value}"><span aria-hidden="true"></span></button>`).join('')}</div></div>`;
}
function cropCoordinates(value = '50% 50%') {
  const match = String(value).match(/^(\d{1,3})%\s+(\d{1,3})%$/);
  return match ? [Math.max(0, Math.min(100, Number(match[1]))), Math.max(0, Math.min(100, Number(match[2])))] : [50, 50];
}
function cropPresetControl(value) {
  const presets = [['50% 50%', 'Center'], ['50% 28%', 'Portrait / face'], ['50% 18%', 'Upper frame'], ['50% 82%', 'Lower frame'], ['32% 50%', 'Subject left'], ['68% 50%', 'Subject right']];
  const selected = presets.some(([position]) => position === value) ? value : 'custom';
  return `<label class="field"><span class="field-label">Reusable crop preset</span><select class="select-input" data-crop-preset><option value="custom"${selected === 'custom' ? ' selected' : ''}>Custom position</option>${presets.map(([position, label]) => `<option value="${position}"${selected === position ? ' selected' : ''}>${label}</option>`).join('')}</select></label>`;
}
function cropPositionControls(value) {
  const [x, y] = cropCoordinates(value);
  return `<div class="crop-range-grid"><label class="field"><span class="field-label">Horizontal focal point <strong data-crop-value="x">${x}%</strong></span><input type="range" min="0" max="100" step="1" value="${x}" data-focal-axis="x" data-prop="objectPosition" aria-label="Horizontal image focal point"></label><label class="field"><span class="field-label">Vertical focal point <strong data-crop-value="y">${y}%</strong></span><input type="range" min="0" max="100" step="1" value="${y}" data-focal-axis="y" data-prop="objectPosition" aria-label="Vertical image focal point"></label></div>`;
}
function pageLinkField(node) {
  const current = typeof node.href === 'string' ? node.href.match(/^@page:([a-zA-Z0-9_-]{1,64})$/)?.[1] || '' : '';
  const options = project.pages.map((page) => `<option value="${escapeHtml(page.id)}"${page.id === current ? ' selected' : ''}>${escapeHtml(page.name)} · ${escapeHtml(pageFileLabel(page))}</option>`).join('');
  return `<label class="field"><span class="field-label">Internal page link</span><select class="select-input" data-prop="pageLink"><option value="">Choose a page…</option>${options}</select><small class="field-help">Use this for a link to another page in this project. Keep the URL field below for external links or section anchors.</small></label>`;
}
function fieldFontFamily(value) { return fieldSelect('Font family', 'fontFamily', value, [['system', 'Modern sans-serif'], ['serif', 'Editorial serif'], ['rounded', 'Rounded sans-serif'], ['humanist', 'Humanist sans-serif'], ['mono', 'Monospace']]); }
function fieldWeight(value) { return fieldSelect('Weight', 'fontWeight', String(value) === '650' ? '600' : String(value), [['400', 'Regular'], ['500', 'Medium'], ['600', 'Semibold'], ['700', 'Bold'], ['750', 'Extra bold'], ['800', 'Heavy']]); }
function fieldAlignment(value) {
  const options = [['left', 'Left', 'Align left'], ['center', 'Center', 'Align center'], ['right', 'Right', 'Align right']];
  return `<div class="field"><span class="field-label">Alignment</span><div class="segmented" role="group" aria-label="Text alignment">${options.map(([key, text, title]) => `<button type="button" data-align="${key}" title="${title}" aria-pressed="${value === key}" class="${value === key ? 'active' : ''}">${text}</button>`).join('')}</div></div>`;
}
function fieldAnimation(value) { return fieldSelect('Entrance motion', 'animation', value || 'none', [['none', 'No animation'], ['fade', 'Fade in'], ['rise', 'Rise in'], ['slide-left', 'Slide from right'], ['slide-right', 'Slide from left'], ['zoom', 'Zoom in'], ['blur', 'Blur to clear']]); }
function fieldMotionNumber(label, prop, value, min, max) { return `<label class="field"><span class="field-label">${label}<span class="field-hint">ms</span></span><input class="number-input" type="number" data-prop="${prop}" data-deferred-number="true" min="${min}" max="${max}" step="50" value="${value}"></label>`; }
function motionControls(node) {
  return `${fieldAnimation(node.animation)}
    <div class="split-fields">${fieldMotionNumber('Duration', 'animationDuration', node.animationDuration ?? 700, 100, 5000)}${fieldMotionNumber('Delay', 'animationDelay', node.animationDelay ?? 0, 0, 3000)}</div>
    ${fieldSelect('Easing', 'animationEasing', node.animationEasing || 'smooth', [['smooth', 'Smooth'], ['ease', 'Ease'], ['ease-in', 'Ease in'], ['ease-out', 'Ease out'], ['ease-in-out', 'Ease in/out'], ['linear', 'Linear']])}
    <div class="split-fields">${fieldSelect('Direction', 'animationDirection', node.animationDirection || 'normal', [['normal', 'Forward'], ['reverse', 'Reverse']])}${fieldSelect('Trigger', 'animationTrigger', node.animationTrigger || 'load', [['load', 'On page load'], ['viewport', 'When scrolled into view'], ['hover', 'On hover / focus']])}</div>
    <button type="button" class="wide-control motion-preview-button" data-motion-preview>▶ Preview motion</button>
    <p class="field-help">Settings export to the real website. “When scrolled into view” plays once as visitors scroll; hover/focus is replayable. Reduced-motion preferences are respected.</p>`;
}
function shapePalette(value) {
  const shapes = [
    ['rectangle', 'Rectangle', '▰'], ['circle', 'Circle', '●'], ['pill', 'Pill', '⬭'], ['triangle', 'Triangle', '▲'],
    ['diamond', 'Diamond', '◆'], ['hexagon', 'Hexagon', '⬡'], ['star', 'Star', '★'], ['ring', 'Ring', '◯']
  ];
  return `<div class="shape-palette" role="group" aria-label="Choose shape">${shapes.map(([key, label, glyph]) => `<button type="button" class="shape-palette-option${value === key ? ' active' : ''}" data-shape-pick="${key}" aria-pressed="${value === key}" title="${label}"><span class="shape-swatch shape-swatch-${key}" aria-hidden="true">${glyph}</span><span>${label}</span></button>`).join('')}</div>`;
}
function layerOrderButton(node, action) {
  const raise = action === 'raise';
  const label = raise ? 'Raise layer' : 'Lower layer';
  return `<button type="button" class="layer-order-button" data-layer-action="${action}" data-layer-id="${escapeHtml(node.id)}" aria-label="${label} ${escapeHtml(node.name || 'layer')}" title="${label}">${raise ? '↑' : '↓'}</button>`;
}
function layerActionButton(node, action) {
  const visible = node.visible !== false;
  const locked = node.locked === true;
  const isVisibleAction = action === 'visible';
  const active = isVisibleAction ? visible : locked;
  const label = isVisibleAction ? (visible ? 'Hide' : 'Show') : (locked ? 'Unlock canvas' : 'Lock canvas');
  const glyph = isVisibleAction ? (visible ? '◉' : '◌') : (locked ? '▣' : '♧');
  return `<button type="button" class="layer-toggle-button${active ? ' active' : ''}" data-layer-action="${action}" data-layer-id="${escapeHtml(node.id)}" aria-label="${label} ${escapeHtml(node.name || 'layer')}" aria-pressed="${active}" title="${label} ${escapeHtml(node.name || 'layer')}">${glyph}</button>`;
}
function layerControls(node) {
  return propGroup('Layer', 'Visibility · opacity · canvas lock', `${fieldRange('Opacity', 'opacity', node.opacity ?? 100, 0, 100, '%')}<div class="layer-inspector-actions"><button type="button" data-node-action="toggle-visible">${node.visible === false ? '◌ Show in website' : '◉ Hide in website'}</button><button type="button" data-node-action="toggle-locked">${node.locked ? '▣ Unlock canvas' : '♧ Lock on canvas'}</button></div><p class="field-help">Visibility affects the exported site. Canvas lock prevents accidental selection, moving and resizing on the preview; the layer list and Properties stay usable.</p>`);
}
function propGroup(title, hint, body) {
  const key = `${title}::${hint || ''}`;
  const isOpen = !inspectorCollapsedGroups.has(key);
  return `<details class="property-group" data-inspector-group="${escapeHtml(key)}"${isOpen ? ' open' : ''}><summary class="property-group-title"><span>${escapeHtml(title)}</span>${hint ? `<span>${escapeHtml(hint)}</span>` : ''}</summary><div class="property-group-body">${body}</div></details>`;
}
function responsiveProperties(node) {
  const props = {
    section: ['backgroundColor', 'paddingY', 'maxWidth', 'gap', 'contentAlign', 'layout', 'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'gridMode', 'gridColumns', 'gridMinColumnWidth'],
    container: ['backgroundColor', 'borderColor', 'borderRadius', 'padding', 'paddingX', 'paddingY', 'maxWidth', 'minHeight', 'gap', 'rowGap', 'columnGap', 'layout', 'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'gridMode', 'gridColumns', 'gridMinColumnWidth'],
    heading: ['color', 'fontSize', 'textAlign', 'maxWidth', 'alignSelf'],
    paragraph: ['color', 'fontSize', 'textAlign', 'maxWidth', 'alignSelf'],
    button: ['backgroundColor', 'textColor', 'fontSize', 'borderRadius', 'width', 'alignSelf'],
    image: ['maxWidth', 'height', 'borderRadius', 'objectPosition', 'alignSelf'],
    card: ['backgroundColor', 'color', 'borderColor', 'borderRadius', 'padding', 'maxWidth', 'alignSelf'],
    divider: ['color', 'width', 'height', 'alignSelf'],
    shape: ['backgroundColor', 'width', 'height', 'borderRadius', 'alignSelf', ...(node.positionMode === 'overlay' ? ['xPercent', 'yPercent'] : [])],
    vector: ['width', 'height', 'alignSelf', ...(node.positionMode === 'overlay' ? ['xPercent', 'yPercent'] : [])]
  };
  return props[node.type] || [];
}
function getInheritedValue(node, prop, breakpoint) {
  if (breakpoint === 'mobile') return node.responsive?.tablet?.[prop] ?? node[prop];
  return node[prop];
}
function getEffectiveValue(node, prop) {
  if (viewport === 'desktop' || !responsiveProperties(node).includes(prop)) return node[prop];
  return node.responsive?.[viewport]?.[prop] ?? getInheritedValue(node, prop, viewport);
}
function responsiveStatus(node) {
  if (viewport === 'desktop') {
    return `<div class="responsive-edit-card"><span class="responsive-edit-icon" aria-hidden="true">↔</span><div><strong>Base styles</strong><p>Switch to tablet or mobile to tune layout and typography. Text content stays shared.</p></div></div>`;
  }
  const label = viewport === 'mobile' ? 'Mobile' : 'Tablet';
  const count = Object.keys(node.responsive?.[viewport] || {}).length;
  return `<div class="responsive-edit-card responsive-edit-active"><span class="responsive-edit-icon" aria-hidden="true">${viewport === 'mobile' ? '▯' : '▤'}</span><div><strong>${label} overrides <small>${count ? `${count} custom` : 'Inheriting styles'}</small></strong><p>Font size, layout, alignment and colour can be tuned independently here. Text stays shared.</p></div>${count ? `<button type="button" data-responsive-action="reset" title="Reset ${label.toLowerCase()} overrides">Reset</button>` : ''}</div>`;
}
function inspectorHeader(node, kind, symbol) {
  return `<div class="selection-summary"><div class="selection-icon" aria-hidden="true">${symbol}</div><div class="selection-summary-copy"><strong>${escapeHtml(node.name)}</strong><small>${kind} · Selected</small></div></div>`;
}
function elementActions(node) {
  const found = findNode(project, node.id); const siblings = found?.parent?.children || [];
  if (!found?.parent) return '';
  const index = siblings.findIndex((item) => item.id === node.id);
  return `<div class="selection-actions">
    <button type="button" data-node-action="up" ${index <= 0 ? 'disabled' : ''} title="Move up">↑</button>
    <button type="button" data-node-action="down" ${index >= siblings.length - 1 ? 'disabled' : ''} title="Move down">↓</button>
    <button type="button" data-selection-action="select-siblings" title="Select all elements in this section">Select siblings</button>
    ${node.type !== 'component' ? '<button type="button" data-create-component title="Turn this element into a reusable linked component">◇ Create component</button>' : ''}
    <button type="button" data-node-action="duplicate" title="Duplicate element">▣ Duplicate</button>
    <button type="button" data-node-action="delete" ${siblings.length <= 1 ? 'disabled' : ''} title="Delete element">⌫ Delete</button>
  </div>`;
}
function effectivePositioning(node, breakpoint = viewport) {
  return resolveFreePositioning(node.positioning, breakpoint);
}
function setPositioningValue(node, key, value) {
  node.positioning = normalizeFreePositioning(node.positioning);
  if (key === 'mode' || viewport === 'desktop') {
    node.positioning[key] = value;
    return;
  }
  node.positioning.responsive ||= {};
  node.positioning.responsive[viewport] ||= {};
  const inherited = effectivePositioning(node, viewport === 'mobile' ? 'tablet' : 'desktop')[key];
  if (value === inherited) delete node.positioning.responsive[viewport][key];
  else node.positioning.responsive[viewport][key] = value;
  if (!Object.keys(node.positioning.responsive[viewport]).length) delete node.positioning.responsive[viewport];
  if (!Object.keys(node.positioning.responsive).length) node.positioning.responsive = {};
}
function positioningControls(node) {
  const positioning = effectivePositioning(node);
  const legacyOverlay = ['shape', 'vector'].includes(node.type) && node.positionMode === 'overlay';
  if (legacyOverlay) return propGroup('Precision positioning', 'Legacy overlay', '<p class="field-help">This decorative layer keeps its original section-overlay system for compatibility. Change its Positioning setting to Responsive content flow first to use the new Free-position mode.</p>');
  const modeControl = `<label class="field"><span class="field-label">Positioning mode</span><select class="select-input" data-transform-mode><option value="flow"${positioning.mode === 'flow' ? ' selected' : ''}>Flow · responsive layout</option><option value="free"${positioning.mode === 'free' ? ' selected' : ''}>Free position · absolute</option></select></label>`;
  if (positioning.mode !== 'free') return propGroup('Precision positioning', 'Flow is the default', `${modeControl}<p class="field-help">Flow keeps this element in Stack, Flexbox or Grid. Switch to Free position to capture its current location and move it independently inside its parent.</p><button type="button" class="wide-control" data-transform-action="to-free">Convert to Free position…</button>`);
  return propGroup('Precision positioning', viewport === 'desktop' ? 'Desktop transform' : `${viewport} transform override`, `${modeControl}<p class="field-help">Relative to: <strong>${escapeHtml(findNode(project, node.id)?.parent?.name || 'Parent content area')}</strong>. Free-positioned elements do not participate in the parent flow.</p>
    <div class="transform-fields"><label class="field"><span class="field-label">X position</span><span class="transform-value-unit"><input type="number" step="0.1" data-transform-prop="x" value="${positioning.x}"><select data-transform-prop="xUnit" aria-label="Horizontal position unit"><option value="px"${positioning.xUnit === 'px' ? ' selected' : ''}>px</option><option value="%"${positioning.xUnit === '%' ? ' selected' : ''}>%</option></select></span></label>
    <label class="field"><span class="field-label">Y position</span><span class="transform-value-unit"><input type="number" step="0.1" data-transform-prop="y" value="${positioning.y}"><select data-transform-prop="yUnit" aria-label="Vertical position unit"><option value="px"${positioning.yUnit === 'px' ? ' selected' : ''}>px</option><option value="%"${positioning.yUnit === '%' ? ' selected' : ''}>%</option></select></span></label>
    <label class="field"><span class="field-label">Width</span><input type="number" min="0" max="4000" step="1" data-transform-prop="width" value="${positioning.width || ''}" placeholder="Auto"></label>
    <label class="field"><span class="field-label">Height</span><input type="number" min="0" max="4000" step="1" data-transform-prop="height" value="${positioning.height || ''}" placeholder="Auto"></label>
    <label class="field"><span class="field-label">Rotation</span><span class="transform-value-unit"><input type="number" min="-360" max="360" step="0.5" data-transform-prop="rotation" value="${positioning.rotation}"><span>°</span></span></label>
    <label class="field"><span class="field-label">Rotation origin</span><select class="select-input" data-transform-prop="transformOrigin">${[['center','Centre'],['top left','Top left'],['top right','Top right'],['bottom left','Bottom left'],['bottom right','Bottom right']].map(([key,label]) => `<option value="${key}"${positioning.transformOrigin === key ? ' selected' : ''}>${label}</option>`).join('')}</select></label></div>
    <button type="button" class="wide-control" data-transform-action="to-flow">Return to responsive Flow</button>
    <p class="field-help">Drag the selected element to move it. Use the eight handles to resize and the top handle to rotate. Hold Shift while resizing to preserve proportions.</p>`);
}
function commitTransformProperty(input) {
  const node = findMutableNode(selectedId); if (!node || !input?.dataset?.transformProp) return;
  const key = input.dataset.transformProp; let value = input.value;
  const limits = { x: [-5000, 10000], y: [-5000, 10000], width: [0, 4000], height: [0, 4000], rotation: [-360, 360] };
  if (Object.hasOwn(limits, key)) {
    if (value.trim() === '' && ['width','height'].includes(key)) value = 0;
    else { const number = Number(value); if (!Number.isFinite(number)) { input.value = String(effectivePositioning(node)[key]); return; } value = Math.max(limits[key][0], Math.min(limits[key][1], number)); }
  } else if (key === 'xUnit' || key === 'yUnit') value = value === '%' ? '%' : 'px';
  else if (key === 'transformOrigin') value = ['center','top left','top right','bottom left','bottom right'].includes(value) ? value : 'center';
  const before = effectivePositioning(node)[key]; if (before === value) return;
  recordBeforeMutation(); setPositioningValue(node, key, value); markDirty(); renderInspector(); renderPreview();
}
function requestFreePositionConversion(node, mode) {
  if (!node || !['flow','free'].includes(mode)) return;
  if (mode === 'flow') {
    recordBeforeMutation(); node.positioning = normalizeFreePositioning({ ...node.positioning, mode: 'flow' }); markDirty(); renderAll(); showToast('Element returned to responsive Flow.'); return;
  }
  previewFrame.contentWindow?.postMessage({ type: 'canvasflow:measure-free-position', id: node.id }, '*');
}
function updateGuideSettings() {
  const list = project.page.editor?.guides || [];
  return list.map((guide) => `<div class="user-guide-row"><span class="guide-axis-pill">${guide.axis.toUpperCase()}</span><label class="guide-position-field"><span class="sr-only">Guide position</span><input type="number" step="0.5" min="-5000" max="10000" value="${guide.position}" data-guide-position="${escapeHtml(guide.id)}" ${guide.locked ? 'disabled' : ''}></label><button type="button" data-guide-action="toggle" data-guide-id="${escapeHtml(guide.id)}" title="${guide.locked ? 'Unlock' : 'Lock'} guide">${guide.locked ? 'Unlock' : 'Lock'}</button><button type="button" data-guide-action="visibility" data-guide-id="${escapeHtml(guide.id)}" title="${guide.visible ? 'Hide' : 'Show'} guide">${guide.visible ? 'Hide' : 'Show'}</button><button type="button" data-guide-action="delete" data-guide-id="${escapeHtml(guide.id)}" title="Delete guide">×</button></div>`).join('') || '<p class="field-help">No custom guides yet. Turn on Rulers and drag from the top or left ruler into the preview to create one.</p>';
}

function renderPageInspector() {
  const page = project.page;
  const fileName = pageFileLabel(page);
  inspectorContent.innerHTML = `<div class="selection-summary"><div class="selection-icon" aria-hidden="true">▤</div><div class="selection-summary-copy"><strong>Page settings</strong><small>${escapeHtml(fileName)} · ${project.pages.length} page${project.pages.length === 1 ? '' : 's'} total</small></div></div>
    ${propGroup('Page identity', 'Routes and metadata', `${fieldText('Page name', 'pageName', page.name, { maxLength: 80 })}${fieldText('URL slug', 'pageSlug', page.slug, { maxLength: 48 })}${fieldText('Browser tab title', 'pageTitle', page.title, { maxLength: 140 })}${fieldText('SEO description', 'pageDescription', page.description || '', { maxLength: 300 })}<p class="field-help">Export path: <strong>${escapeHtml(fileName)}</strong>. Keep the slug simple, lowercase, and unique.</p>`)}
    ${propGroup('Canvas', 'Background', `${fieldColor('Background colour', 'pageBackgroundColor', page.backgroundColor || '#ffffff')}<p class="field-help">This colour fills the page behind your sections. On a blank page, it becomes the entire visible canvas and is included in the exported website.</p><div class="page-background-presets" role="group" aria-label="Background colour presets">${[['#ffffff', 'White'], ['#f4f1ff', 'Lavender'], ['#f3f6fa', 'Soft grey'], ['#10131d', 'Midnight'], ['#fff7e8', 'Warm ivory']].map(([color, label]) => `<button type="button" data-page-bg="${color}" title="${label}" aria-label="${label} background" style="--swatch:${color}"></button>`).join('')}</div>`)}
    ${propGroup('Canvas precision', 'Grid and snapping', `${fieldNumber('Grid interval', 'editorGridStep', page.editor?.gridStep || 16, 4, 128)}<div class="snap-settings-grid">${[['grid','Snap to grid'],['parent','Parent edges and centre'],['siblings','Sibling edges and centre'],['guides','User guides'],['equalSpacing','Equal spacing opportunities'],['horizontal','Horizontal snapping'],['vertical','Vertical snapping']].map(([key,label]) => `<label><input type="checkbox" data-snap-setting="${key}"${page.editor?.snap?.[key] ? ' checked' : ''}>${label}</label>`).join('')}</div>`)}
    ${propGroup('Ruler guides', `${page.editor?.guides?.length || 0} custom guides`, `<div class="user-guide-list">${updateGuideSettings()}</div><button type="button" class="wide-control" data-guide-action="clear-all" ${page.editor?.guides?.length ? '' : 'disabled'}>Clear all guides on this page</button><p class="field-help">Custom guides are saved in the editable project but never included in the exported website.</p>`)}
    <div class="inspector-note"><strong>Page-specific settings</strong>Design tokens are shared across the whole project. Navigation and footer settings are managed once for every page using Shared site chrome.</div>`;
}

function interactionControls(node) {
  const action = node.interaction?.action || 'none';
  const targetId = node.interaction?.targetId || '';
  const options = project.page.sections.map((section) => [section.anchor, section.name]).filter(([id]) => /^[A-Za-z0-9_-]{1,64}$/.test(id));
  return `${fieldSelect('On click', 'interactionAction', action, [['none', 'No action'], ['scroll', 'Scroll to section'], ['show', 'Show section'], ['hide', 'Hide section'], ['toggle', 'Toggle section visibility']])}<label class="field"><span class="field-label">Target section</span><select class="select-input" data-interaction-target><option value="">Choose target…</option>${options.map(([id, name]) => `<option value="${escapeHtml(id)}"${id === targetId ? ' selected' : ''}>${escapeHtml(name)}</option>`).join('')}</select></label><p class="field-help">Choose a section in this page. Show/hide/toggle updates its hidden state; scroll moves smoothly unless reduced motion is enabled.</p>`;
}
function renderComponentInspector(instance) {
  const definition = project.components.find((item) => item.id === instance.componentId);
  if (!definition) { inspectorContent.innerHTML = `${inspectorHeader(instance, 'Component', '◈')}<p class="field-help">This instance references a missing component. Open Component Studio to repair it.</p>`; return; }
  const template = definition.template;
  const variantOptions = Object.keys(definition.variants).map((key) => [key, key.replace(/[-_]/g, ' ').replace(/^./, (char) => char.toUpperCase())]);
  const overrideFields = template.type === 'heading' || template.type === 'paragraph'
    ? `<label class="field"><span class="field-label">Instance text override</span><textarea data-component-override="text" maxlength="400">${escapeHtml(instance.overrides?.text ?? '')}</textarea></label>`
    : template.type === 'button' ? `<label class="field"><span class="field-label">Instance button label</span><input data-component-override="text" maxlength="200" value="${escapeHtml(instance.overrides?.text ?? '')}"></label><label class="field"><span class="field-label">Instance link destination</span><input data-component-override="href" maxlength="500" value="${escapeHtml(instance.overrides?.href ?? '')}" placeholder="Inherit from shared master"></label>`
      : template.type === 'card' ? `<label class="field"><span class="field-label">Instance title</span><input data-component-override="title" maxlength="160" value="${escapeHtml(instance.overrides?.title ?? '')}"></label><label class="field"><span class="field-label">Instance description</span><textarea data-component-override="body" maxlength="1200">${escapeHtml(instance.overrides?.body ?? '')}</textarea></label>`
        : template.type === 'image' ? `<label class="field"><span class="field-label">Instance alternative text</span><input data-component-override="alt" maxlength="250" value="${escapeHtml(instance.overrides?.alt ?? '')}"></label>` : '<p class="field-help">This component has shared properties only. Edit its master to update every instance.</p>';
  inspectorContent.innerHTML = `${inspectorHeader(instance, 'Linked component instance', '◈')}${layerControls(instance)}
    ${propGroup('Component', definition.name, `${fieldSelect('Visual variant', 'componentVariant', instance.variant, variantOptions)}<p class="field-help">Master edits update all linked instances. Variants change the visual treatment without breaking the link.</p>${overrideFields}`)}
    <div class="selection-actions"><button type="button" data-component-action="edit">Edit shared master</button><button type="button" data-component-action="detach">Detach this instance</button></div>
    <div class="inspector-note"><strong>Linked instance</strong>Content overrides belong only to this instance. Appearance, dimensions and structure stay connected to the shared master. Edit the master for shared sizing, or detach this instance for independent canvas resizing and positioning.</div>`;
}

function renderInspector() {
  if (selectedId === PAGE_SELECTION_ID) { renderPageInspector(); return; }
  const multiNodes = getSelectedNodes();
  if (multiNodes.length > 1) { renderMultiInspector(multiNodes); return; }
  const { node: sourceNode } = activeSelection(); if (!sourceNode) return;
  if (sourceNode.type === 'component') { renderComponentInspector(sourceNode); return; }
  const node = new Proxy(sourceNode, { get(target, prop, receiver) {
    if (typeof prop === 'string') return getEffectiveValue(target, prop);
    return Reflect.get(target, prop, receiver);
  } });
  if (node.type === 'section') {
    const index = project.page.sections.findIndex((section) => section.id === node.id);
    inspectorContent.innerHTML = `${inspectorHeader(node, 'Section', '▧')}${responsiveStatus(sourceNode)}${layerControls(node)}
      ${propGroup('Section order', `${index + 1} of ${project.page.sections.length}`, `<div class="section-actions"><button type="button" data-section-action="up" ${index === 0 ? 'disabled' : ''}>↑ Move up</button><button type="button" data-section-action="down" ${index === project.page.sections.length - 1 ? 'disabled' : ''}>↓ Move down</button><button type="button" data-section-action="duplicate">▣ Duplicate</button><button type="button" data-section-action="delete" ${project.page.sections.length <= 1 ? 'disabled' : ''}>⌫ Delete</button></div>`)}
      ${propGroup('Layout engine', viewport === 'desktop' ? 'Base layout' : `${viewport} layout override`, `${fieldSelect('Layout mode', 'layout', node.layout || 'stack', [['stack', 'Stack · vertical'], ['flex', 'Flexbox · flow row/column'], ['grid', 'Grid · responsive columns'], ['two-column', 'Legacy · two columns']])}${node.layout === 'flex' ? `<div class="layout-control-subgroup"><strong>Flexbox controls</strong>${fieldSelect('Direction', 'flexDirection', node.flexDirection || 'row', [['row','Row'],['row-reverse','Row · reversed'],['column','Column'],['column-reverse','Column · reversed']])}${fieldSelect('Wrapping', 'flexWrap', node.flexWrap || 'wrap', [['wrap','Wrap onto next line'],['nowrap','Keep on one line']])}${fieldSelect('Main-axis distribution', 'justifyContent', node.justifyContent || 'start', [['start','Start'],['center','Centre'],['end','End'],['space-between','Space between'],['space-around','Space around'],['space-evenly','Space evenly']])}${fieldSelect('Cross-axis alignment', 'alignItems', node.alignItems || 'stretch', [['start','Start'],['center','Centre'],['end','End'],['stretch','Stretch']])}</div>` : ''}${node.layout === 'grid' ? `<div class="layout-control-subgroup"><strong>Grid controls</strong>${fieldSelect('Column sizing', 'gridMode', node.gridMode || 'fixed', [['fixed','Fixed column count'],['auto-fit','Auto-fit to available width']])}${node.gridMode === 'auto-fit' ? fieldNumber('Minimum card width', 'gridMinColumnWidth', node.gridMinColumnWidth || 240, 120, 480) : fieldNumber('Columns', 'gridColumns', node.gridColumns || 3, 1, 6)}${fieldSelect('Item alignment', 'alignItems', node.alignItems || 'stretch', [['start','Start'],['center','Centre'],['end','End'],['stretch','Stretch']])}</div>` : ''}${['stack', 'two-column'].includes(node.layout) ? fieldSelect('Content alignment', 'contentAlign', node.contentAlign || 'center', [['center', 'Centered'], ['left', 'Left aligned']]) : ''}${fieldRange('Element gap', 'gap', node.gap || 24, 4, 96)}`)}
      ${propGroup('Appearance', 'Section', `${fieldText('Section name', 'name', node.name, { maxLength: 80 })}${fieldText('Anchor ID', 'anchor', node.anchor, { maxLength: 64 })}${fieldColor('Background colour', 'backgroundColor', node.backgroundColor)}${fieldRange('Vertical padding', 'paddingY', node.paddingY, 24, 200)}${fieldNumber('Content maximum width', 'maxWidth', node.maxWidth, 320, 1200)}`)}
      <div class="inspector-note"><strong>Responsive layout engine</strong>Flexbox and Grid settings export as real CSS. Switch to Tablet or Mobile to create independent breakpoint overrides; unset values inherit from the next wider size.</div>`;
    return;
  }
  if (node.type === 'container') {
    const presetOptions = [['', 'Choose a layout preset…'], ['preset-row', 'Balanced row'], ['preset-sidebar', 'Two-column content'], ['preset-cards', 'Three-column cards'], ['preset-centered', 'Centered stack'], ['preset-split', 'Balanced split'], ...(project.layoutPresets || []).map((preset) => [preset.id, `${preset.name} · Saved`])];
    const layoutControls = `${fieldSelect('Layout mode', 'layout', node.layout || 'flex', [['stack','Stack · vertical'],['flex','Flexbox · nested flow'],['grid','Grid · columns']])}${node.layout === 'flex' ? `<div class="layout-control-subgroup"><strong>Flexbox</strong>${fieldSelect('Direction', 'flexDirection', node.flexDirection || 'row', [['row','Row'],['row-reverse','Row · reversed'],['column','Column'],['column-reverse','Column · reversed']])}${fieldSelect('Wrapping', 'flexWrap', node.flexWrap || 'wrap', [['wrap','Wrap'],['nowrap','No wrap']])}${fieldSelect('Main-axis distribution', 'justifyContent', node.justifyContent || 'start', [['start','Start'],['center','Centre'],['end','End'],['space-between','Space between'],['space-around','Space around'],['space-evenly','Space evenly']])}</div>` : ''}${node.layout === 'grid' ? `<div class="layout-control-subgroup"><strong>Grid</strong>${fieldSelect('Column sizing', 'gridMode', node.gridMode || 'fixed', [['fixed','Fixed columns'],['auto-fit','Auto-fit columns']])}${node.gridMode === 'auto-fit' ? fieldNumber('Minimum column width', 'gridMinColumnWidth', node.gridMinColumnWidth, 120, 480) : fieldNumber('Columns', 'gridColumns', node.gridColumns, 1, 6)}</div>` : ''}${fieldSelect('Cross-axis alignment', 'alignItems', node.alignItems || 'stretch', [['start','Start'],['center','Centre'],['end','End'],['stretch','Stretch']])}${fieldNumber('General gap', 'gap', node.gap, 0, 120)}<div class="split-fields">${fieldNumber('Row gap', 'rowGap', node.rowGap, 0, 120)}${fieldNumber('Column gap', 'columnGap', node.columnGap, 0, 120)}</div>`;
    const spacingControls = `<div class="component-edit-grid">${fieldNumber('All-side padding', 'padding', node.padding, 0, 120)}${fieldNumber('Horizontal padding', 'paddingX', node.paddingX, 0, 120)}${fieldNumber('Vertical padding', 'paddingY', node.paddingY, 0, 120)}${fieldNumber('Maximum width', 'maxWidth', node.maxWidth, 120, 1200)}${fieldNumber('Minimum height', 'minHeight', node.minHeight, 0, 1000)}${fieldNumber('Corner radius', 'borderRadius', node.borderRadius, 0, 64)}</div>`;
    inspectorContent.innerHTML = `${inspectorHeader(node, 'Nested layout container', '▤')}${responsiveStatus(sourceNode)}${elementActions(node)}${layerControls(node)}${positioningControls(sourceNode)}${propGroup('Layout presets', 'Reusable', `<label class="field"><span class="field-label">Apply a preset</span><select class="select-input" data-layout-preset-select>${presetOptions.map(([key,label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join('')}</select></label><div class="layout-preset-actions"><button type="button" data-layout-preset-action="apply">Apply preset</button><button type="button" data-layout-preset-action="save">Save current</button><button type="button" data-layout-preset-action="delete">Delete saved</button></div><p class="field-help">Presets store layout, gap, width, padding and surface styling in this project. You can reuse them on any container.</p>`)}${propGroup('Layout engine', viewport === 'desktop' ? 'Base layout' : `${viewport} layout override`, layoutControls)}${propGroup('Spacing & size', 'Precise controls', spacingControls)}${propGroup('Appearance', 'Container surface', `${fieldColor('Background', 'backgroundColor', node.backgroundColor)}${fieldColor('Border', 'borderColor', node.borderColor)}`)}<div class="inspector-note"><strong>Nested layout</strong>Add elements while this container is selected to place them inside it. Containers can be nested up to four levels and export as real responsive HTML and CSS.</div>`;
    return;
  }

  const heading = node.type === 'heading' ? 'Heading' : node.type === 'paragraph' ? 'Paragraph' : node.type === 'button' ? 'Button / link' : node.type === 'image' ? 'Image' : node.type === 'card' ? 'Card' : node.type === 'divider' ? 'Divider' : node.type === 'vector' ? 'Vector path' : node.type === 'container' ? 'Layout container' : 'Shape';
  inspectorContent.innerHTML = `${inspectorHeader(node, heading, nodeSymbol(node))}${responsiveStatus(sourceNode)}${elementActions(node)}${layerControls(node)}${positioningControls(sourceNode)}${propGroup('Arrange', 'Position in layout', alignControls(node.alignSelf || 'auto'))}`;
  if (node.type === 'heading' || node.type === 'paragraph') {
    inspectorContent.insertAdjacentHTML('beforeend', `${propGroup('Content', 'Text', `${fieldText('Text content', 'text', node.text, { multiline: true, maxLength: node.type === 'heading' ? 400 : 2000 })}${node.type === 'heading' ? fieldSelect('Heading level', 'level', String(node.level), [['1', 'H1 · Page title'], ['2', 'H2 · Section title'], ['3', 'H3 · Subheading']]) : ''}`)}
      ${propGroup('Typography', '', `${fieldColor('Text colour', 'color', node.color)}<div class="split-fields">${fieldNumber('Font size', 'fontSize', node.fontSize, node.type === 'heading' ? 22 : 14, node.type === 'heading' ? 84 : 32)}${fieldNumber('Maximum text width', 'maxWidth', node.maxWidth, 120, 1200)}</div>${fieldWeight(node.fontWeight)}${fieldFontFamily(node.fontFamily)}${fieldAlignment(node.textAlign)}<p class="field-help">For separate tablet and mobile sizes, switch the canvas viewport above and change Font size. Each breakpoint saves its own override.</p>`)}
      ${propGroup('Motion', 'Studio', motionControls(node))}
      <div class="inspector-note"><strong>Real text, real code</strong>This exports as semantic HTML text with readable, editable CSS.</div>`);
  } else if (node.type === 'button') {
    inspectorContent.insertAdjacentHTML('beforeend', `${propGroup('Content', 'Link', `${fieldText('Button label', 'text', node.text, { maxLength: 200 })}${pageLinkField(node)}${fieldText('Link destination', 'href', node.href.startsWith('@page:') ? '' : node.href, { maxLength: 500 })}<p class="field-help">Use a URL or page anchor here, for example https://example.com or #contact.</p>`)}
      ${propGroup('Appearance', '', `${fieldColor('Button colour', 'backgroundColor', node.backgroundColor)}${fieldColor('Label colour', 'textColor', node.textColor)}<div class="split-fields">${fieldNumber('Font size', 'fontSize', node.fontSize, 12, 26)}${fieldNumber('Corner radius', 'borderRadius', node.borderRadius, 0, 36)}</div>${fieldNumber('Fixed width', 'width', node.width || 0, 0, 1200)}<p class="field-help">Use 0 for natural content width. You can also drag the canvas handle to resize.</p>${fieldWeight(node.fontWeight)}`)}
      ${propGroup('Interactive states', 'Hover · focus · press', `${fieldColor('Hover background', 'hoverBackgroundColor', node.hoverBackgroundColor)}${fieldColor('Hover label', 'hoverTextColor', node.hoverTextColor)}${fieldColor('Keyboard focus outline', 'focusOutlineColor', node.focusOutlineColor)}${fieldRange('Pressed scale', 'activeScale', Math.round((node.activeScale || .98) * 100), 94, 100, '%')}`)}
      ${propGroup('Click interaction', 'No custom code', `${interactionControls(node)}`)}
      ${propGroup('Motion', 'Studio', motionControls(node))}
      <div class="inspector-note"><strong>Safe interactions</strong>Actions are generated from a small allowlist and work in preview and exported HTML. No arbitrary scripts are executed.</div>`);
  } else if (node.type === 'image') {
    const imageSrc = node.assetId ? (project.assets.find((asset) => asset.id === node.assetId)?.dataUrl || '') : node.src;
    const selectedAsset = node.assetId ? project.assets.find((asset) => asset.id === node.assetId) : null;
    const thumbnail = imageSrc ? `<img class="image-property-thumb" src="${escapeHtml(imageSrc)}" alt="">` : `<div class="image-property-placeholder">▧<span>No image yet</span></div>`;
    const assetCaption = selectedAsset ? `<p class="asset-linked-caption">Library asset · ${escapeHtml(selectedAsset.name)}</p>` : '<p class="asset-linked-caption">Legacy embedded image</p>';
    inspectorContent.insertAdjacentHTML('beforeend', `${propGroup('Asset', 'Reusable library', `${thumbnail}${assetCaption}<div class="image-asset-actions"><button type="button" class="wide-control" data-node-action="replace-image">Upload new…</button><button type="button" class="wide-control" data-node-action="choose-library-asset">Choose from library…</button></div>${fieldText('Alternative text', 'alt', node.alt, { maxLength: 250 })}<p class="field-help">Images and safe SVGs are stored once in the project library and can be reused across pages.</p>`)}
      ${propGroup('Crop and sizing', '', `${fieldNumber('Maximum width', 'maxWidth', node.maxWidth, 120, 1200)}${fieldNumber('Frame height', 'height', node.height, 120, 720)}${fieldNumber('Corner radius', 'borderRadius', node.borderRadius, 0, 48)}${fieldSelect('Image fit', 'objectFit', node.objectFit, [['cover', 'Cover / crop'], ['contain', 'Contain entire image']])}${cropPresetControl(node.objectPosition || '50% 50%')}${focalPointPicker(node.objectPosition || '50% 50%')}${cropPositionControls(node.objectPosition || '50% 50%')}<p class="field-help">Presets are starting points. Fine-tune horizontal and vertical focal position; the same crop is used in preview and export. Tablet/mobile can override the focal point independently.</p>`)}
      ${propGroup('Motion', 'Studio', motionControls(node))}`);
  } else if (node.type === 'card') {
    inspectorContent.insertAdjacentHTML('beforeend', `${propGroup('Content', '', `${fieldText('Card title', 'title', node.title, { maxLength: 160 })}${fieldText('Card description', 'body', node.body, { multiline: true, maxLength: 1200 })}`)}
      ${propGroup('Appearance', '', `${fieldColor('Card background', 'backgroundColor', node.backgroundColor)}${fieldColor('Text colour', 'color', node.color)}${fieldColor('Border colour', 'borderColor', node.borderColor)}<div class="split-fields">${fieldNumber('Corner radius', 'borderRadius', node.borderRadius, 0, 40)}${fieldNumber('Inner padding', 'padding', node.padding, 12, 48)}</div>${fieldNumber('Maximum width', 'maxWidth', node.maxWidth, 120, 1200)}`)}
      ${propGroup('Motion', 'Studio', motionControls(node))}`);
  } else if (node.type === 'divider') {
    inspectorContent.insertAdjacentHTML('beforeend', `${propGroup('Appearance', '', `${fieldColor('Line colour', 'color', node.color)}${fieldNumber('Width', 'width', node.width, 20, 100, '%')}${fieldNumber('Thickness', 'height', node.height, 1, 12)}`)}${propGroup('Motion', 'Studio', motionControls(node))}`);
  } else if (node.type === 'shape') {
    const overlayFields = node.positionMode === 'overlay'
      ? `<div class="split-fields">${fieldNumber('Horizontal position', 'xPercent', node.xPercent, 0, 100, '%')}${fieldNumber('Vertical position', 'yPercent', node.yPercent, 0, 100, '%')}</div>${fieldNumber('Layer order', 'zIndex', node.zIndex, 0, 100, 'level')}<div class="overlay-order-actions"><button type="button" data-node-action="layer-back">Send to back</button><button type="button" data-node-action="layer-down">Lower one</button><button type="button" data-node-action="layer-up">Raise one</button><button type="button" data-node-action="layer-front">Bring to front</button></div><p class="field-help">Coordinates are percentages of the section. On tablet or mobile, change these values to create a responsive position override.</p>${node.groupId ? '<button type="button" class="wide-control" data-node-action="ungroup">Ungroup decorative shapes</button>' : ''}`
      : '<p class="field-help">Flow shapes participate in the responsive content layout. Choose Decorative overlay to position this shape without changing the content flow.</p>';
    inspectorContent.insertAdjacentHTML('beforeend', `${propGroup('Shape', 'Decorative', `${fieldSelect('Positioning', 'positionMode', node.positionMode || 'flow', [['flow', 'Responsive content flow'], ['overlay', 'Decorative overlay']])}<div class="field"><span class="field-label">Shape palette</span>${shapePalette(node.shapeKind)}</div>${fieldColor('Fill colour', 'backgroundColor', node.backgroundColor)}<div class="split-fields">${fieldNumber('Width', 'width', node.width, 24, 600)}${fieldNumber('Height', 'height', node.height, 24, 600)}</div>${['circle', 'pill', 'ring', 'triangle', 'diamond', 'hexagon', 'star'].includes(node.shapeKind) ? '' : fieldNumber('Corner radius', 'borderRadius', node.borderRadius, 0, 100)}${overlayFields}`)}${propGroup('Motion', 'Studio', motionControls(node))}<p class="field-help">Decorative overlays stay in their section and do not control the page layout. Group multiple overlays to move them together.</p>`);
  } else if (node.type === 'vector') {
    const points = node.points || [];
    const anchorFields = points.slice(0, 24).map((point, index) => {
      const handles = node.vectorKind === 'bezier' ? `<details class="vector-handle-details"><summary>Curve handles</summary><div class="vector-handle-grid">${[['inX','In X',1000],['inY','In Y',600],['outX','Out X',1000],['outY','Out Y',600]].map(([axis, label, max]) => `<label>${label}<input type="number" min="0" max="${max}" step="1" value="${point[axis] ?? ''}" placeholder="Auto" data-vector-point="${index}" data-vector-axis="${axis}" aria-label="Anchor ${index + 1} ${label} curve handle"></label>`).join('')}</div><p class="field-help">Leave a handle blank to use the automatic smooth curve.</p></details>` : '';
      return `<div class="vector-anchor-card"><div class="vector-anchor-row"><strong>Anchor ${index + 1}</strong><label>X <input type="number" min="0" max="1000" step="1" value="${point.x}" data-vector-point="${index}" data-vector-axis="x" aria-label="Anchor ${index + 1} horizontal coordinate"></label><label>Y <input type="number" min="0" max="600" step="1" value="${point.y}" data-vector-point="${index}" data-vector-axis="y" aria-label="Anchor ${index + 1} vertical coordinate"></label><button type="button" data-vector-remove="${index}" title="Remove anchor" ${points.length <= 2 ? 'disabled' : ''}>×</button></div>${handles}</div>`;
    }).join('');
    const anchorNote = points.length > 24 ? `<p class="field-help">Showing the first 24 of ${points.length} anchors. Simplify the path to make individual anchors easier to edit.</p>` : '';
    inspectorContent.insertAdjacentHTML('beforeend', `${propGroup('Vector geometry', node.vectorKind, `${fieldSelect('Path type', 'vectorKind', node.vectorKind, [['freehand', 'Freehand'], ['bezier', 'Bézier curve'], ['line', 'Line'], ['rect', 'Rectangle'], ['ellipse', 'Ellipse']])}<div class="split-fields">${fieldNumber('Width', 'width', node.width, 24, 600)}${fieldNumber('Height', 'height', node.height, 24, 600)}</div>${fieldSelect('Path closure', 'closed', node.closed ? 'true' : 'false', [['false', 'Open path'], ['true', 'Closed / filled']])}<p class="field-help">The vector uses a scalable 1000 × 600 coordinate space. Resize it without losing path detail.</p>`)}${propGroup('Fill and stroke', '', `${fieldColor('Fill colour', 'fillColor', node.fillColor)}${fieldColor('Stroke colour', 'strokeColor', node.strokeColor)}${fieldNumber('Stroke thickness', 'strokeWidth', node.strokeWidth, 0, 40)}`)}${node.positionMode === 'overlay' ? propGroup('Canvas position', 'Section-relative', `<div class="split-fields">${fieldNumber('Horizontal position', 'xPercent', node.xPercent, 0, 100, '%')}${fieldNumber('Vertical position', 'yPercent', node.yPercent, 0, 100, '%')}</div>${fieldNumber('Layer order', 'zIndex', node.zIndex, 0, 100, 'level')}`) : ''}${propGroup('Path anchors', `${points.length} points`, `${anchorFields}${anchorNote}<div class="vector-anchor-actions"><button type="button" data-vector-add-anchor ${points.length >= 80 ? 'disabled' : ''}>＋ Add anchor</button><button type="button" data-vector-reset-anchors>Reset anchors</button></div>`)}<button type="button" class="wide-control" data-vector-export>↓ Download standalone SVG</button>${propGroup('Motion', 'Studio', motionControls(node))}<div class="inspector-note"><strong>True SVG vector</strong>Scales cleanly and exports as inline SVG path markup—not a raster image.</div>`);
  }
}

function renderPreview() {
  const previewSelection = selectedId === PAGE_SELECTION_ID ? null : (activeSelection().node?.id || selectedId);
  const previewOptions = { showGuides, selectedIds, userGuides: project.page.editor?.guides || [], editorZoom: canvasZoom, gridStep: project.page.editor?.gridStep || 16, snapSettings: project.page.editor?.snap || {} };
  previewOptions.vectorTool = vectorTool;
  if (emptyCanvasState) emptyCanvasState.hidden = project.page.sections.length !== 0;
  if (previewStatusText) {
    previewStatusText.textContent = 'Updating preview…';
    previewStatusText.parentElement?.setAttribute('data-state', 'updating');
  }
  previewFrame.setAttribute('aria-busy', 'true');
  previewFrame.srcdoc = generatePreviewDocument(project, previewSelection, viewport, previewOptions);
}
function pageFileLabel(page) { return project.pages?.[0]?.id === page.id ? 'index.html' : `${page.slug}.html`; }
function renderPageManager() {
  if (!pageList) return;
  pageList.innerHTML = '';
  const pages = Array.isArray(project.pages) ? project.pages : [project.page];
  pages.forEach((page, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `page-list-item${page.id === project.page.id ? ' active' : ''}`;
    button.dataset.pageId = page.id; button.setAttribute('aria-current', page.id === project.page.id ? 'page' : 'false');
    button.innerHTML = `<span class="page-list-number">${String(index + 1).padStart(2, '0')}</span><span class="page-list-copy"><strong>${escapeHtml(page.name)}</strong><small>${escapeHtml(pageFileLabel(page))}</small></span>${page.id === project.page.id ? '<span class="page-list-active">EDITING</span>' : ''}`;
    pageList.append(button);
  });
  const count = document.querySelector('#pageCountLabel');
  if (count) count.textContent = `${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`;
  const deleteButton = document.querySelector('#deletePageBtn');
  if (deleteButton) deleteButton.disabled = pages.length <= 1;
}
function activatePage(pageId, { save = true } = {}) {
  if (activeWorkspacePanel === 'structure') setWorkspacePanel(null);
  const page = project.pages.find((item) => item.id === pageId);
  if (!page || page.id === project.page.id) return;
  project.page = page; project.activePageId = page.id;
  const firstId = page.sections[0]?.children[0]?.id || page.sections[0]?.id || PAGE_SELECTION_ID;
  setSelectionState(firstId, firstId === PAGE_SELECTION_ID ? [] : [firstId]);
  if (save) markDirty();
  renderAll();
}
function createPage() {
  if (project.pages.length >= 20) { showToast('A project can contain up to 20 pages in this version.', 'error'); return; }
  recordBeforeMutation();
  const number = project.pages.length + 1;
  const name = `New page ${number}`;
  const base = slugify(name); let slug = base; let suffix = 2;
  while (project.pages.some((page) => page.slug === slug)) slug = `${base}-${suffix++}`;
  const page = { id: `page-${crypto.randomUUID?.().replaceAll('-', '').slice(0, 12) || Math.random().toString(36).slice(2, 14)}`, name, slug, title: `${name} | ${project.name}`, description: '', backgroundColor: '#ffffff', sections: [], designTokens: { backgroundColor: 'page' } };
  project.pages.push(page); project.siteChrome.navigationEnabled = true; project.siteChrome.footerEnabled = true;
  project.page = page; project.activePageId = page.id; setSelectionState(PAGE_SELECTION_ID, []);
  markDirty(); renderAll(); showToast('New page created. It is now linked in the shared site navigation and footer.');
}
function duplicateCurrentPage() {
  if (project.pages.length >= 20) { showToast('A project can contain up to 20 pages in this version.', 'error'); return; }
  recordBeforeMutation();
  const copy = JSON.parse(JSON.stringify(project.page));
  copy.id = `page-${crypto.randomUUID?.().replaceAll('-', '').slice(0, 12) || Math.random().toString(36).slice(2, 14)}`;
  copy.name = `${project.page.name} copy`.slice(0, 80); copy.slug = `${project.page.slug}-copy`.slice(0, 48);
  const visitNodes = (nodes, callback) => (nodes || []).forEach((node) => { callback(node); if (node.type === 'container') visitNodes(node.children, callback); });
  for (const section of copy.sections) visitNodes(section.children, (node) => { if (node.type === 'button' && node.href === `@page:${project.page.id}`) node.href = `@page:${copy.id}`; });
  let slug = copy.slug; let suffix = 2; while (project.pages.some((page) => page.slug === slug)) slug = `${copy.slug}-${suffix++}`; copy.slug = slug;
  copy.title = `${copy.name} | ${project.name}`;
  for (const section of copy.sections) { section.id = `section-${crypto.randomUUID?.().replaceAll('-', '').slice(0, 12) || Math.random().toString(36).slice(2, 14)}`; visitNodes(section.children, (node) => { node.id = `node-${crypto.randomUUID?.().replaceAll('-', '').slice(0, 12) || Math.random().toString(36).slice(2, 14)}`; }); }
  project.pages.push(copy); project.page = copy; project.activePageId = copy.id;
  setSelectionState(copy.sections[0]?.children[0]?.id || copy.sections[0]?.id || PAGE_SELECTION_ID, copy.sections[0]?.children[0]?.id ? [copy.sections[0].children[0].id] : []);
  markDirty(); renderAll(); showToast('Page duplicated with its sections and design styles.');
}
function deleteCurrentPage() {
  if (project.pages.length <= 1) { showToast('A website must keep at least one page.', 'error'); return; }
  if (!window.confirm(`Delete “${project.page.name}”? This removes the page and its content from the project.`)) return;
  recordBeforeMutation(); const oldIndex = project.pages.findIndex((page) => page.id === project.page.id);
  project.pages = project.pages.filter((page) => page.id !== project.page.id);
  const next = project.pages[Math.max(0, Math.min(oldIndex, project.pages.length - 1))];
  project.page = next; project.activePageId = next.id;
  const firstId = next.sections[0]?.children[0]?.id || next.sections[0]?.id || PAGE_SELECTION_ID;
  setSelectionState(firstId, firstId === PAGE_SELECTION_ID ? [] : [firstId]);
  markDirty(); renderAll(); showToast('Page deleted. Navigation and export routes were updated.');
}
function openSiteChromeDialog() {
  document.querySelector('#siteNavEnabled').checked = project.siteChrome.navigationEnabled;
  document.querySelector('#siteFooterEnabled').checked = project.siteChrome.footerEnabled;
  document.querySelector('#siteBrandName').value = project.siteChrome.brandName;
  document.querySelector('#siteFooterText').value = project.siteChrome.footerText;
  siteChromeDialog.showModal();
}

function setWorkspacePanel(panel, { focus = true } = {}) {
  const previous = activeWorkspacePanel;
  const next = ['structure', 'inspector'].includes(panel) ? panel : null;
  activeWorkspacePanel = next;
  app.classList.toggle('workspace-panel-structure-open', next === 'structure');
  app.classList.toggle('workspace-panel-inspector-open', next === 'inspector');
  for (const button of [structurePanelBtn, mobileStructureBtn]) button?.setAttribute('aria-expanded', String(next === 'structure'));
  for (const button of [inspectorPanelBtn, mobilePropertiesBtn]) button?.setAttribute('aria-expanded', String(next === 'inspector'));
  if (next && focus) {
    const target = next === 'structure' ? layerSearchInput : inspectorContent.querySelector('input,select,textarea,button,[tabindex]');
    target?.focus?.({ preventScroll: true });
  } else if (!next && previous && focus) {
    const useMobileTrigger = window.matchMedia?.('(max-width: 760px)').matches === true;
    const trigger = previous === 'structure' ? (useMobileTrigger ? mobileStructureBtn : structurePanelBtn) : (useMobileTrigger ? mobilePropertiesBtn : inspectorPanelBtn);
    trigger?.focus?.({ preventScroll: true });
  }
}
function toggleWorkspacePanel(panel) {
  setWorkspacePanel(activeWorkspacePanel === panel ? null : panel);
}
function filterInsertTools() {
  if (!insertDialog || !insertSearchInput) return;
  const query = insertSearchInput.value.trim().toLocaleLowerCase();
  let visible = 0;
  insertDialog.querySelectorAll('.insert-tool-group').forEach((group) => {
    let groupVisible = 0;
    const category = group.querySelector('.tool-group-label')?.textContent?.trim().toLocaleLowerCase() || '';
    const categoryMatches = !!query && category.includes(query);
    group.querySelectorAll('[data-insert], [data-vector-tool]').forEach((button) => {
      const matches = !query || categoryMatches || button.textContent.toLocaleLowerCase().includes(query) || (button.getAttribute('title') || '').toLocaleLowerCase().includes(query);
      button.hidden = !matches;
      if (matches) { visible += 1; groupVisible += 1; }
    });
    group.hidden = groupVisible === 0;
  });
  if (insertSearchEmpty) insertSearchEmpty.hidden = visible > 0;
}
function openInsertDialog() {
  setWorkspacePanel(null, { focus: false });
  if (!insertDialog?.open) insertDialog?.showModal();
  if (insertSearchInput) { insertSearchInput.value = ''; filterInsertTools(); requestAnimationFrame(() => insertSearchInput.focus()); }
}

function renderAll() {
  projectNameInput.value = project.name;
  pageCardName.textContent = project.page.name || 'Home page';
  document.querySelector('#pageBreadcrumb').textContent = project.page.name || 'Home page';
  const pageCardPath = document.querySelector('#pageCardPath');
  if (pageCardPath) pageCardPath.textContent = `${project.pages?.[0]?.id === project.page.id ? 'index.html' : `${project.page.slug}.html`} · page settings`;
  renderPageManager();
  pageSettingsBtn.classList.toggle('selected', selectedId === PAGE_SELECTION_ID);
  renderLayers(); renderInspector(); renderPreview(); updateViewport(); updateHistoryButtons();
}
function updateViewport() {
  const config = {
    desktop: { button: desktopBtn, label: 'DESKTOP VIEW · FLUID WIDTH', width: 'Fluid desktop preview', stage: 'desktop-stage' },
    tablet: { button: tabletBtn, label: 'TABLET VIEW · 768 PX', width: '768 px preview', stage: 'tablet-stage' },
    mobile: { button: mobileBtn, label: 'MOBILE VIEW · 390 PX', width: '390 px preview', stage: 'mobile-stage' }
  };
  for (const [key, item] of Object.entries(config)) {
    const active = customPreviewWidth === null && viewport === key;
    item.button.classList.toggle('active', active); item.button.setAttribute('aria-pressed', String(active));
  }
  previewStage.classList.remove('desktop-stage', 'tablet-stage', 'mobile-stage', 'custom-stage');
  previewStage.classList.toggle('fit-active', fitCanvasEnabled);
  previewStage.classList.toggle('hand-mode', handToolEnabled || spaceHeld);
  frameWrap.style.transformOrigin = 'top left';
  frameWrap.style.width = '';
  frameWrap.style.minWidth = '';
  frameWrap.style.maxWidth = '';
  frameWrap.style.marginBottom = '';
  frameWrap.style.marginRight = '';
  previewFrame.style.width = '';
  previewFrame.style.minWidth = '';
  if (customPreviewWidth !== null) {
    previewStage.classList.add('custom-stage');
    frameWrap.style.width = `${customPreviewWidth}px`;
    frameWrap.style.minWidth = `${customPreviewWidth}px`;
    frameWrap.style.maxWidth = 'none';
    previewFrame.style.width = `${customPreviewWidth}px`;
    previewFrame.style.minWidth = `${customPreviewWidth}px`;
    viewportLabel.textContent = `CUSTOM VIEW · ${customPreviewWidth} PX`;
    canvasWidthLabel.textContent = `Custom ${customPreviewWidth} px viewport`;
  } else {
    previewStage.classList.add(config[viewport].stage);
    viewportLabel.textContent = config[viewport].label;
    canvasWidthLabel.textContent = config[viewport].width;
  }
  fitCanvasBtn.classList.toggle('active', fitCanvasEnabled);
  fitCanvasBtn.setAttribute('aria-pressed', String(fitCanvasEnabled));
  guidesBtn.classList.toggle('active', showGuides);
  guidesBtn.setAttribute('aria-pressed', String(showGuides));
  gridBtn.classList.toggle('active', showGrid);
  gridBtn.setAttribute('aria-pressed', String(showGrid));
  previewStage.classList.toggle('show-grid', showGrid);
  rulersBtn.classList.toggle('active', showRulers);
  rulersBtn.setAttribute('aria-pressed', String(showRulers));
  frameRulerTop.hidden = !showRulers;
  frameRulerLeft.hidden = !showRulers;
  drawRulers();
  requestAnimationFrame(applyCanvasCamera);
}
function drawRulers() {
  if (!frameRulerTop || !frameRulerLeft) return;
  const width = Math.max(1, frameWrap.clientWidth || activeFrameWidth());
  const height = Math.max(1, frameWrap.clientHeight || 620);
  const xTicks = []; const yTicks = [];
  for (let x = 0; x <= width; x += 100) xTicks.push(`<span style="left:${x}px">${x}</span>`);
  for (let y = 0; y <= height; y += 100) yTicks.push(`<span style="top:${y}px">${y}</span>`);
  frameRulerTop.innerHTML = xTicks.join(''); frameRulerLeft.innerHTML = yTicks.join('');
}
function activeFrameWidth() {
  if (customPreviewWidth !== null) return customPreviewWidth;
  if (viewport === 'tablet') return 768;
  if (viewport === 'mobile') return 402; // 390 px CSS viewport plus 12 px of device-frame border
  return Math.min(1380, Math.max(320, previewStage.clientWidth - 32));
}
function applyCanvasCamera() {
  if (!frameWrap || !previewStage) return;
  const width = Math.max(1, frameWrap.offsetWidth || activeFrameWidth());
  const height = Math.max(1, frameWrap.offsetHeight || 620);
  frameWrap.style.transformOrigin = 'top left';
  frameWrap.style.transform = `translate(${Math.round(canvasPan.x)}px, ${Math.round(canvasPan.y)}px) scale(${canvasZoom})`;
  frameWrap.style.marginBottom = `${Math.round(height * (canvasZoom - 1))}px`;
  frameWrap.style.marginRight = `${Math.round(width * (canvasZoom - 1))}px`;
  frameWrap.style.transition = activePan ? 'none' : 'transform .12s ease';
  if (zoomPercentInput && document.activeElement !== zoomPercentInput) zoomPercentInput.value = String(Math.round(canvasZoom * 100));
  previewFrame.contentWindow?.postMessage({ type: 'canvasflow:set-editor-zoom', zoom: canvasZoom }, '*');
  fitCanvasBtn.classList.toggle('active', fitCanvasEnabled);
  fitCanvasBtn.setAttribute('aria-pressed', String(fitCanvasEnabled));
}
function setCanvasZoom(nextZoom, anchorX = null, anchorY = null) {
  const next = Math.max(0.25, Math.min(2, Number(nextZoom) || 1));
  if (!frameWrap || !previewStage) return;
  const stageRect = previewStage.getBoundingClientRect();
  const frameRect = frameWrap.getBoundingClientRect();
  if (anchorX === null || anchorY === null) {
    anchorX = frameRect.left + frameRect.width / 2;
    anchorY = frameRect.top + Math.min(frameRect.height / 2, 300);
  }
  const localX = (anchorX - frameRect.left) / canvasZoom;
  const localY = (anchorY - frameRect.top) / canvasZoom;
  const baseLeft = frameWrap.offsetLeft;
  const baseTop = frameWrap.offsetTop;
  canvasPan.x = anchorX - stageRect.left - baseLeft - localX * next;
  canvasPan.y = anchorY - stageRect.top - baseTop - localY * next;
  canvasZoom = next; fitCanvasEnabled = false;
  updateViewport();
}
function fitCanvasToStage() {
  const available = Math.max(180, previewStage.clientWidth - 32);
  const width = Math.max(1, frameWrap.offsetWidth || activeFrameWidth());
  canvasZoom = Math.max(0.25, Math.min(1, available / width));
  canvasPan.x = Math.max(0, (available - width * canvasZoom) / 2);
  canvasPan.y = 0; fitCanvasEnabled = true;
  applyCanvasCamera();
}
function zoomStep(direction) {
  const target = CANVAS_ZOOM_LEVELS.find((level) => direction > 0 ? level > canvasZoom * 100 + 0.5 : level < canvasZoom * 100 - 0.5);
  setCanvasZoom((target ?? (direction > 0 ? 200 : 25)) / 100);
}
function mapCameraTouchPoints(points, source) {
  if (!Array.isArray(points)) return [];
  if (source === 'iframe') {
    const rect = previewFrame.getBoundingClientRect();
    const borderX = previewFrame.clientLeft * canvasZoom;
    const borderY = previewFrame.clientTop * canvasZoom;
    return points.slice(0, 2).map((point) => ({ x: rect.left + borderX + Number(point.x) * canvasZoom, y: rect.top + borderY + Number(point.y) * canvasZoom }));
  }
  return points.slice(0, 2).map((point) => ({ x: Number(point.x), y: Number(point.y) }));
}
function beginTouchCameraGesture(points, source) {
  const mapped = mapCameraTouchPoints(points, source);
  if (mapped.length < 2) return;
  const dx = mapped[1].x - mapped[0].x; const dy = mapped[1].y - mapped[0].y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  touchCameraState = { source, startZoom: canvasZoom, startDistance: distance, startMid: { x: (mapped[0].x + mapped[1].x) / 2, y: (mapped[0].y + mapped[1].y) / 2 }, startPan: { ...canvasPan } };
}
function moveTouchCameraGesture(points, source) {
  if (!touchCameraState || touchCameraState.source !== source) return;
  const mapped = mapCameraTouchPoints(points, source);
  if (mapped.length < 2) return;
  const dx = mapped[1].x - mapped[0].x; const dy = mapped[1].y - mapped[0].y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const midpoint = { x: (mapped[0].x + mapped[1].x) / 2, y: (mapped[0].y + mapped[1].y) / 2 };
  canvasPan.x = touchCameraState.startPan.x + midpoint.x - touchCameraState.startMid.x;
  canvasPan.y = touchCameraState.startPan.y + midpoint.y - touchCameraState.startMid.y;
  applyCanvasCamera();
  setCanvasZoom(touchCameraState.startZoom * distance / touchCameraState.startDistance, midpoint.x, midpoint.y);
}
function endTouchCameraGesture(source) {
  if (touchCameraState?.source === source) touchCameraState = null;
}
function centerCanvasOnSelection() {
  if (!selectedIds.length || selectedId === PAGE_SELECTION_ID) { showToast('Select one or more elements to centre the selection.', 'error'); return; }
  previewFrame.contentWindow?.postMessage({ type: 'canvasflow:measure-selection', ids: selectedIds.slice(0, 20) }, '*');
}
function applyMeasuredSelectionCenter(message) {
  const values = [message.left, message.top, message.right, message.bottom].map(Number);
  if (!values.every(Number.isFinite)) return;
  const iframeRect = previewFrame.getBoundingClientRect();
  const centerX = iframeRect.left + (previewFrame.clientLeft + (values[0] + values[2]) / 2) * canvasZoom;
  const centerY = iframeRect.top + (previewFrame.clientTop + (values[1] + values[3]) / 2) * canvasZoom;
  const stageRect = previewStage.getBoundingClientRect();
  canvasPan.x += stageRect.left + stageRect.width / 2 - centerX;
  canvasPan.y += stageRect.top + stageRect.height / 2 - centerY;
  applyCanvasCamera();
}
function applyFitToCanvas() { if (fitCanvasEnabled) fitCanvasToStage(); else applyCanvasCamera(); }
const stageResizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (fitCanvasEnabled) fitCanvasToStage(); else applyCanvasCamera(); }) : null;
stageResizeObserver?.observe(previewStage);

function applyCustomPreviewWidth() {
  const raw = Number(customWidthInput.value);
  if (customWidthInput.value.trim() === '' || !Number.isFinite(raw)) { showToast('Enter a valid viewport width between 320 and 1920 px.', 'error'); return; }
  const width = Math.round(Math.max(320, Math.min(1920, raw)));
  customWidthInput.value = String(width);
  customPreviewWidth = width;
  viewport = width <= 760 ? 'mobile' : width <= 1024 ? 'tablet' : 'desktop';
  updateViewport(); renderInspector(); renderPreview();
  showToast(`Custom ${width} px preview enabled.`);
}

function findMutableNode(nodeId) { return findNode(project, nodeId)?.node || null; }
function changeLayerOrder(nodeId, action, targetId = null, placement = null) {
  const found = findNode(project, nodeId);
  if (!found) return false;
  if (found.parent?.locked) { showToast('Unlock the parent section before changing its layer order.', 'error'); return false; }
  const isOverlay = found.node.type === 'shape' && found.node.positionMode === 'overlay';
  const before = captureEditorState();
  let changed = false;
  if (isOverlay) changed = reorderOverlayLayer(project, nodeId, targetId, placement || action);
  else if (found.parent && ['raise', 'lower'].includes(action)) changed = moveNode(project, nodeId, action === 'raise' ? -1 : 1);
  if (!changed) { showToast('This layer is already at that stacking position.'); return false; }
  history.record(before); updateHistoryButtons();
  setSelectionState(nodeId, [nodeId]); markDirty(); renderAll();
  showToast(isOverlay ? 'Overlay stacking order updated.' : 'Element order updated.');
  return true;
}
function toggleLayerState(nodeId, action) {
  if (['raise', 'lower'].includes(action)) { changeLayerOrder(nodeId, action); return; }
  const node = findMutableNode(nodeId);
  if (!node || !['visible', 'locked'].includes(action)) return;
  recordBeforeMutation();
  if (action === 'visible') node.visible = node.visible === false;
  else node.locked = !node.locked;
  markDirty(); renderAll();
  showToast(action === 'visible' ? (node.visible ? 'Layer shown in the website.' : 'Layer hidden from the website.') : (node.locked ? 'Canvas interactions locked for this layer.' : 'Canvas lock removed.'));
}
function applySelectionLayerAction(action) {
  const targets = [...new Set(selectedIds)].map((id) => findMutableNode(id)).filter(Boolean);
  if (!targets.length || !['visible', 'locked'].includes(action)) return;
  const shouldEnable = action === 'visible' ? targets.some((node) => node.visible === false) : targets.some((node) => node.locked !== true);
  recordBeforeMutation();
  for (const node of targets) {
    if (action === 'visible') node.visible = shouldEnable;
    else node.locked = shouldEnable;
  }
  markDirty(); renderAll();
  showToast(action === 'visible' ? (shouldEnable ? 'Selected layers shown.' : 'Selected layers hidden.') : (shouldEnable ? 'Selected layers locked on canvas.' : 'Selected layers unlocked.'));
}
function duplicateSelection() {
  const found = findNode(project, selectedId);
  if (!found || found.node.locked || found.parent?.locked) return;
  recordBeforeMutation();
  if (!found.parent && found.node.type === 'section') {
    const copy = duplicateSection(project, found.node.id);
    if (!copy) return;
    setSelectionState(copy.id, [copy.id]);
  } else {
    const copy = duplicateNode(project, found.node.id);
    if (!copy) return;
    setSelectionState(copy.id, [copy.id]);
  }
  markDirty(); renderAll(); showToast('Selection duplicated.');
}
function applyAlignment(value) {
  if (!['start', 'center', 'end', 'stretch'].includes(value)) return;
  const nodes = getSelectedNodes().filter((node) => !(node.type === 'shape' && node.positionMode === 'overlay'));
  if (!nodes.length) return;
  recordBeforeMutation();
  for (const node of nodes) writeNodeProperty(node, 'alignSelf', value);
  markDirty(); renderAll(); showToast(`Aligned ${nodes.length} selected element${nodes.length === 1 ? '' : 's'}: ${value}.`);
}
function cycleDistributionGap() {
  const parent = selectionParent(); const presets = [16, 24, 32, 40, 48];
  if (!parent || !selectionIsAllSiblings()) { showToast('Select all sibling elements in one section before changing the shared gap.', 'error'); return; }
  const current = Number(getEffectiveValue(parent, 'gap'));
  const index = presets.indexOf(current);
  const next = presets[(index + 1 + presets.length) % presets.length];
  recordBeforeMutation(); writeNodeProperty(parent, 'gap', next); markDirty(); renderAll();
  showToast(`Shared section gap set to ${next} px.`);
}
function numericBounds(prop, node) {
  if (prop === 'activeScale') return [94, 100];
  if (prop === 'fontSize') return node.type === 'heading' ? [22, 84] : node.type === 'paragraph' ? [14, 32] : [12, 26];
  if (prop === 'borderRadius') return [0, ({ image: 48, button: 36, card: 40, shape: 100 })[node.type] ?? 100];
  if (prop === 'maxWidth') return node.type === 'section' ? [320, 1200] : [120, 1200];
  if (prop === 'paddingY') return node.type === 'container' ? [0, 120] : [24, 200];
  if (prop === 'paddingX') return [0, 120];
  if (prop === 'minHeight') return [0, 1000];
  if (prop === 'rowGap' || prop === 'columnGap') return [0, 120];
  if (prop === 'gap') return node.type === 'container' ? [0, 120] : [4, 96];
  if (prop === 'gridColumns') return [1, 6];
  if (prop === 'gridMinColumnWidth') return [120, 480];
  if (prop === 'padding') return node.type === 'container' ? [0, 120] : [12, 48];
  if (prop === 'width') return node.type === 'divider' ? [20, 100] : node.type === 'button' ? [0, 1200] : [24, 600];
  if (prop === 'height') return node.type === 'divider' ? [1, 12] : node.type === 'image' ? [120, 720] : [24, 600];
  if (prop === 'xPercent' || prop === 'yPercent' || prop === 'opacity') return [0, 100];
  if (prop === 'zIndex') return [0, 100];
  if (prop === 'animationDuration') return [100, 5000];
  if (prop === 'animationDelay') return [0, 3000];
  return null;
}
function allowedProperty(node, prop) {
  if (node.type === 'section') return ['name', 'anchor', 'backgroundColor', 'paddingY', 'maxWidth', 'layout', 'contentAlign', 'gap', 'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'gridMode', 'gridColumns', 'gridMinColumnWidth', 'opacity'].includes(prop);
  if (node.type === 'container') return ['name', 'backgroundColor', 'borderColor', 'borderRadius', 'padding', 'paddingX', 'paddingY', 'maxWidth', 'minHeight', 'gap', 'rowGap', 'columnGap', 'layout', 'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'gridMode', 'gridColumns', 'gridMinColumnWidth', 'opacity'].includes(prop);
  if (node.type === 'component') return ['opacity'].includes(prop);
  const common = ['animation', 'animationDuration', 'animationDelay', 'animationEasing', 'animationDirection', 'animationTrigger', 'opacity'];
  if (node.type === 'heading') return [...common, 'text', 'color', 'fontSize', 'fontWeight', 'fontFamily', 'textAlign', 'maxWidth', 'level'].includes(prop);
  if (node.type === 'paragraph') return [...common, 'text', 'color', 'fontSize', 'fontWeight', 'fontFamily', 'textAlign', 'maxWidth'].includes(prop);
  if (node.type === 'button') return [...common, 'text', 'href', 'textColor', 'backgroundColor', 'fontSize', 'fontWeight', 'borderRadius', 'width', 'hoverBackgroundColor', 'hoverTextColor', 'focusOutlineColor', 'activeScale'].includes(prop);
  if (node.type === 'image') return [...common, 'alt', 'maxWidth', 'height', 'borderRadius', 'objectFit', 'objectPosition'].includes(prop);
  if (node.type === 'card') return [...common, 'title', 'body', 'backgroundColor', 'color', 'borderColor', 'borderRadius', 'padding', 'maxWidth'].includes(prop);
  if (node.type === 'divider') return [...common, 'color', 'width', 'height'].includes(prop);
  if (node.type === 'shape') return [...common, 'shapeKind', 'backgroundColor', 'width', 'height', 'borderRadius', 'positionMode', 'xPercent', 'yPercent', 'zIndex'].includes(prop);
  if (node.type === 'vector') return [...common, 'name', 'vectorKind', 'width', 'height', 'fillColor', 'strokeColor', 'strokeWidth', 'closed', 'positionMode', 'xPercent', 'yPercent', 'zIndex'].includes(prop);
  return false;
}
function writeNodeProperty(node, prop, value) {
  if (viewport !== 'desktop' && responsiveProperties(node).includes(prop)) {
    node.responsive ||= {};
    node.responsive[viewport] ||= {};
    const inherited = getInheritedValue(node, prop, viewport);
    if (value === inherited) delete node.responsive[viewport][prop];
    else node.responsive[viewport][prop] = value;
    if (!Object.keys(node.responsive[viewport]).length) delete node.responsive[viewport];
    if (!Object.keys(node.responsive).length) node.responsive = {};
  } else {
    node[prop] = value;
    if (node.type === 'container' && prop === 'gap') { node.rowGap = value; node.columnGap = value; }
    if (node.designTokens && Object.hasOwn(node.designTokens, prop)) {
      delete node.designTokens[prop];
      if (!Object.keys(node.designTokens).length) delete node.designTokens;
    }
  }
}
function updateProperty(prop, rawValue, input) {
  if (selectedId === PAGE_SELECTION_ID) {
    const pageProp = ({ pageName: 'name', pageSlug: 'slug', pageTitle: 'title', pageDescription: 'description', pageBackgroundColor: 'backgroundColor' })[prop];
    if (!pageProp) return;
    let value = String(rawValue ?? '');
    if (pageProp === 'backgroundColor') { if (!/^#[0-9a-fA-F]{6}$/.test(value)) return; }
    else if (pageProp === 'slug') { value = slugify(value).slice(0, 48); if (!value) value = 'page'; const pageIndex = project.pages.findIndex((page) => page.id === project.page.id); if ((pageIndex > 0 && value === 'index') || project.pages.some((page) => page.id !== project.page.id && page.slug === value)) { showToast(value === 'index' ? 'The slug “index” is reserved for the home page.' : 'That URL slug is already used by another page.', 'error'); if (input) input.value = project.page.slug; return; } }
    else { value = value.trim().slice(0, pageProp === 'title' ? 140 : pageProp === 'description' ? 300 : 80) || (pageProp === 'title' ? 'My website' : pageProp === 'description' ? '' : 'Home page'); }
    if (project.page[pageProp] === value) return;
    recordBeforeMutation(input); project.page[pageProp] = value;
    if (pageProp === 'backgroundColor' && project.page.designTokens?.backgroundColor === 'page') delete project.page.designTokens.backgroundColor;
    if (pageProp === 'name') { pageCardName.textContent = value; document.querySelector('#pageBreadcrumb').textContent = value; }
    if (pageProp === 'name' || pageProp === 'slug') renderPageManager();
    if (pageProp === 'slug') { const pagePathLabel = document.querySelector('#pageCardPath'); if (pagePathLabel) pagePathLabel.textContent = `${pageFileLabel(project.page)} · page settings`; const exportPath = inspectorContent.querySelector('.field-help strong'); if (exportPath) exportPath.textContent = pageFileLabel(project.page); }
    if (input?.type === 'color') { const display = inspectorContent.querySelector(`[data-color-value="${prop}"]`); if (display) display.textContent = value.toUpperCase(); }
    markDirty(); renderPreview(); return;
  }
  const node = findMutableNode(selectedId); if (!node) return;
  if (prop === 'pageLink') { const targetId = String(rawValue || ''); const target = targetId ? project.pages.find((page) => page.id === targetId) : null; if (targetId && !target) return; const nextHref = target ? `@page:${target.id}` : (node.href.startsWith('@page:') ? '#hero' : node.href); if (node.href === nextHref) return; recordBeforeMutation(input); node.href = nextHref; markDirty(); renderInspector(); renderPreview(); return; }
  if (!allowedProperty(node, prop)) return;
  let value = rawValue;
  if (['color', 'backgroundColor', 'textColor', 'borderColor', 'fillColor', 'strokeColor'].includes(prop) && !/^#[0-9a-fA-F]{6}$/.test(value)) return;
  const bounds = numericBounds(prop, node);
  if (bounds) {
    const number = Number(value); if (!Number.isFinite(number)) return;
    value = Math.max(bounds[0], Math.min(bounds[1], Math.round(number)));
    if (input && input.type === 'number') input.value = String(value);
  }
  if (['text', 'title', 'body', 'alt', 'name', 'anchor', 'href'].includes(prop)) value = String(value).slice(0, ({ text: node.type === 'heading' ? 400 : 2000, title: 160, body: 1200, alt: 250, name: 80, anchor: 64, href: 500 })[prop] || 2000);
  if (prop === 'href') { value = value.trim(); const pageLinkSelect = inspectorContent.querySelector('[data-prop="pageLink"]'); if (pageLinkSelect && !value.startsWith('@page:')) pageLinkSelect.value = ''; }
  if (prop === 'anchor') {
    value = value.trim();
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(value)) return;
    if (project.page.sections.some((section) => section.id !== node.id && section.anchor === value)) {
      showToast('Another section already uses that anchor ID.', 'error');
      if (input) input.value = node.anchor;
      return;
    }
  }
  if (prop === 'fontWeight') value = ['400', '500', '600', '650', '700', '750', '800'].includes(String(value)) ? String(value) : '400';
  if (prop === 'fontFamily') value = ['system', 'serif', 'rounded', 'humanist', 'mono'].includes(value) ? value : 'system';
  if (prop === 'textAlign') value = ['left', 'center', 'right'].includes(value) ? value : 'center';
  if (prop === 'animation') value = ['none', 'fade', 'rise', 'slide-left', 'slide-right', 'zoom', 'blur'].includes(value) ? value : 'none';
  if (prop === 'animationEasing') value = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'smooth'].includes(value) ? value : 'smooth';
  if (prop === 'animationDirection') value = ['normal', 'reverse', 'alternate'].includes(value) ? value : 'normal';
  if (prop === 'animationTrigger') value = ['load', 'viewport', 'hover'].includes(value) ? value : 'load';
  if (prop === 'layout') value = ['stack', 'two-column', 'grid', 'flex'].includes(value) ? value : 'stack';
  if (prop === 'flexDirection') value = ['row', 'row-reverse', 'column', 'column-reverse'].includes(value) ? value : 'row';
  if (prop === 'flexWrap') value = ['wrap', 'nowrap'].includes(value) ? value : 'wrap';
  if (prop === 'justifyContent') value = ['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'].includes(value) ? value : 'start';
  if (prop === 'alignItems') value = ['start', 'center', 'end', 'stretch'].includes(value) ? value : 'stretch';
  if (prop === 'gridMode') value = ['fixed', 'auto-fit'].includes(value) ? value : 'fixed';
  if (prop === 'contentAlign') value = ['left', 'center'].includes(value) ? value : 'center';
  if (prop === 'level') value = ['1', '2', '3', 1, 2, 3].includes(value) ? Number(value) : 2;
  if (prop === 'shapeKind') value = ['rectangle', 'circle', 'pill', 'triangle', 'diamond', 'hexagon', 'star', 'ring'].includes(value) ? value : 'rectangle';
  if (prop === 'vectorKind') value = ['rect', 'ellipse', 'line', 'freehand', 'bezier'].includes(value) ? value : 'freehand';
  if (prop === 'closed') value = value === true || value === 'true';
  if (prop === 'strokeWidth') value = Math.max(0, Math.min(40, Math.round(Number(value) || 0)));
  if (prop === 'positionMode' && node.type === 'vector') value = ['flow', 'overlay'].includes(value) ? value : 'overlay';
  if (prop === 'activeScale') value = Math.max(.94, Math.min(1, Number(value) / 100));
  if (prop === 'objectFit') value = ['cover', 'contain'].includes(value) ? value : 'cover';
  if (prop === 'objectPosition') { const match = String(value).match(/^(\d{1,3})%\s+(\d{1,3})%$/); value = match && Number(match[1]) <= 100 && Number(match[2]) <= 100 ? `${Number(match[1])}% ${Number(match[2])}%` : '50% 50%'; }
  if (prop === 'positionMode') value = ['flow', 'overlay'].includes(value) ? value : 'flow';
  if (prop === 'vectorKind' && node.type === 'vector') {
    if (value === 'line' && node.points.length < 2) node.points = [{ x: 80, y: 300 }, { x: 920, y: 300 }];
    else if (['freehand', 'bezier'].includes(value) && node.points.length < 2) node.points = [{ x: 120, y: 420 }, { x: 500, y: 80 }, { x: 880, y: 420 }];
    if (['rect', 'ellipse'].includes(value)) node.closed = true;
  }
  const responsiveTarget = viewport !== 'desktop' && responsiveProperties(node).includes(prop);
  const currentValue = responsiveTarget ? getEffectiveValue(node, prop) : node[prop];
  if (currentValue === value) return;
  const previousAnchor = prop === 'anchor' && node.type === 'section' ? node.anchor : null;
  recordBeforeMutation(input); writeNodeProperty(node, prop, value);
  if (previousAnchor && previousAnchor !== value) {
    for (const section of project.page.sections) walkNodeTree(section.children, (child) => { if (child.type === 'button' && child.href === `#${previousAnchor}`) child.href = `#${value}`; });
  }
  if (prop === 'positionMode' && node.type === 'shape') {
    if (value === 'flow') {
      const found = findNode(project, node.id);
      node.groupId = null;
      if (found?.parent) {
        const counts = new Map();
        found.parent.children.forEach((child) => { if (child.groupId) counts.set(child.groupId, (counts.get(child.groupId) || 0) + 1); });
        found.parent.children.forEach((child) => { if (child.groupId && counts.get(child.groupId) < 2) child.groupId = null; });
      }
    }
    renderInspector(); renderLayers();
  }
  if (prop === 'level' && node.type === 'heading' && node.designTokens?.fontSize) { const role = value === 1 ? 'h1' : value === 3 ? 'h3' : 'h2'; node.designTokens.fontSize = role; node.fontSize = getTypographyScale(project.designSystem)[role]; }
  if (prop === 'text' && node.type === 'heading' && project.page.sections[0]?.children[0]?.id === node.id) project.page.title = value;
  if (input?.type === 'color') {
    const display = inspectorContent.querySelector(`[data-color-value="${prop}"]`); if (display) display.textContent = value.toUpperCase();
  }
  if (input?.type === 'range') {
    const a = inspectorContent.querySelector(`[data-range-value="${prop}"]`); const b = inspectorContent.querySelector(`[data-range-echo="${prop}"]`);
    if (a) a.textContent = String(value); if (b) b.textContent = `${value}${['width', 'opacity'].includes(prop) ? '%' : 'px'}`;
  }
  markDirty();
  if (['layout', 'gridMode'].includes(prop)) renderInspector();
  renderPreview();
}

function applyMeasuredFreePosition(message) {
  if (!message || typeof message.id !== 'string') return;
  const found = findNode(project, message.id); const node = found?.node;
  if (!found?.parent || !node || node.type === 'section' || node.type === 'component' || node.locked || found.parent.locked) return;
  const values = { x: Number(message.x), y: Number(message.y), width: Number(message.width), height: Number(message.height) };
  if (!Object.values(values).every(Number.isFinite)) { showToast('Could not measure this element for precise positioning.', 'error'); return; }
  recordBeforeMutation();
  node.positioning = normalizeFreePositioning(node.positioning);
  setPositioningValue(node, 'mode', 'free');
  for (const [key, value] of Object.entries(values)) setPositioningValue(node, key, Math.max(key === 'width' || key === 'height' ? 0 : -5000, Math.min(key === 'width' || key === 'height' ? 4000 : 10000, Math.round(value * 10) / 10)));
  setPositioningValue(node, 'xUnit', 'px'); setPositioningValue(node, 'yUnit', 'px');
  setSelectionState(node.id, [node.id]); markDirty(); renderAll();
  showToast('Element converted to Free position. Its current size and location were captured.');
}
function applyFreePositionMessage(message) {
  if (!message || typeof message.id !== 'string') return;
  const items = Array.isArray(message.items) ? message.items.slice(0, 20) : (() => {
    const found = findNode(project, message.id); const current = found?.node ? effectivePositioning(found.node) : null;
    if (message.type === 'canvasflow:free-nudge' && current) return [{ id: message.id, x: current.x + Number(message.dx || 0), y: current.y + Number(message.dy || 0) }];
    return [{ id: message.id, x: message.x, y: message.y, width: message.width, height: message.height, rotation: message.rotation }];
  })();
  const updates = [];
  for (const item of items) {
    const found = findNode(project, item?.id); const node = found?.node;
    if (!found?.parent || !node || node.type === 'section' || node.type === 'component' || node.locked || found.parent.locked) continue;
    const current = effectivePositioning(node);
    if (current.mode !== 'free') continue;
    const next = {};
    for (const key of ['x','y','width','height','rotation']) {
      if (item[key] === undefined) continue;
      const raw = Number(item[key]); if (!Number.isFinite(raw)) continue;
      const bounds = key === 'width' || key === 'height' ? [0,4000] : key === 'rotation' ? [-3600,3600] : [-5000,10000];
      next[key] = Math.round(Math.max(bounds[0], Math.min(bounds[1], raw)) * 10) / 10;
    }
    if (item.xUnit === 'px' || item.xUnit === '%') next.xUnit = item.xUnit;
    if (item.yUnit === 'px' || item.yUnit === '%') next.yUnit = item.yUnit;
    if (Object.keys(next).length) updates.push({ node, values: next });
  }
  if (!updates.length) return;
  recordBeforeMutation();
  for (const update of updates) for (const [key,value] of Object.entries(update.values)) setPositioningValue(update.node, key, value);
  const ids = updates.map((update) => update.node.id);
  setSelectionState(message.id, ids);
  markDirty(); renderAll();
  if (message.type === 'canvasflow:free-arrange') showToast('Precise alignment applied using the active parent dimensions.');
}

function applyFreeSelectionArrangement(action) {
  const nodes = getSelectedNodes(); const parent = selectionParent();
  if (nodes.length < 2 || !parent || !nodes.every((node) => effectivePositioning(node).mode === 'free')) return;
  if (action.startsWith('distribute-') && nodes.length < 3) { showToast('Select at least three free-position elements to distribute.', 'error'); return; }
  // Measure and arrange inside the preview, where the true parent content box and
  // computed CSS dimensions are available at the active responsive breakpoint.
  previewFrame.contentWindow?.postMessage({ type: 'canvasflow:arrange-free', action, ids: nodes.map((node) => node.id) }, '*');
}

function applyCanvasResize(message) {
  if (!message || message.id !== selectedId || !message.values || typeof message.values !== 'object') return;
  const found = findNode(project, message.id);
  const node = found?.node;
  if (!node || node.type === 'section' || node.locked || found.parent?.locked) return;
  const typeProps = {
    heading: ['maxWidth'], paragraph: ['maxWidth'], button: ['width'], image: ['maxWidth', 'height'],
    card: ['maxWidth'], divider: ['width'], shape: ['width', 'height'], vector: ['width', 'height']
  }[node.type] || [];
  const changes = {};
  for (const prop of typeProps) {
    const raw = message.values[prop];
    const bounds = numericBounds(prop, node);
    if (!bounds || !Number.isFinite(Number(raw))) continue;
    changes[prop] = Math.max(bounds[0], Math.min(bounds[1], Math.round(Number(raw))));
  }
  const changed = Object.entries(changes).some(([prop, value]) => getEffectiveValue(node, prop) !== value);
  if (!changed) return;
  recordBeforeMutation();
  setSelectionState(message.id, [message.id]);
  for (const [prop, value] of Object.entries(changes)) writeNodeProperty(node, prop, value);
  markDirty(); renderAll();
  showToast(`Element resized for ${viewport === 'desktop' ? 'all sizes' : `${viewport} preview`}.`);
}

function applyCanvasOverlayMove(message) {
  if (!message || typeof message.id !== 'string' || !Number.isFinite(Number(message.xPercent)) || !Number.isFinite(Number(message.yPercent))) return;
  const found = findNode(project, message.id);
  const node = found?.node;
  if (!found?.parent || !['shape', 'vector'].includes(node.type) || node.positionMode !== 'overlay' || node.locked || found.parent.locked) return;
  const nextX = Math.max(0, Math.min(100, Number(message.xPercent)));
  const nextY = Math.max(0, Math.min(100, Number(message.yPercent)));
  const currentX = Number(getEffectiveValue(node, 'xPercent'));
  const currentY = Number(getEffectiveValue(node, 'yPercent'));
  const deltaX = nextX - currentX;
  const deltaY = nextY - currentY;
  const moving = node.type === 'shape' && node.groupId
    ? found.parent.children.filter((child) => child.type === 'shape' && child.positionMode === 'overlay' && child.groupId === node.groupId)
    : [node];
  if (moving.some((child) => child.locked)) return;
  const updates = moving.map((child) => ({
    child,
    x: Math.round(Math.max(0, Math.min(100, Number(getEffectiveValue(child, 'xPercent')) + deltaX)) * 10) / 10,
    y: Math.round(Math.max(0, Math.min(100, Number(getEffectiveValue(child, 'yPercent')) + deltaY)) * 10) / 10
  }));
  if (!updates.some((item) => item.x !== getEffectiveValue(item.child, 'xPercent') || item.y !== getEffectiveValue(item.child, 'yPercent'))) return;
  recordBeforeMutation();
  for (const item of updates) { writeNodeProperty(item.child, 'xPercent', item.x); writeNodeProperty(item.child, 'yPercent', item.y); }
  setSelectionState(node.id, selectedIds.includes(node.id) ? selectedIds : [node.id]);
  markDirty(); renderAll();
  showToast(`Moved ${moving.length > 1 ? `${moving.length} grouped overlays` : 'decorative overlay'}${viewport === 'desktop' ? '' : ` for ${viewport}`}.`);
}

function applyCanvasOverlayNudge(message) {
  if (!message || typeof message.id !== 'string' || !Number.isFinite(Number(message.dx)) || !Number.isFinite(Number(message.dy))) return;
  const found = findNode(project, message.id);
  const node = found?.node;
  if (!found?.parent || !['shape', 'vector'].includes(node.type) || node.positionMode !== 'overlay' || node.locked || found.parent.locked) return;
  const dx = Math.max(-5, Math.min(5, Number(message.dx)));
  const dy = Math.max(-5, Math.min(5, Number(message.dy)));
  const moving = node.type === 'shape' && node.groupId
    ? found.parent.children.filter((child) => child.type === 'shape' && child.positionMode === 'overlay' && child.groupId === node.groupId)
    : [node];
  if (moving.some((child) => child.locked)) return;
  const updates = moving.map((child) => ({
    child,
    x: Math.round(Math.max(0, Math.min(100, Number(getEffectiveValue(child, 'xPercent')) + dx)) * 10) / 10,
    y: Math.round(Math.max(0, Math.min(100, Number(getEffectiveValue(child, 'yPercent')) + dy)) * 10) / 10
  }));
  if (!updates.some((item) => item.x !== getEffectiveValue(item.child, 'xPercent') || item.y !== getEffectiveValue(item.child, 'yPercent'))) return;
  recordBeforeMutation();
  for (const item of updates) { writeNodeProperty(item.child, 'xPercent', item.x); writeNodeProperty(item.child, 'yPercent', item.y); }
  setSelectionState(node.id, selectedIds.includes(node.id) ? selectedIds : [node.id]);
  markDirty(); renderAll();
}

function applyCanvasReorder(message) {
  if (!message || typeof message.id !== 'string' || typeof message.targetId !== 'string') return;
  const source = findNode(project, message.id); const target = findNode(project, message.targetId);
  if (!source?.parent || !target?.parent || source.parent.id !== target.parent.id || source.node.locked || source.parent.locked || !['before', 'after'].includes(message.placement)) return;
  recordBeforeMutation();
  const bothOverlays = source.node.type === 'shape' && source.node.positionMode === 'overlay' && target.node.type === 'shape' && target.node.positionMode === 'overlay';
  const changed = bothOverlays
    ? reorderOverlayLayer(project, message.id, message.targetId, message.placement)
    : reorderNode(project, message.id, message.targetId, message.placement);
  if (!changed) return;
  setSelectionState(message.id, [message.id]); markDirty(); renderAll(); showToast(bothOverlays ? 'Overlay stacking order updated.' : 'Elements reordered on the canvas.');
}

function resetResponsiveOverrides() {
  const node = findMutableNode(selectedId);
  if (!node || viewport === 'desktop' || !node.responsive?.[viewport]) return;
  recordBeforeMutation(); delete node.responsive[viewport];
  if (!Object.keys(node.responsive).length) node.responsive = {};
  markDirty(); renderAll(); showToast(`${viewport === 'mobile' ? 'Mobile' : 'Tablet'} overrides reset to inherited styles.`);
}
function uniqueSectionIndex() {
  const used = new Set(project.page.sections.map((s) => s.id));
  let i = project.page.sections.length; while (used.has(`section-${i + 1}`)) i += 1; return i;
}
function addSection() {
  const index = uniqueSectionIndex(); const section = createSection(index, sectionTemplate.value, project.designSystem);
  const usedAnchors = new Set(project.page.sections.map((s) => s.anchor));
  if (usedAnchors.has(section.anchor)) section.anchor = `${section.anchor}-${Date.now().toString(36).slice(-4)}`;
  recordBeforeMutation(); project.page.sections.push(section); setSelectionState(section.id, [section.id]); markDirty(); renderAll();
  showToast(`${section.name} added.`);
}
function createFirstCanvasSection() {
  const section = createBlankSection(uniqueSectionIndex(), project.page.backgroundColor || '#ffffff');
  project.page.sections.push(section);
  return section;
}
function insertAfterSelection(section, node) {
  const found = findNode(project, selectedId);
  if (found?.node?.type === 'container' && found.depth < 4 && !found.node.locked) { found.node.children.push(node); return; }
  const parent = found?.parent;
  if (parent?.children && found.section?.id === section.id) parent.children.splice(parent.children.findIndex((item) => item.id === selectedId) + 1, 0, node);
  else section.children.push(node);
}
function componentInstanceCount(componentId) {
  const pages = project.pages?.length ? project.pages : [project.page];
  let count = 0; for (const page of pages) for (const section of page.sections) walkNodeTree(section.children, (node) => { if (node.type === 'component' && node.componentId === componentId) count++; }); return count;
}
function componentMasterFields(component) {
  const t = component.template;
  const textField = (label, prop, value, multiline = false, max = 500) => multiline
    ? `<label class="field"><span class="field-label">${label}</span><textarea data-component-master="${prop}" maxlength="${max}">${escapeHtml(value || '')}</textarea></label>`
    : `<label class="field"><span class="field-label">${label}</span><input data-component-master="${prop}" maxlength="${max}" value="${escapeHtml(value || '')}"></label>`;
  const colorField = (label, prop, value) => `<label class="field"><span class="field-label">${label}</span><input type="color" data-component-master="${prop}" value="${value || '#7055ed'}"></label>`;
  const numberField = (label, prop, value, min, max) => `<label class="field"><span class="field-label">${label}</span><input type="number" data-component-master="${prop}" min="${min}" max="${max}" value="${value}"></label>`;
  const selectField = (label, prop, value, options) => `<label class="field"><span class="field-label">${label}</span><select class="select-input" data-component-master="${prop}">${options.map(([optionValue, optionLabel]) => `<option value="${escapeHtml(String(optionValue))}"${String(value) === String(optionValue) ? ' selected' : ''}>${escapeHtml(optionLabel)}</option>`).join('')}</select></label>`;
  let fields = '';
  if (t.type === 'heading' || t.type === 'paragraph') {
    fields = `${textField('Shared text', 'text', t.text, true, 400)}<div class="component-edit-grid">${colorField('Text colour', 'color', t.color)}${numberField('Font size', 'fontSize', t.fontSize, 12, 84)}${selectField('Font weight', 'fontWeight', t.fontWeight, [['400','Regular'],['500','Medium'],['600','Semi-bold'],['650','Strong'],['700','Bold'],['750','Extra bold'],['800','Black']])}${selectField('Text alignment', 'textAlign', t.textAlign, [['left','Left'],['center','Centre'],['right','Right']])}${t.type === 'heading' ? selectField('Heading level', 'level', t.level, [[1,'H1'],[2,'H2'],[3,'H3']]) : ''}</div>`;
  } else if (t.type === 'button') {
    fields = `${textField('Shared button label', 'text', t.text, false, 200)}${textField('Link destination', 'href', t.href, false, 500)}<div class="component-edit-grid">${colorField('Button colour', 'backgroundColor', t.backgroundColor)}${colorField('Label colour', 'textColor', t.textColor)}${colorField('Hover colour', 'hoverBackgroundColor', t.hoverBackgroundColor)}${colorField('Hover label', 'hoverTextColor', t.hoverTextColor)}${colorField('Focus outline', 'focusOutlineColor', t.focusOutlineColor)}${numberField('Corner radius', 'borderRadius', t.borderRadius, 0, 36)}</div><div class="component-edit-grid">${numberField('Font size', 'fontSize', t.fontSize, 12, 26)}${numberField('Pressed scale (%)', 'activeScalePercent', Math.round((t.activeScale || .98) * 100), 94, 100)}</div>`;
  } else if (t.type === 'card') {
    fields = `${textField('Shared title', 'title', t.title, false, 160)}${textField('Shared description', 'body', t.body, true, 1200)}<div class="component-edit-grid">${colorField('Background', 'backgroundColor', t.backgroundColor)}${colorField('Text', 'color', t.color)}${colorField('Border', 'borderColor', t.borderColor)}${numberField('Corner radius', 'borderRadius', t.borderRadius, 0, 40)}${numberField('Inner padding', 'padding', t.padding, 12, 48)}</div>`;
  } else if (t.type === 'image') {
    const assetOptions = [['', 'Keep embedded image'], ...(project.assets || []).map((asset) => [asset.id, asset.name])];
    fields = `${textField('Shared alternative text', 'alt', t.alt, false, 250)}${selectField('Shared image asset', 'assetId', t.assetId || '', assetOptions)}<p class="field-help">Choose a library asset to replace the image for every linked instance. Leave the first option selected to keep the embedded image.</p><div class="component-edit-grid">${numberField('Maximum width', 'maxWidth', t.maxWidth, 120, 1200)}${numberField('Height', 'height', t.height, 120, 720)}${numberField('Corner radius', 'borderRadius', t.borderRadius, 0, 48)}${selectField('Image fit', 'objectFit', t.objectFit, [['cover','Cover'],['contain','Contain']])}</div>${textField('Focal position', 'objectPosition', t.objectPosition, false, 24)}`;
  } else if (t.type === 'shape') {
    fields = `${selectField('Shape', 'shapeKind', t.shapeKind, [['rectangle','Rectangle'],['circle','Circle'],['pill','Pill'],['triangle','Triangle'],['diamond','Diamond'],['hexagon','Hexagon'],['star','Star'],['ring','Ring']])}${colorField('Fill colour', 'backgroundColor', t.backgroundColor)}<div class="component-edit-grid">${numberField('Width', 'width', t.width, 24, 600)}${numberField('Height', 'height', t.height, 24, 600)}${numberField('Corner radius', 'borderRadius', t.borderRadius, 0, 100)}</div>`;
  } else if (t.type === 'divider') {
    fields = `${colorField('Line colour', 'color', t.color)}<div class="component-edit-grid">${numberField('Thickness', 'height', t.height, 1, 12)}${numberField('Length (%)', 'width', t.width, 20, 100)}</div>`;
  } else if (t.type === 'vector') {
    fields = `<div class="component-edit-grid">${colorField('Fill colour', 'fillColor', t.fillColor)}${colorField('Stroke colour', 'strokeColor', t.strokeColor)}${numberField('Stroke width', 'strokeWidth', t.strokeWidth, 0, 40)}${numberField('Width', 'width', t.width, 24, 600)}${numberField('Height', 'height', t.height, 24, 600)}</div><p class="field-help">The path geometry stays shared. Edit the path anchors on a detached instance when you need a different shape.</p>`;
  }
  return fields;
}
function componentVariantFields(component, variantName) {
  const template = component.template;
  const values = component.variants?.[variantName] || {};
  const colorProps = new Set(['backgroundColor', 'color', 'textColor', 'hoverBackgroundColor', 'hoverTextColor', 'focusOutlineColor', 'borderColor', 'fillColor', 'strokeColor']);
  const numericBounds = { fontSize: [12, 84], borderRadius: [0, 100], width: [0, 1200], height: [1, 720], maxWidth: [120, 1200], padding: [12, 48], strokeWidth: [0, 40], activeScale: [.94, 1] };
  const selectOptions = {
    shapeKind: [['rectangle','Rectangle'],['circle','Circle'],['pill','Pill'],['triangle','Triangle'],['diamond','Diamond'],['hexagon','Hexagon'],['star','Star'],['ring','Ring']],
    objectFit: [['cover','Cover'],['contain','Contain']],
    textAlign: [['left','Left'],['center','Centre'],['right','Right']],
    fontWeight: [['400','Regular'],['500','Medium'],['600','Semi-bold'],['650','Strong'],['700','Bold'],['750','Extra bold'],['800','Black']]
  };
  const props = template.type === 'button' ? ['backgroundColor','textColor','hoverBackgroundColor','hoverTextColor','focusOutlineColor','borderRadius','fontSize','activeScale']
    : template.type === 'card' ? ['backgroundColor','color','borderColor','borderRadius','padding']
      : template.type === 'heading' || template.type === 'paragraph' ? ['color','fontSize','fontWeight','textAlign']
        : template.type === 'image' ? ['maxWidth','height','borderRadius','objectFit','objectPosition']
          : template.type === 'shape' ? ['backgroundColor','shapeKind','width','height','borderRadius']
            : template.type === 'divider' ? ['color','width','height']
              : template.type === 'vector' ? ['fillColor','strokeColor','strokeWidth','width','height'] : [];
  return `<div class="component-variant-fields">${props.map((prop) => {
    const label = prop.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
    const current = Object.hasOwn(values, prop) ? values[prop] : '';
    if (colorProps.has(prop)) return `<label class="field"><span class="field-label">${label}</span><input type="text" data-component-variant-prop="${prop}" value="${escapeHtml(String(current))}" placeholder="Inherit ${escapeHtml(String(template[prop] ?? 'master'))}" maxlength="7" inputmode="text"></label>`;
    if (selectOptions[prop]) return `<label class="field"><span class="field-label">${label}</span><select class="select-input" data-component-variant-prop="${prop}"><option value="">Inherit from master</option>${selectOptions[prop].map(([value, text]) => `<option value="${value}"${String(current) === value ? ' selected' : ''}>${text}</option>`).join('')}</select></label>`;
    if (prop === 'objectPosition') return `<label class="field"><span class="field-label">Focal position</span><input type="text" data-component-variant-prop="${prop}" value="${escapeHtml(String(current))}" placeholder="Inherit ${escapeHtml(String(template[prop] || '50% 50%'))}" maxlength="24"></label>`;
    const bounds = numericBounds[prop];
    if (bounds) return `<label class="field"><span class="field-label">${label}</span><input type="number" data-component-variant-prop="${prop}" min="${bounds[0]}" max="${bounds[1]}" step="${prop === 'activeScale' ? '.01' : '1'}" value="${current === '' ? '' : escapeHtml(String(current))}" placeholder="Inherit ${escapeHtml(String(template[prop] ?? bounds[0]))}"></label>`;
    return '';
  }).join('')}</div>`;
}
function saveComponentVariant(componentId, variantName) {
  const definition = project.components.find((item) => item.id === componentId);
  const card = componentLibraryContent.querySelector(`[data-component-card="${CSS.escape(componentId)}"]`);
  const editor = card?.querySelector(`[data-component-variant-editor="${CSS.escape(variantName)}"]`);
  if (!definition || !editor || !Object.hasOwn(definition.variants || {}, variantName)) return;
  const patch = {}; let invalidColor = false;
  editor.querySelectorAll('[data-component-variant-prop]').forEach((input) => {
    const prop = input.dataset.componentVariantProp;
    const raw = String(input.value).trim();
    if (!raw) return;
    if (['backgroundColor','color','textColor','hoverBackgroundColor','hoverTextColor','focusOutlineColor','borderColor','fillColor','strokeColor'].includes(prop) && !/^#[0-9a-f]{6}$/i.test(raw)) {
      showToast(`${prop.replace(/([A-Z])/g, ' $1')} must be a six-digit hex colour.`, 'error'); input.focus(); invalidColor = true; return;
    }
    patch[prop] = Object.hasOwn({ fontSize: 1, borderRadius: 1, width: 1, height: 1, maxWidth: 1, padding: 1, strokeWidth: 1, activeScale: 1 }, prop) ? Number(raw) : raw;
  });
  if (invalidColor) return;
  recordBeforeMutation();
  definition.variants[variantName] = patch;
  project = normalizeProject(project);
  markDirty(); renderAll(); renderComponentLibrary();
  const refreshedCard = reopenComponentCard(componentId, variantName);
  const refreshed = refreshedCard?.querySelector(`[data-component-variant-editor="${CSS.escape(variantName)}"]`);
  if (refreshed) refreshed.open = true;
  showToast(`Variant “${variantName}” saved. Empty fields inherit from the shared master.`);
}

function reopenComponentCard(componentId, variantName = '') {
  const card = componentLibraryContent.querySelector(`[data-component-card="${CSS.escape(componentId)}"]`);
  const masterDetails = card?.querySelector('.component-master-details');
  if (masterDetails) masterDetails.open = true;
  if (variantName) {
    const variantDetails = card?.querySelector(`[data-component-variant-editor="${CSS.escape(variantName)}"]`);
    if (variantDetails) variantDetails.open = true;
  }
  return card;
}

function renderComponentLibrary() {
  if (!componentLibraryContent) return;
  if (!project.components?.length) {
    componentLibraryContent.innerHTML = `<div class="component-library-empty"><span aria-hidden="true">◇</span><strong>No reusable components yet</strong><p>Select a heading, text, button, card, image or vector layer and choose <b>Create component</b> in Properties. Its linked instances will update from one shared master.</p></div>`;
    return;
  }
  componentLibraryContent.innerHTML = project.components.map((component) => {
    const uses = componentInstanceCount(component.id);
    const variants = Object.keys(component.variants || {});
    return `<article class="component-library-card" data-component-card="${escapeHtml(component.id)}"><div class="component-library-card-head"><div><strong>${escapeHtml(component.name)}</strong><small>${escapeHtml(component.template.type)} · ${uses} instance${uses === 1 ? '' : 's'} · ${variants.length} variant${variants.length === 1 ? '' : 's'}</small></div><button type="button" data-component-use="${escapeHtml(component.id)}" class="button button-primary">＋ Use</button></div><details class="component-master-details"><summary>Edit shared master</summary><form data-component-form="${escapeHtml(component.id)}"><label class="field"><span class="field-label">Component name</span><input data-component-master="name" maxlength="80" value="${escapeHtml(component.name)}"></label>${componentMasterFields(component)}<div class="component-variant-editors"><strong class="variant-editor-heading">Visual variants</strong>${variants.map((variantName) => `<details class="component-variant-editor" data-component-variant-editor="${escapeHtml(variantName)}"><summary>${escapeHtml(variantName.replace(/[-_]/g, ' ').replace(/^./, (char) => char.toUpperCase()))} · Edit styles</summary>${componentVariantFields(component, variantName)}<button type="button" class="component-variant-save" data-component-variant-save="${escapeHtml(component.id)}" data-variant-name="${escapeHtml(variantName)}">Save variant</button></details>`).join('')}</div>${component.template.type === 'button' ? `<div class="component-edit-grid"><label class="field"><span class="field-label">On click</span><select class="select-input" data-component-master="interactionAction"><option value="none"${(component.template.interaction?.action || 'none') === 'none' ? ' selected' : ''}>No action</option><option value="scroll"${component.template.interaction?.action === 'scroll' ? ' selected' : ''}>Scroll to section</option><option value="show"${component.template.interaction?.action === 'show' ? ' selected' : ''}>Show section</option><option value="hide"${component.template.interaction?.action === 'hide' ? ' selected' : ''}>Hide section</option><option value="toggle"${component.template.interaction?.action === 'toggle' ? ' selected' : ''}>Toggle section visibility</option></select></label><label class="field"><span class="field-label">Target section anchor</span><input data-component-master="interactionTargetId" maxlength="64" value="${escapeHtml(component.template.interaction?.targetId || '')}" placeholder="section-anchor"></label></div>` : ''}<div class="component-variant-create"><label class="field"><span class="field-label">New variant name</span><input data-new-variant-name maxlength="32" placeholder="e.g. Featured"></label><button type="button" data-component-add-variant="${escapeHtml(component.id)}">Add visual variant</button></div><div class="component-master-actions"><button type="button" class="button button-primary" data-component-save="${escapeHtml(component.id)}">Save master</button><button type="button" class="button button-quiet" data-component-delete="${escapeHtml(component.id)}" ${uses ? 'disabled title="Delete all instances before removing this component"' : ''}>Delete component</button></div></form></details></article>`;
  }).join('');
}
function openComponentStudio(revealId = '') {
  renderComponentLibrary();
  if (!componentsDialog.open) componentsDialog.showModal();
  if (revealId) {
    const card = componentLibraryContent.querySelector(`[data-component-card="${CSS.escape(revealId)}"]`);
    const details = card?.querySelector('details'); if (details) details.open = true;
    card?.scrollIntoView({ block: 'nearest' });
  }
}
function addComponentInstance(componentId) {
  const definition = project.components.find((component) => component.id === componentId); if (!definition) return;
  const section = activeSection() || createBlankSection(uniqueSectionIndex(), project.page.backgroundColor || '#ffffff');
  if (section.children.length >= 100) { showToast('This section has reached its 100-element limit.', 'error'); return; }
  const id = `component-instance-${globalThis.crypto?.randomUUID?.().replaceAll('-', '').slice(0, 12) || Math.random().toString(36).slice(2, 14)}`;
  const instance = { id, type: 'component', componentId, variant: Object.keys(definition.variants)[0] || 'default', name: definition.name, visible: true, locked: false, opacity: 100, overrides: {} };
  recordBeforeMutation(); if (!activeSection()) project.page.sections.push(section); insertAfterSelection(section, instance); setSelectionState(id, [id]); markDirty(); renderAll(); showToast(`${definition.name} component inserted.`);
}
function createComponentFromSelection() {
  const node = findMutableNode(selectedId); const found = findNode(project, selectedId);
  if (!node || !found?.parent || node.type === 'component') { showToast('Select one editable element to turn into a component.', 'error'); return; }
  if (!['heading','paragraph','button','image','card','divider','shape','vector'].includes(node.type)) { showToast('This element type cannot become a reusable component.', 'error'); return; }
  const name = window.prompt('Name this reusable component:', node.name || node.text || 'Reusable component');
  if (name === null) return;
  if (!name.trim()) { showToast('Enter a component name.', 'error'); return; }
  if (project.components.length >= 50) { showToast('The component library can contain up to 50 components.', 'error'); return; }
  recordBeforeMutation();
  const definition = createComponentDefinition(project, node, name.trim());
  const index = found.parent.children.findIndex((item) => item.id === node.id);
  found.parent.children.splice(index, 1, { id: node.id, type: 'component', componentId: definition.id, variant: Object.keys(definition.variants)[0] || 'default', name: definition.name, visible: node.visible !== false, locked: node.locked === true, opacity: node.opacity ?? 100, overrides: {} });
  markDirty(); renderAll(); showToast(`“${definition.name}” is now a linked component. Open Components to edit its shared master.`);
}
function saveComponentMaster(componentId) {
  const definition = project.components.find((item) => item.id === componentId); const form = componentLibraryContent.querySelector(`[data-component-form="${CSS.escape(componentId)}"]`);
  if (!definition || !form) return;
  const patch = {};
  form.querySelectorAll('[data-component-master]').forEach((input) => {
    const prop = input.dataset.componentMaster; let value = input.value;
    if (prop === 'activeScalePercent') { patch.activeScale = Math.max(.94, Math.min(1, Number(value) / 100)); return; }
    if (prop === 'interactionTargetId') { patch.interaction ||= {}; patch.interaction.targetId = /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : ''; return; }
    if (prop === 'interactionAction') { patch.interaction ||= {}; patch.interaction.action = ['none','scroll','show','hide','toggle'].includes(value) ? value : 'none'; return; }
    if (prop === 'name') return;
    if (['fontSize','borderRadius','width','height','maxWidth','padding','strokeWidth','level'].includes(prop)) { if (!Number.isFinite(Number(value))) return; value = Number(value); }
    if (prop === 'assetId') { patch.assetId = value || null; return; }
    if (['text','title','body','alt','href'].includes(prop)) value = String(value).slice(0, prop === 'body' ? 1200 : prop === 'text' ? 400 : prop === 'href' ? 500 : 250);
    patch[prop] = value;
  });
  const nextName = form.querySelector('[data-component-master="name"]')?.value.trim().slice(0,80) || definition.name;
  recordBeforeMutation();
  const designTokens = { ...(definition.template.designTokens || {}) };
  for (const property of Object.keys(patch)) delete designTokens[property];
  definition.name = nextName;
  definition.template = { ...definition.template, ...patch, designTokens, ...(patch.interaction ? { interaction: { ...definition.template.interaction, ...patch.interaction } } : {}) };
  project = normalizeProject(project); markDirty(); renderAll(); renderComponentLibrary(); reopenComponentCard(componentId); showToast('Shared component master saved. All linked instances were updated.');
}
function addComponentVariant(componentId) {
  const card = componentLibraryContent.querySelector(`[data-component-card="${CSS.escape(componentId)}"]`);
  const nameInput = card?.querySelector('[data-new-variant-name]');
  const name = String(nameInput?.value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 32);
  let definition = project.components.find((component) => component.id === componentId);
  if (!definition || !name) { showToast('Enter a short name for the new variant.', 'error'); return; }
  if (Object.keys(definition.variants).length >= 8) { showToast('A component can have up to eight visual variants.', 'error'); return; }
  if (Object.hasOwn(definition.variants, name)) { showToast('That variant name already exists.', 'error'); return; }
  // Commit the currently edited master first so the new variant captures exactly
  // the values visible in the form instead of discarding unsaved master edits.
  saveComponentMaster(componentId);
  definition = project.components.find((component) => component.id === componentId);
  if (!definition || Object.keys(definition.variants).length >= 8 || Object.hasOwn(definition.variants, name)) return;
  const template = definition.template;
  const fields = template.type === 'button' ? ['backgroundColor', 'textColor', 'hoverBackgroundColor', 'hoverTextColor', 'focusOutlineColor', 'borderRadius', 'fontSize', 'activeScale']
    : template.type === 'card' ? ['backgroundColor', 'color', 'borderColor', 'borderRadius', 'padding']
      : template.type === 'heading' || template.type === 'paragraph' ? ['color', 'fontSize', 'fontWeight', 'textAlign']
        : template.type === 'image' ? ['alt', 'maxWidth', 'height', 'borderRadius', 'objectFit', 'objectPosition']
          : template.type === 'shape' ? ['backgroundColor', 'shapeKind', 'width', 'height', 'borderRadius']
            : template.type === 'divider' ? ['color', 'width', 'height']
              : template.type === 'vector' ? ['fillColor', 'strokeColor', 'strokeWidth', 'width', 'height'] : [];
  const variant = {};
  for (const prop of fields) if (template[prop] !== undefined && template[prop] !== null && template[prop] !== '') variant[prop] = template[prop];
  recordBeforeMutation(); definition.variants[name] = variant; project = normalizeProject(project); markDirty(); renderComponentLibrary(); renderInspector(); reopenComponentCard(componentId, name);
  showToast(`Variant “${name}” added to ${definition.name}.`);
}
function deleteComponent(componentId) {
  const definition = project.components.find((item) => item.id === componentId); if (!definition) return;
  if (componentInstanceCount(componentId)) { showToast('Delete or detach every instance before deleting its component master.', 'error'); return; }
  if (!window.confirm(`Delete the reusable component “${definition.name}”?`)) return;
  recordBeforeMutation(); project.components = project.components.filter((item) => item.id !== componentId); markDirty(); renderComponentLibrary(); renderAll(); showToast('Unused component removed.');
}

function addElement(type) {
  if (type === 'image') { pendingImageMode = 'insert'; imageInput.click(); return; }
  const selectedContainer = findNode(project, selectedId);
  if (type === 'container' && selectedContainer?.node?.type === 'container' && selectedContainer.depth >= 3) { showToast('Containers can be nested up to four levels. Add regular elements inside this container instead.', 'error'); return; }
  const overlayShape = type === 'overlay-shape';
  const existingSection = activeSection();
  const section = existingSection || createBlankSection(uniqueSectionIndex(), project.page.backgroundColor || '#ffffff');
  const node = applyDesignTokensToNode(createElementNode(overlayShape ? 'shape' : type, section.anchor), project.designSystem);
  if (overlayShape) node.positionMode = 'overlay';
  recordBeforeMutation();
  if (!existingSection) project.page.sections.push(section);
  insertAfterSelection(section, node); setSelectionState(node.id, [node.id]); markDirty(); renderAll();
  showToast(`${overlayShape ? 'Decorative overlay' : node.name} added to ${section.name}${findNode(project, selectedId)?.node?.type === 'container' ? ' inside the selected container' : ''}.`);
}
function dataUrlFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = () => reject(new Error('Could not read that asset.'));
    reader.onload = () => resolve(String(reader.result || '')); reader.readAsDataURL(file);
  });
}
function assetMimeForFile(file) {
  const extension = String(file.name || '').split('.').pop()?.toLowerCase();
  if (file.type === 'image/svg+xml' || extension === 'svg') return 'image/svg+xml';
  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  return allowed.includes(file.type) ? file.type : '';
}
async function assetDimensions(file, dataUrl, mime) {
  if (mime === 'image/svg+xml') {
    const text = new TextDecoder().decode(Uint8Array.from(atob(dataUrl.split(',')[1] || ''), (char) => char.charCodeAt(0)));
    const viewBox = text.match(/\bviewBox\s*=\s*["']\s*([-+\d.eE]+)[ ,]+([-+\d.eE]+)[ ,]+([-+\d.eE]+)[ ,]+([-+\d.eE]+)\s*["']/i);
    if (viewBox) return { width: Math.max(0, Math.min(10000, Math.round(Number(viewBox[3])))), height: Math.max(0, Math.min(10000, Math.round(Number(viewBox[4])))) };
    return { width: 0, height: 0 };
  }
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      if (dimensions.width > 0 && dimensions.height > 0) return dimensions;
    } catch { /* Fall back to the browser Image decoder below. */ }
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      if (dimensions.width > 0 && dimensions.height > 0) resolve(dimensions);
      else reject(new Error(`${file.name} could not be decoded as an image.`));
    };
    image.onerror = () => reject(new Error(`${file.name} is not a valid supported image.`));
    image.src = dataUrl;
  });
}
function createAssetRecordId() { return `asset-${globalThis.crypto?.randomUUID?.().replaceAll('-', '').slice(0, 16) || Math.random().toString(36).slice(2, 18)}`; }
async function readAssetFile(file) {
  const mime = assetMimeForFile(file);
  if (!mime) throw new Error('Use PNG, JPG, WebP, GIF or a safe SVG.');
  const limit = mime === 'image/svg+xml' ? 350 * 1024 : 1024 * 1024;
  if (!file.size || file.size > limit) throw new Error(`${file.name} exceeds its ${mime === 'image/svg+xml' ? '350 KB SVG' : '1 MB image'} limit.`);
  let dataUrl = await dataUrlFromFile(file);
  if (!dataUrl.startsWith(`data:${mime};base64,`)) throw new Error('The file MIME type does not match its data.');
  if (mime === 'image/svg+xml') dataUrl = sanitizeSvgDataUrl(dataUrl);
  const dimensions = await assetDimensions(file, dataUrl, mime);
  return { id: createAssetRecordId(), name: file.name, mime, dataUrl, size: file.size, ...dimensions };
}
function imageNodeSource(node) {
  if (!node) return '';
  return node.assetId ? (project.assets.find((asset) => asset.id === node.assetId)?.dataUrl || '') : (node.src || '');
}
function assetUseCount(assetId) {
  const pages = project.pages?.length ? project.pages : [project.page];
  let directUses = 0; for (const page of pages) for (const section of page.sections) walkNodeTree(section.children, (node) => { if (node.type === 'image' && node.assetId === assetId) directUses++; });
  const componentUses = (project.components || []).filter((component) => component.template.type === 'image' && component.template.assetId === assetId).length;
  return directUses + componentUses;
}
function formatAssetSize(bytes) { return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`; }
function renderAssetLibrary() {
  if (!assetLibraryContent) return;
  const query = (assetSearchInput?.value || '').trim().toLowerCase();
  const assets = (project.assets || []).filter((asset) => `${asset.name} ${asset.mime}`.toLowerCase().includes(query));
  const usedTotal = (project.assets || []).reduce((sum, asset) => sum + asset.size, 0);
  const summary = document.querySelector('#assetLibrarySummary');
  if (summary) summary.textContent = `${project.assets.length} asset${project.assets.length === 1 ? '' : 's'} · ${formatAssetSize(usedTotal)} / 1.5 MB`;
  if (!assets.length) {
    assetLibraryContent.innerHTML = `<div class="asset-library-empty"><span aria-hidden="true">▧</span><strong>${project.assets.length ? 'No matching assets' : 'Your library is empty'}</strong><p>${project.assets.length ? 'Try another filename or format.' : 'Upload an image or safe SVG once, then reuse it anywhere in this website.'}</p><button type="button" class="button button-secondary" data-upload-assets>Upload first asset</button></div>`;
    return;
  }
  assetLibraryContent.innerHTML = assets.map((asset) => {
    const uses = assetUseCount(asset.id);
    const dimensions = asset.width && asset.height ? `${asset.width} × ${asset.height}` : asset.mime.replace('image/', '').toUpperCase();
    return `<article class="asset-library-card" data-asset-card="${escapeHtml(asset.id)}"><div class="asset-library-preview"><img src="${escapeHtml(asset.dataUrl)}" alt="" loading="lazy"></div><div class="asset-library-card-copy"><strong title="${escapeHtml(asset.name)}">${escapeHtml(asset.name)}</strong><small>${escapeHtml(dimensions)} · ${formatAssetSize(asset.size)}</small><small>${uses ? `Used ${uses} time${uses === 1 ? '' : 's'}` : 'Not used yet'}</small></div><div class="asset-library-card-actions"><button type="button" data-use-asset="${escapeHtml(asset.id)}" data-use-mode="insert">Insert</button><button type="button" data-use-asset="${escapeHtml(asset.id)}" data-use-mode="replace" ${!(findMutableNode(selectedId)?.type === 'image') ? 'disabled title="Select an image layer to replace it"' : ''}>Replace</button><button type="button" data-delete-asset="${escapeHtml(asset.id)}" ${uses ? 'disabled title="This asset is currently used by an image layer"' : ''}>Delete</button></div></article>`;
  }).join('');
}
function openAssetLibrary() { if (!assetLibraryDialog.open) { assetSearchInput.value = ''; renderAssetLibrary(); assetLibraryDialog.showModal(); } else renderAssetLibrary(); }
function applyAssetToCanvas(assetId, mode = 'insert') {
  const asset = project.assets.find((item) => item.id === assetId); if (!asset) return false;
  const existing = findMutableNode(selectedId);
  if (mode === 'replace') {
    if (existing?.type !== 'image') { showToast('Select an image layer before replacing it.', 'error'); return false; }
    existing.assetId = asset.id; existing.src = ''; if (!existing.alt) existing.alt = asset.name.replace(/\.[^.]+$/, '').slice(0, 250);
    return true;
  }
  const existingSection = activeSection(); const section = existingSection || createBlankSection(uniqueSectionIndex(), project.page.backgroundColor || '#ffffff');
  const node = createElementNode('image', section.anchor); node.assetId = asset.id; node.alt = asset.name.replace(/\.[^.]+$/, '').slice(0, 250); node.name = node.alt ? `Image · ${node.alt}` : 'Image';
  if (!existingSection) project.page.sections.push(section); insertAfterSelection(section, node); setSelectionState(node.id, [node.id]);
  return true;
}
function useLibraryAsset(assetId, mode = 'insert') {
  const asset = project.assets.find((item) => item.id === assetId); if (!asset) return;
  if (mode === 'replace' && findMutableNode(selectedId)?.type !== 'image') { showToast('Select an image layer before replacing it.', 'error'); return; }
  recordBeforeMutation(); if (!applyAssetToCanvas(assetId, mode)) return;
  markDirty(); renderAll(); assetLibraryDialog.close(); showToast(mode === 'replace' ? 'Image source updated from the asset library.' : 'Reusable asset inserted into the current page.');
}
async function handleAssetUploads(fileList, { useFirst = false, mode = 'insert' } = {}) {
  const files = Array.from(fileList || []); if (!files.length) return;
  try {
    if (useFirst && mode === 'replace' && findMutableNode(selectedId)?.type !== 'image') throw new Error('Select an image layer before replacing it.');
    if (project.assets.length + files.length > 100) throw new Error('The asset library can contain up to 100 assets. Remove unused assets before uploading more.');
    const existingBytes = project.assets.reduce((total, asset) => total + asset.size, 0);
    const incomingBytes = files.reduce((total, file) => total + (Number.isFinite(file.size) ? file.size : 0), 0);
    if (existingBytes + incomingBytes > 1_500_000) throw new Error('These files exceed the 1.5 MB total asset-library limit. Upload fewer or smaller files.');
    const additions = [];
    for (const file of files) additions.push(await readAssetFile(file));
    const normalized = normalizeProject({ ...project, assets: [...project.assets, ...additions] });
    const firstAsset = normalized.assets.find((asset) => asset.id === additions[0]?.id) || normalized.assets.at(-additions.length);
    if (useFirst && mode === 'replace' && findMutableNode(selectedId)?.type !== 'image') throw new Error('Select an image layer before replacing it.');
    recordBeforeMutation(); project.assets = normalized.assets;
    if (useFirst && firstAsset) applyAssetToCanvas(firstAsset.id, mode);
    markDirty(); renderAll(); renderAssetLibrary();
    if (useFirst) { if (assetLibraryDialog.open) assetLibraryDialog.close(); showToast(mode === 'replace' ? 'Image replaced and saved in the asset library.' : 'Image added and saved in the asset library.'); }
    else showToast(`${additions.length} asset${additions.length === 1 ? '' : 's'} added to your library.`);
  } catch (error) { showToast(`Asset import failed: ${error.message}`, 'error'); }
  finally { imageInput.value = ''; assetUploadInput.value = ''; }
}
async function handleImageFile(file) {
  if (!file) return;
  const mode = pendingImageMode;
  await handleAssetUploads([file], { useFirst: true, mode });
}
function downloadProjectBackup() {
  try {
    const data = JSON.stringify(project, null, 2);
    downloadText(data, `${slugify(project.name)}.canvasflow.json`, 'application/json;charset=utf-8');
    showToast('Editable CanvasFlow project backup downloaded.');
  } catch (error) { showToast(`Could not create project backup: ${error.message}`, 'error'); }
}
function exportWebsite() {
  try {
    const pages = project.pages?.length ? project.pages : [project.page];
    const htmlFiles = {};
    pages.forEach((page, index) => { htmlFiles[index === 0 ? 'index.html' : `${page.slug}.html`] = generateHtml(project, { page, exportAssets: true }); });
    const css = pages.map((page) => generateCss(project, { page })).join('\n\n/* ===== PAGE-SPECIFIC RULES ===== */\n\n');
    const assets = collectExportAssets(project);
    const pageListText = pages.map((page, index) => `- \`${index === 0 ? 'index.html' : `${page.slug}.html`}\` — ${page.name}`).join('\n');
    const readme = [
      `# ${project.name}`, '',
      'This is a standalone multi-page website exported from CanvasFlow. It uses semantic HTML, responsive CSS, and local assets. It does not need CanvasFlow, an account, a backend, or a build step.', '',
      '## Pages', '', pageListText, '',
      '## Run locally', '', 'Open `index.html` in a modern browser. If local-file restrictions apply, run a static server:', '', '```bash', 'python -m http.server 8000', '```', '', 'Then visit `http://localhost:8000`.', '',
      '## Files', '', '- HTML files above — one independent document per page', '- `styles.css` — shared design tokens, navigation/footer, responsive rules and page-specific styling', '- `assets/` — images uploaded in CanvasFlow', '',
      'Internal links use relative HTML paths, so the exported site works on static hosts without a server-side router.'
    ].join('\n');
    const files = { ...htmlFiles, 'styles.css': css, 'README.md': readme, ...assets };
    const bytes = createZipBytes(files); const blob = new Blob([bytes], { type: 'application/zip' });
    downloadBlob(blob, `${slugify(project.name)}-website.zip`);
    const imageCount = Object.keys(assets).length;
    showToast(`Website exported: ${pages.length} HTML page${pages.length === 1 ? '' : 's'}, shared CSS${imageCount ? ` and ${imageCount} image asset${imageCount === 1 ? '' : 's'}` : ''}.`);
  } catch (error) { console.error('Export failed:', error); showToast(`Website export failed: ${error.message}`, 'error'); }
}
function updateVectorAnchor(input) {
  const node = findMutableNode(selectedId); const index = Number(input.dataset.vectorPoint); const axis = input.dataset.vectorAxis;
  const allowedAxes = ['x', 'y', 'inX', 'inY', 'outX', 'outY'];
  if (node?.type !== 'vector' || !Number.isInteger(index) || !allowedAxes.includes(axis) || !node.points[index]) return;
  const isHandle = axis === 'inX' || axis === 'inY' || axis === 'outX' || axis === 'outY';
  if (isHandle && input.value.trim() === '') {
    if (node.points[index][axis] === undefined) return;
    recordBeforeMutation(input); delete node.points[index][axis]; markDirty(); renderPreview(); return;
  }
  const max = axis.endsWith('X') || axis === 'x' ? 1000 : 600; const raw = Number(input.value); if (!Number.isFinite(raw)) return;
  const value = Math.max(0, Math.min(max, Math.round(raw))); if (node.points[index][axis] === value) return;
  recordBeforeMutation(input); node.points[index][axis] = value; input.value = String(value); markDirty(); renderPreview();
}
function applyVectorDrawing(message) {
  if (!message || typeof message.sectionId !== 'string' || !['freehand', 'bezier', 'rect', 'ellipse'].includes(message.vectorKind)) return;
  const section = project.page.sections.find((item) => item.id === message.sectionId);
  if (!section || section.locked || section.children.length >= 100) { showToast('This section cannot accept another vector layer.', 'error'); return; }
  const width = Math.max(24, Math.min(600, Math.round(Number(message.width) || 24)));
  const height = Math.max(24, Math.min(600, Math.round(Number(message.height) || 24)));
  const xPercent = Math.max(0, Math.min(100, Number(message.xPercent) || 0));
  const yPercent = Math.max(0, Math.min(100, Number(message.yPercent) || 0));
  const points = Array.isArray(message.points) ? message.points.slice(0, 80).map((point) => ({ x: Math.max(0, Math.min(1000, Math.round(Number(point?.x) || 0))), y: Math.max(0, Math.min(600, Math.round(Number(point?.y) || 0))) })) : [];
  if (['freehand', 'bezier'].includes(message.vectorKind) && points.length < 2) { showToast('Draw at least two anchors to create a path.', 'error'); return; }
  recordBeforeMutation();
  const node = createElementNode('vector', section.anchor);
  node.name = ({ freehand: 'Freehand path', bezier: 'Bézier path', rect: 'Vector rectangle', ellipse: 'Vector ellipse' })[message.vectorKind];
  node.vectorKind = message.vectorKind; node.points = points; node.width = width; node.height = height;
  node.positionMode = 'overlay'; node.xPercent = Math.round(xPercent * 10) / 10; node.yPercent = Math.round(yPercent * 10) / 10;
  node.closed = message.closed === true || ['rect', 'ellipse'].includes(message.vectorKind);
  if (node.closed) node.fillColor = '#8c75f5';
  section.children.push(node); setSelectionState(node.id, [node.id]); setVectorTool('select', false); markDirty(); renderAll();
  showToast(`${node.name} added. Edit its anchors, fill and stroke in Properties.`);
}
function setVectorTool(tool, notify = true) {
  const allowed = ['select', 'freehand', 'bezier', 'rect', 'ellipse']; if (!allowed.includes(tool)) return;
  vectorTool = tool;
  document.querySelectorAll('[data-vector-tool]').forEach((button) => { const active = button.dataset.vectorTool === tool; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  previewFrame.contentWindow?.postMessage({ type: 'canvasflow:set-vector-tool', tool }, '*');
  if (notify) showToast(({ select: 'Select tool active.', freehand: 'Freehand: press and drag on a section to draw.', bezier: 'Pen: click to add anchors, double-click or press Enter to finish. Escape cancels.', rect: 'Rectangle: drag on a section to draw.', ellipse: 'Ellipse: drag on a section to draw.' })[tool]);
}

async function importProjectBackup(file) {
  try {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) throw new Error('Project backups must be smaller than 5 MB in this prototype.');
    const imported = normalizeProject(JSON.parse(await file.text()));
    if (dirty && !window.confirm('Replace the current project with this backup? Unsaved changes will be lost.')) return;
    recordBeforeMutation(); project = imported; const firstId = project.page.sections[0]?.children[0]?.id || project.page.sections[0]?.id || PAGE_SELECTION_ID; setSelectionState(firstId, firstId === PAGE_SELECTION_ID ? [] : [firstId]);
    markDirty(); renderAll(); saveProject(false); showToast('Project backup opened and saved locally.');
  } catch (error) { showToast(`Could not open backup: ${error.message}`, 'error'); }
  finally { importInput.value = ''; }
}
function createNewProject(kind) {
  if (!['blank', 'starter'].includes(kind)) return;
  const confirmed = window.confirm('Create a new project? The browser-saved project will be replaced when this one is saved. Download a Backup first if you want to keep the current project.');
  if (!confirmed) return;
  window.clearTimeout(autosaveTimer); autosaveTimer = null;
  project = kind === 'blank' ? createBlankProject() : createStarterProject();
  history.clear();
  const firstId = project.page.sections[0]?.children[0]?.id || project.page.sections[0]?.id || PAGE_SELECTION_ID;
  setSelectionState(firstId, firstId === PAGE_SELECTION_ID ? [] : [firstId]);
  dirty = false; renderAll();
  const saved = saveProject(false);
  newProjectDialog.close();
  if (!saved) { showToast('Project created, but browser storage failed. Download a Backup before leaving.', 'error'); return; }
  showToast(kind === 'blank' ? 'Blank page created. Choose a background colour in Page settings.' : 'Starter website created.');
}

function renderLayersAndInspectorAfterSelect(id, ids = [id]) {
  if (!findNode(project, id)) return;
  setSelectionState(id, ids); pageSettingsBtn.classList.toggle('selected', false); renderLayers(); renderInspector(); renderPreview();
}

inspectorContent.addEventListener('toggle', (event) => {
  const group = event.target;
  if (!(group instanceof HTMLDetailsElement) || !group.matches('.property-group[data-inspector-group]')) return;
  if (group.open) inspectorCollapsedGroups.delete(group.dataset.inspectorGroup);
  else inspectorCollapsedGroups.add(group.dataset.inspectorGroup);
}, true);

layersList.addEventListener('click', (event) => {
  if (event.target.closest('[data-open-page-settings]')) { selectPageSettings(); return; }
  const action = event.target.closest('[data-layer-action]');
  if (action) { event.preventDefault(); event.stopPropagation(); toggleLayerState(action.dataset.layerId, action.dataset.layerAction); return; }
  const button = event.target.closest('[data-select-id]'); if (button) selectNode(button.dataset.selectId, { focusTree: true, toggle: event.shiftKey || event.ctrlKey || event.metaKey });
});
layersList.addEventListener('keydown', (event) => {
  const item = event.target.closest('[data-select-id]'); if (!item) return;
  const id = item.dataset.selectId;
  const found = findNode(project, id);
  if ((event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown'))) {
    event.preventDefault();
    const direction = event.key === 'ArrowUp' ? 'raise' : 'lower';
    let moved = false;
    if (found?.parent) moved = changeLayerOrder(id, direction);
    else {
      const before = captureEditorState();
      moved = moveSection(project, id, event.key === 'ArrowUp' ? -1 : 1);
      if (moved) { history.record(before); updateHistoryButtons(); setSelectionState(id, [id]); markDirty(); renderAll(); }
    }
    if (moved) Array.from(layersList.querySelectorAll('[data-select-id]')).find((candidate) => candidate.dataset.selectId === id)?.focus();
    return;
  }
  const items = Array.from(layersList.querySelectorAll('[data-select-id]'));
  const index = items.findIndex((candidate) => candidate.dataset.selectId === id);
  let next = null;
  if (event.key === 'ArrowDown') next = items[Math.min(items.length - 1, index + 1)];
  else if (event.key === 'ArrowUp') next = items[Math.max(0, index - 1)];
  else if (event.key === 'Home') next = items[0];
  else if (event.key === 'End') next = items.at(-1);
  else if (event.key === 'ArrowRight' && !found?.parent) next = items.find((candidate) => candidate.dataset.dragType === 'node' && findNode(project, candidate.dataset.selectId)?.parent?.id === id);
  else if (event.key === 'ArrowLeft' && found?.parent) next = items.find((candidate) => candidate.dataset.selectId === found.parent.id);
  else return;
  event.preventDefault();
  if (next) selectNode(next.dataset.selectId, { focusTree: true });
});
layersList.addEventListener('dragstart', (event) => {
  const source = event.target.closest('[data-drag-type][data-drag-id]');
  if (!source) return;
  draggedLayer = { type: source.dataset.dragType, id: source.dataset.dragId };
  source.classList.add('is-dragging');
  if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', `${draggedLayer.type}:${draggedLayer.id}`); }
});
layersList.addEventListener('dragover', (event) => {
  const target = event.target.closest('[data-drag-type][data-drag-id]');
  if (!draggedLayer || !target || target.dataset.dragId === draggedLayer.id || target.dataset.dragType !== draggedLayer.type) return;
  if (draggedLayer.type === 'node') {
    const sourceNode = findNode(project, draggedLayer.id); const targetNode = findNode(project, target.dataset.dragId);
    if (!sourceNode?.parent || sourceNode.parent.id !== targetNode?.parent?.id) return;
  }
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  layersList.querySelectorAll('.drop-before,.drop-after').forEach((node) => node.classList.remove('drop-before','drop-after'));
  const bounds = target.getBoundingClientRect();
  target.classList.add(event.clientY < bounds.top + bounds.height * 0.48 ? 'drop-before' : 'drop-after');
});
layersList.addEventListener('drop', (event) => {
  const target = event.target.closest('[data-drag-type][data-drag-id]');
  if (!draggedLayer || !target || target.dataset.dragId === draggedLayer.id || target.dataset.dragType !== draggedLayer.type) return;
  if (draggedLayer.type === 'node') {
    const sourceNode = findNode(project, draggedLayer.id); const targetNode = findNode(project, target.dataset.dragId);
    if (!sourceNode?.parent || sourceNode.parent.id !== targetNode?.parent?.id) return;
  }
  event.preventDefault();
  const bounds = target.getBoundingClientRect();
  const placement = event.clientY < bounds.top + bounds.height * 0.48 ? 'before' : 'after';
  recordBeforeMutation();
  const draggedNode = draggedLayer.type === 'node' ? findNode(project, draggedLayer.id)?.node : null;
  const targetNode = draggedLayer.type === 'node' ? findNode(project, target.dataset.dragId)?.node : null;
  const bothOverlays = draggedNode?.type === 'shape' && draggedNode.positionMode === 'overlay' && targetNode?.type === 'shape' && targetNode.positionMode === 'overlay';
  const moved = draggedLayer.type === 'section'
    ? reorderSection(project, draggedLayer.id, target.dataset.dragId, placement)
    : bothOverlays ? reorderOverlayLayer(project, draggedLayer.id, target.dataset.dragId, placement)
      : reorderNode(project, draggedLayer.id, target.dataset.dragId, placement);
  if (moved) { setSelectionState(draggedLayer.id, [draggedLayer.id]); markDirty(); renderAll(); showToast(draggedLayer.type === 'section' ? 'Section order updated.' : bothOverlays ? 'Overlay stacking order updated.' : 'Element order updated.'); }
  draggedLayer = null;
});
layersList.addEventListener('dragend', () => {
  draggedLayer = null;
  layersList.querySelectorAll('.is-dragging,.drop-before,.drop-after').forEach((node) => node.classList.remove('is-dragging','drop-before','drop-after'));
});
inspectorContent.addEventListener('change', (event) => { const mode = event.target.closest('[data-transform-mode]'); if (mode) { requestFreePositionConversion(findMutableNode(selectedId), mode.value); return; } const transform = event.target.closest('[data-transform-prop]'); if (transform) commitTransformProperty(transform); });
inspectorContent.addEventListener('change', (event) => { const snap = event.target.closest('[data-snap-setting]'); if (snap) { recordBeforeMutation(); project.page.editor ||= { guides: [], gridStep: 16, snap: {} }; project.page.editor.snap ||= {}; project.page.editor.snap[snap.dataset.snapSetting] = snap.checked; markDirty(); renderPreview(); return; } const guideInput = event.target.closest('[data-guide-position]'); if (guideInput) { const guide = project.page.editor?.guides?.find((item) => item.id === guideInput.dataset.guidePosition); if (!guide || guide.locked) return; const value = Number(guideInput.value); if (!Number.isFinite(value)) { guideInput.value = String(guide.position); return; } recordBeforeMutation(); guide.position = Math.max(-5000, Math.min(10000, value)); markDirty(); renderPreview(); return; } const gridStep = event.target.closest('[data-prop="editorGridStep"]'); if (gridStep) { const value = Number(gridStep.value); if (!Number.isFinite(value)) return; recordBeforeMutation(); project.page.editor.gridStep = Math.max(4, Math.min(128, Math.round(value))); gridStep.value = String(project.page.editor.gridStep); markDirty(); renderPreview(); } });
inspectorContent.addEventListener('input', (event) => {
  const input = event.target;
  if (input instanceof HTMLInputElement && input.dataset.focalAxis) {
    const node = findMutableNode(selectedId); if (node?.type !== 'image') return;
    const coords = cropCoordinates(getEffectiveValue(node, 'objectPosition') || '50% 50%');
    const axis = input.dataset.focalAxis === 'x' ? 0 : 1; coords[axis] = Math.max(0, Math.min(100, Number(input.value) || 0));
    const next = `${coords[0]}% ${coords[1]}%`; updateProperty('objectPosition', next, input);
    const echo = inspectorContent.querySelector(`[data-crop-value="${input.dataset.focalAxis}"]`); if (echo) echo.textContent = `${coords[axis]}%`;
    inspectorContent.querySelectorAll('[data-focal-point]').forEach((button) => button.classList.toggle('active', button.dataset.focalPoint === next));
    const preset = inspectorContent.querySelector('[data-crop-preset]'); if (preset) preset.value = ['50% 50%','50% 28%','50% 18%','50% 82%','32% 50%','68% 50%'].includes(next) ? next : 'custom';
    return;
  }
  if (input instanceof HTMLInputElement && input.dataset.vectorPoint !== undefined) { updateVectorAnchor(input); return; }
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement)) return;
  if (input.dataset.componentOverride) {
    const instance = findMutableNode(selectedId); if (instance?.type !== 'component') return;
    const prop = input.dataset.componentOverride; recordBeforeMutation(input);
    const value = String(input.value).slice(0, prop === 'body' ? 1200 : prop === 'title' ? 160 : 400);
    if (value) instance.overrides[prop] = value; else delete instance.overrides[prop];
    markDirty(); renderPreview(); return;
  }
  if (input.dataset.prop && input.dataset.prop !== 'pageLink' && input.dataset.deferredNumber !== 'true') updateProperty(input.dataset.prop, input.value, input);
});
inspectorContent.addEventListener('change', (event) => {
  const input = event.target;
  if (input instanceof HTMLInputElement && input.dataset.focalAxis) {
    const node = findMutableNode(selectedId); if (node?.type !== 'image') return;
    const coords = cropCoordinates(getEffectiveValue(node, 'objectPosition') || '50% 50%');
    const axis = input.dataset.focalAxis === 'x' ? 0 : 1; coords[axis] = Math.max(0, Math.min(100, Number(input.value) || 0));
    const next = `${coords[0]}% ${coords[1]}%`; updateProperty('objectPosition', next, input);
    const echo = inspectorContent.querySelector(`[data-crop-value="${input.dataset.focalAxis}"]`); if (echo) echo.textContent = `${coords[axis]}%`;
    inspectorContent.querySelectorAll('[data-focal-point]').forEach((button) => button.classList.toggle('active', button.dataset.focalPoint === next));
    const preset = inspectorContent.querySelector('[data-crop-preset]'); if (preset) preset.value = ['50% 50%','50% 28%','50% 18%','50% 82%','32% 50%','68% 50%'].includes(next) ? next : 'custom';
    return;
  }
  if (input instanceof HTMLInputElement && input.dataset.vectorPoint !== undefined) { updateVectorAnchor(input); return; }
  if (input.dataset.prop === 'interactionAction' || input.dataset.interactionTarget !== undefined) {
    const node = findMutableNode(selectedId); if (node?.type !== 'button') return;
    const action = inspectorContent.querySelector('[data-prop="interactionAction"]')?.value || node.interaction?.action || 'none';
    const targetId = inspectorContent.querySelector('[data-interaction-target]')?.value || '';
    recordBeforeMutation(input); node.interaction = { action, targetId }; markDirty(); renderPreview(); return;
  }
  if (input instanceof HTMLSelectElement && input.dataset.prop === 'componentVariant') {
    const instance = findMutableNode(selectedId); if (instance?.type !== 'component') return;
    recordBeforeMutation(input); instance.variant = input.value; markDirty(); renderPreview(); return;
  }
  if (input instanceof HTMLSelectElement && input.dataset.prop === 'pageLink') updateProperty(input.dataset.prop, input.value, input);
  else if (input instanceof HTMLInputElement && input.dataset.prop && input.dataset.deferredNumber === 'true') updateProperty(input.dataset.prop, input.value, input);
});
inspectorContent.addEventListener('click', (event) => {
  const transformAction = event.target.closest('[data-transform-action]');
  if (transformAction) { const node = findMutableNode(selectedId); if (transformAction.dataset.transformAction === 'to-free') requestFreePositionConversion(node, 'free'); else if (transformAction.dataset.transformAction === 'to-flow') requestFreePositionConversion(node, 'flow'); return; }
  const guideAction = event.target.closest('[data-guide-action]');
  if (guideAction) {
    const action = guideAction.dataset.guideAction; const guideId = guideAction.dataset.guideId;
    if (action === 'clear-all') { if (!project.page.editor?.guides?.length) return; recordBeforeMutation(); project.page.editor.guides = []; markDirty(); renderInspector(); renderPreview(); return; }
    const guide = project.page.editor?.guides?.find((item) => item.id === guideId); if (!guide) return;
    recordBeforeMutation();
    if (action === 'toggle') guide.locked = !guide.locked;
    else if (action === 'visibility') guide.visible = !guide.visible;
    else if (action === 'delete') project.page.editor.guides = project.page.editor.guides.filter((item) => item.id !== guideId);
    markDirty(); renderInspector(); renderPreview(); return;
  }

  const freeArrangeButton = event.target.closest('[data-free-arrange]');
  if (freeArrangeButton) { applyFreeSelectionArrangement(freeArrangeButton.dataset.freeArrange); return; }
  const layoutPresetAction = event.target.closest('[data-layout-preset-action]');
  if (layoutPresetAction) {
    const container = findMutableNode(selectedId); if (container?.type !== 'container') return;
    const selector = inspectorContent.querySelector('[data-layout-preset-select]'); const presetId = selector?.value || '';
    const builtins = {
      'preset-row': { layout:'flex', flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:20, rowGap:20, columnGap:20, padding:20, paddingX:20, paddingY:20, maxWidth:1200, minHeight:0, backgroundColor:'#ffffff', borderColor:'#e9e6f4', borderRadius:16 },
      'preset-sidebar': { layout:'grid', gridMode:'fixed', gridColumns:2, gridMinColumnWidth:240, alignItems:'stretch', gap:24, rowGap:24, columnGap:24, padding:24, paddingX:24, paddingY:24, maxWidth:1200, minHeight:0, backgroundColor:'#ffffff', borderColor:'#e9e6f4', borderRadius:16 },
      'preset-cards': { layout:'grid', gridMode:'auto-fit', gridColumns:3, gridMinColumnWidth:220, alignItems:'stretch', gap:20, rowGap:20, columnGap:20, padding:20, paddingX:20, paddingY:20, maxWidth:1200, minHeight:0, backgroundColor:'#ffffff', borderColor:'#e9e6f4', borderRadius:16 },
      'preset-centered': { layout:'stack', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:18, rowGap:18, columnGap:18, padding:28, paddingX:28, paddingY:28, maxWidth:760, minHeight:0, backgroundColor:'#ffffff', borderColor:'#e9e6f4', borderRadius:16 },
      'preset-split': { layout:'grid', gridMode:'fixed', gridColumns:2, gridMinColumnWidth:240, alignItems:'center', gap:28, rowGap:28, columnGap:28, padding:24, paddingX:24, paddingY:24, maxWidth:1200, minHeight:0, backgroundColor:'#ffffff', borderColor:'#e9e6f4', borderRadius:16 }
    };
    if (layoutPresetAction.dataset.layoutPresetAction === 'apply') {
      const preset = builtins[presetId] || project.layoutPresets?.find((item) => item.id === presetId)?.settings;
      if (!preset) { showToast('Choose a layout preset first.', 'error'); return; }
      recordBeforeMutation();
      for (const [prop, value] of Object.entries(preset)) writeNodeProperty(container, prop, structuredClone(value));
      markDirty(); renderAll(); showToast(viewport === 'desktop' ? 'Layout preset applied.' : `Layout preset applied to ${viewport} only.`); return;
    }
    if (layoutPresetAction.dataset.layoutPresetAction === 'save') {
      if ((project.layoutPresets || []).length >= 12) { showToast('This project already has 12 saved layout presets.', 'error'); return; }
      const name = window.prompt('Name this reusable layout preset:'); if (!name?.trim()) return;
      const fields = ['layout','flexDirection','flexWrap','justifyContent','alignItems','gridMode','gridColumns','gridMinColumnWidth','gap','rowGap','columnGap','padding','paddingX','paddingY','maxWidth','minHeight','backgroundColor','borderColor','borderRadius'];
      const settings = Object.fromEntries(fields.map((key) => [key, getEffectiveValue(container, key)]));
      const id = `layout-preset-${crypto.randomUUID?.().replaceAll('-', '').slice(0, 10) || Math.random().toString(36).slice(2, 12)}`;
      recordBeforeMutation(); project.layoutPresets ||= []; project.layoutPresets.push({ id, name: name.trim().slice(0,40), settings }); markDirty(); renderInspector(); showToast(`Saved layout preset “${name.trim().slice(0,40)}”.`); return;
    }
    if (layoutPresetAction.dataset.layoutPresetAction === 'delete') {
      const index = project.layoutPresets?.findIndex((item) => item.id === presetId) ?? -1;
      if (index < 0) { showToast('Select one of your saved presets to delete.', 'error'); return; }
      recordBeforeMutation(); const [removed] = project.layoutPresets.splice(index, 1); markDirty(); renderInspector(); showToast(`Deleted layout preset “${removed.name}”.`); return;
    }
  }
  const createComponentButton = event.target.closest('[data-create-component]');
  if (createComponentButton) { createComponentFromSelection(); return; }
  const componentActionButton = event.target.closest('[data-component-action]');
  if (componentActionButton) {
    const instance = findMutableNode(selectedId); if (instance?.type !== 'component') return;
    if (componentActionButton.dataset.componentAction === 'edit') { openComponentStudio(instance.componentId); return; }
    if (componentActionButton.dataset.componentAction === 'detach') {
      const resolved = resolveComponentInstance(instance, project); if (!resolved) return;
      const found = findNode(project, instance.id); if (!found?.parent) return;
      recordBeforeMutation(); const index = found.parent.children.findIndex((node) => node.id === instance.id);
      const detached = { ...resolved, id: instance.id, name: instance.name || resolved.name };
      delete detached.componentId; delete detached.componentVariant;
      found.parent.children.splice(index, 1, detached); markDirty(); renderAll(); showToast('Component instance detached. It is now an independent element.'); return;
    }
  }
  const motionPreview = event.target.closest('[data-motion-preview]');
  if (motionPreview) {
    const node = findNode(project, selectedId)?.node;
    if (!node || node.animation === 'none') { showToast('Choose an entrance motion first.', 'error'); return; }
    previewFrame.contentWindow?.postMessage({ type: 'canvasflow:replay-motion', id: node.id }, '*');
    showToast('Motion replay sent to the live preview.');
    return;
  }
  const focalPoint = event.target.closest('[data-focal-point]');
  if (focalPoint) { updateProperty('objectPosition', focalPoint.dataset.focalPoint); renderInspector(); return; }
  const pageBg = event.target.closest('[data-page-bg]');
  if (pageBg && selectedId === PAGE_SELECTION_ID) { updateProperty('pageBackgroundColor', pageBg.dataset.pageBg); renderInspector(); return; }
  if (event.target.closest('[data-vector-export]')) {
    const node = findNode(project, selectedId)?.node; if (node?.type !== 'vector') return;
    try { downloadText(generateVectorSvg(node), `${slugify(node.name || 'canvasflow-vector')}.svg`, 'image/svg+xml;charset=utf-8'); showToast('Standalone SVG downloaded.'); }
    catch (error) { showToast(`SVG export failed: ${error.message}`, 'error'); }
    return;
  }
  const vectorRemove = event.target.closest('[data-vector-remove]');
  if (vectorRemove) {
    const node = findMutableNode(selectedId); const index = Number(vectorRemove.dataset.vectorRemove);
    if (node?.type !== 'vector' || !Number.isInteger(index) || node.points.length <= 2 || !node.points[index]) return;
    recordBeforeMutation(); node.points.splice(index, 1); markDirty(); renderInspector(); renderPreview(); return;
  }
  if (event.target.closest('[data-vector-add-anchor]')) {
    const node = findMutableNode(selectedId); if (node?.type !== 'vector' || node.points.length >= 80) return;
    recordBeforeMutation(); const last = node.points.at(-1) || { x: 500, y: 300 }; node.points.push({ x: Math.max(0, Math.min(1000, last.x + 70)), y: Math.max(0, Math.min(600, last.y + 35)) }); markDirty(); renderInspector(); renderPreview(); return;
  }
  if (event.target.closest('[data-vector-reset-anchors]')) {
    const node = findMutableNode(selectedId); if (node?.type !== 'vector') return;
    recordBeforeMutation(); node.points = node.vectorKind === 'line' ? [{ x: 80, y: 300 }, { x: 920, y: 300 }] : [{ x: 120, y: 420 }, { x: 500, y: 80 }, { x: 880, y: 420 }]; markDirty(); renderInspector(); renderPreview(); return;
  }
  const shapePick = event.target.closest('[data-shape-pick]');
  if (shapePick) { updateProperty('shapeKind', shapePick.dataset.shapePick); renderInspector(); return; }
  const selectionAction = event.target.closest('[data-selection-action]');
  if (selectionAction) {
    const action = selectionAction.dataset.selectionAction;
    if (action === 'clear') { setSelectionState(selectedId, [selectedId]); renderLayers(); renderInspector(); renderPreview(); return; }
    if (action === 'select-siblings') {
      const found = findNode(project, selectedId);
      if (found?.parent) { setSelectionState(selectedId, found.parent.children.map((node) => node.id)); renderLayers(); renderInspector(); renderPreview(); }
      return;
    }
    if (action === 'group-overlays') {
      recordBeforeMutation();
      const groupId = groupOverlayNodes(project, selectedIds);
      if (!groupId) { showToast('Select at least two decorative overlay shapes in the same section.', 'error'); return; }
      markDirty(); renderAll(); showToast('Decorative overlays grouped. Drag one to move the group.'); return;
    }
    if (action === 'ungroup-overlays') {
      recordBeforeMutation();
      if (!ungroupOverlayNodes(project, selectedIds)) { showToast('No overlay group is selected.', 'error'); return; }
      markDirty(); renderAll(); showToast('Decorative overlays ungrouped.'); return;
    }
  }
  const arrangeButton = event.target.closest('[data-arrange-align]');
  if (arrangeButton) {
    const value = arrangeButton.dataset.arrangeAlign;
    if (!['start', 'center', 'end', 'stretch'].includes(value)) return;
    const nodes = getSelectedNodes(); if (!nodes.length) return;
    recordBeforeMutation();
    for (const node of nodes) {
      if (getEffectiveValue(node, 'alignSelf') === value) continue;
      writeNodeProperty(node, 'alignSelf', value);
    }
    markDirty(); renderAll(); showToast(`Aligned ${nodes.length > 1 ? `${nodes.length} elements` : 'element'}: ${value}.`); return;
  }
  const gapButton = event.target.closest('[data-distribute-gap]');
  if (gapButton) {
    const parent = selectionParent(); const value = Number(gapButton.dataset.distributeGap);
    if (!parent || !selectionIsAllSiblings() || ![16, 24, 32, 40, 48].includes(value)) return;
    recordBeforeMutation(); writeNodeProperty(parent, 'gap', value); markDirty(); renderAll(); showToast(`Equal section spacing set to ${value} px.`); return;
  }
  const responsiveAction = event.target.closest('[data-responsive-action]');
  if (responsiveAction?.dataset.responsiveAction === 'reset') { resetResponsiveOverrides(); return; }
  const sectionAction = event.target.closest('[data-section-action]');
  if (sectionAction) {
    const node = activeSelection().node; if (!node || node.type !== 'section' || sectionAction.disabled) return;
    const action = sectionAction.dataset.sectionAction;
    if (action === 'up' || action === 'down') {
      recordBeforeMutation(); moveSection(project, node.id, action === 'up' ? -1 : 1); markDirty(); renderAll(); showToast(action === 'up' ? 'Section moved up.' : 'Section moved down.'); return;
    }
    if (action === 'duplicate') {
      recordBeforeMutation(); const copy = duplicateSection(project, node.id); if (!copy) return;
      setSelectionState(copy.id, [copy.id]); markDirty(); renderAll(); showToast('Section duplicated.'); return;
    }
    if (action === 'delete') {
      if (project.page.sections.length <= 1) return;
      if (!window.confirm(`Delete “${node.name}” and its contents?`)) return;
      recordBeforeMutation(); removeSection(project, node.id); setSelectionState(project.page.sections[0].children[0]?.id || project.page.sections[0].id, [project.page.sections[0].children[0]?.id || project.page.sections[0].id]);
      markDirty(); renderAll(); showToast('Section deleted.'); return;
    }
  }
  const nodeAction = event.target.closest('[data-node-action]');
  if (nodeAction) {
    const node = findMutableNode(selectedId); if (!node || nodeAction.disabled) return;
    const action = nodeAction.dataset.nodeAction;
    if (action === 'toggle-visible') { toggleLayerState(node.id, 'visible'); return; }
    if (action === 'toggle-locked') { toggleLayerState(node.id, 'locked'); return; }
    if (['layer-back', 'layer-down', 'layer-up', 'layer-front'].includes(action)) {
      const mapping = { 'layer-back': 'back', 'layer-down': 'lower', 'layer-up': 'raise', 'layer-front': 'front' };
      changeLayerOrder(node.id, mapping[action]); return;
    }
    if (action === 'replace-image') { pendingImageMode = 'replace'; imageInput.click(); return; }
    if (action === 'choose-library-asset') { pendingImageMode = 'replace'; openAssetLibrary(); return; }
    if (action === 'ungroup') {
      recordBeforeMutation();
      if (!ungroupOverlayNodes(project, [node.id])) { showToast('This shape is not part of an overlay group.', 'error'); return; }
      setSelectionState(node.id, [node.id]); markDirty(); renderAll(); showToast('Decorative overlay group ungrouped.'); return;
    }
    if (action === 'up' || action === 'down') {
      recordBeforeMutation(); moveNode(project, node.id, action === 'up' ? -1 : 1); markDirty(); renderAll(); return;
    }
    if (action === 'duplicate') {
      recordBeforeMutation(); const copy = duplicateNode(project, node.id); if (!copy) return;
      setSelectionState(copy.id, [copy.id]); markDirty(); renderAll(); showToast('Element duplicated.'); return;
    }
    if (action === 'delete') {
      const found = findNode(project, node.id); if (!found?.parent || found.parent.children.length <= 1) return;
      recordBeforeMutation(); const parentId = found.parent.id; removeNode(project, node.id);
      const parent = project.page.sections.find((section) => section.id === parentId);
      setSelectionState(parent?.children[Math.max(0, parent.children.length - 1)]?.id || parentId, [parent?.children[Math.max(0, parent.children.length - 1)]?.id || parentId]);
      markDirty(); renderAll(); showToast('Element deleted.'); return;
    }
  }
  const alignButton = event.target.closest('[data-align]'); if (!alignButton) return;
  const node = findMutableNode(selectedId);
  if (!node || !['heading', 'paragraph'].includes(node.type) || node.textAlign === alignButton.dataset.align) return;
  recordBeforeMutation(); node.textAlign = alignButton.dataset.align; markDirty(); renderInspector(); renderPreview();
});

previewFrame.addEventListener('load', () => { previewFrame.contentWindow?.postMessage({ type: 'canvasflow:set-editor-zoom', zoom: canvasZoom }, '*'); });
window.addEventListener('message', (event) => {
  if (event.source !== previewFrame.contentWindow) return;
  const message = event.data;
  if (!message || typeof message.type !== 'string') return;
  if (message.type === 'canvasflow:navigate' && typeof message.pageId === 'string') { activatePage(message.pageId); return; }
  if (message.type === 'canvasflow:selection-bounds') { applyMeasuredSelectionCenter(message); return; }
  if (message.type === 'canvasflow:touch-camera') { if (message.phase === 'start') beginTouchCameraGesture(message.points, 'iframe'); else if (message.phase === 'move') moveTouchCameraGesture(message.points, 'iframe'); else if (message.phase === 'end') endTouchCameraGesture('iframe'); return; }
  if (message.type === 'canvasflow:create-vector') { applyVectorDrawing(message); return; }
  if ((message.type === 'canvasflow:selection' || message.type === 'canvasflow:select') && typeof message.id === 'string') renderLayersAndInspectorAfterSelect(message.id, Array.isArray(message.ids) ? message.ids : [message.id]);
  else if (message.type === 'canvasflow:resize') applyCanvasResize(message);
  else if (message.type === 'canvasflow:measure-free-position') applyMeasuredFreePosition(message);
  else if (message.type === 'canvasflow:free-move' || message.type === 'canvasflow:free-transform' || message.type === 'canvasflow:free-nudge' || message.type === 'canvasflow:free-arrange') applyFreePositionMessage(message);
  else if (message.type === 'canvasflow:move-overlay') applyCanvasOverlayMove(message);
  else if (message.type === 'canvasflow:nudge-overlay') applyCanvasOverlayNudge(message);
  else if (message.type === 'canvasflow:reorder-node') applyCanvasReorder(message);
});
projectNameInput.addEventListener('input', () => {
  const nextName = projectNameInput.value.slice(0, 80) || 'Untitled website'; if (project.name === nextName) return;
  recordBeforeMutation(projectNameInput); project.name = nextName; project.page.title = nextName; markDirty();
});
projectNameInput.addEventListener('change', renderPreview);
undoBtn.addEventListener('click', undoEdit); redoBtn.addEventListener('click', redoEdit);
structurePanelBtn?.addEventListener('click', () => toggleWorkspacePanel('structure'));
inspectorPanelBtn?.addEventListener('click', () => toggleWorkspacePanel('inspector'));
mobileStructureBtn?.addEventListener('click', () => toggleWorkspacePanel('structure'));
mobilePropertiesBtn?.addEventListener('click', () => toggleWorkspacePanel('inspector'));
document.querySelector('#closeStructurePanelBtn')?.addEventListener('click', () => setWorkspacePanel(null));
document.querySelector('#closeInspectorPanelBtn')?.addEventListener('click', () => setWorkspacePanel(null));
workspaceBackdrop?.addEventListener('click', () => setWorkspacePanel(null));
window.matchMedia?.('(min-width: 1101px)').addEventListener?.('change', () => setWorkspacePanel(null, { focus: false }));

document.querySelector('#addInsertBtn')?.addEventListener('click', openInsertDialog);
document.querySelector('#mobileAddBtn')?.addEventListener('click', openInsertDialog);
insertSearchInput?.addEventListener('input', filterInsertTools);
insertSearchInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { insertSearchInput.value = ''; filterInsertTools(); }
});
insertDialog?.addEventListener('click', (event) => {
  if (event.target.closest('[data-close-insert]') || event.target === insertDialog) insertDialog.close();
});
document.querySelector('#emptyCanvasAddBtn')?.addEventListener('click', openInsertDialog);
document.querySelector('#emptyCanvasPageSettingsBtn')?.addEventListener('click', selectPageSettings);
previewFrame.addEventListener('load', () => {
  previewFrame.setAttribute('aria-busy', 'false');
  if (previewStatusText) {
    previewStatusText.textContent = 'Live preview';
    previewStatusText.parentElement?.setAttribute('data-state', 'ready');
  }
});
previewFrame.addEventListener('error', () => {
  previewFrame.setAttribute('aria-busy', 'false');
  if (previewStatusText) {
    previewStatusText.textContent = 'Preview unavailable';
    previewStatusText.parentElement?.setAttribute('data-state', 'error');
  }
});
document.addEventListener('focusin', (event) => {
  const target = event.target;
  const editable = target instanceof Element && target.matches('[data-prop],[data-component-override]') && inspectorContent.contains(target);
  if (target === projectNameInput || editable) pendingHistoryGroup = { element: target, before: captureEditorState(), recorded: false };
  else pendingHistoryGroup = null;
});
document.addEventListener('focusout', (event) => { if (pendingHistoryGroup?.element === event.target) pendingHistoryGroup = null; });
function fillDesignSystemForm(rawDesignSystem) {
  const ds = normalizeDesignSystem(rawDesignSystem);
  const set = (name, value) => { const el = designSystemDialog.querySelector(`[name="${name}"]`); if (el) el.value = String(value); };
  for (const [key, value] of Object.entries(ds.colors)) set(`color-${key}`, value);
  for (const [key, value] of Object.entries(ds.typography)) set(`type-${key}`, value);
  for (const [key, value] of Object.entries(ds.radius)) set(`radius-${key}`, value);
  for (const [key, value] of Object.entries(ds.spacing)) set(`spacing-${key}`, value);
  for (const [key, value] of Object.entries(ds.width)) set(`width-${key}`, value);
}
function designSystemFields() { fillDesignSystemForm(project.designSystem); }
function readDesignSystemForm() {
  const value = (name) => designSystemDialog.querySelector(`[name="${name}"]`)?.value;
  return normalizeDesignSystem({
    colors: { primary: value('color-primary'), text: value('color-text'), muted: value('color-muted'), surface: value('color-surface'), border: value('color-border'), page: value('color-page') },
    typography: { pairing: value('type-pairing'), scalePreset: value('type-scalePreset'), baseSize: value('type-baseSize'), ratio: value('type-ratio'), headingFont: value('type-headingFont'), bodyFont: value('type-bodyFont'), headingWeight: value('type-headingWeight'), bodyWeight: value('type-bodyWeight') },
    radius: { small: value('radius-small'), medium: value('radius-medium'), large: value('radius-large') },
    spacing: { section: value('spacing-section'), gap: value('spacing-gap') },
    width: { content: value('width-content'), wide: value('width-wide') }
  });
}
function renderTypeScalePreview() {
  const preview = document.querySelector('#typeScalePreview'); if (!preview) return;
  const ds = readDesignSystemForm(); const scale = getTypographyScale(ds);
  const families = { system: 'Inter, system-ui, sans-serif', serif: 'Georgia, serif', rounded: 'Trebuchet MS, sans-serif', humanist: 'Aptos, Calibri, sans-serif', mono: 'ui-monospace, Consolas, monospace' };
  const heading = families[ds.typography.headingFont] || families.system; const body = families[ds.typography.bodyFont] || families.system;
  preview.style.setProperty('--preview-heading-font', heading); preview.style.setProperty('--preview-body-font', body);
  preview.querySelector('[data-type-preview="h1"]').style.fontSize = `${scale.h1}px`;
  preview.querySelector('[data-type-preview="h2"]').style.fontSize = `${scale.h2}px`;
  preview.querySelector('[data-type-preview="body"]').style.fontSize = `${scale.body}px`;
  preview.querySelector('[data-type-preview="h1"]').style.fontFamily = heading;
  preview.querySelector('[data-type-preview="h2"]').style.fontFamily = heading;
  preview.querySelector('[data-type-preview="body"]').style.fontFamily = body;
}
function openDesignSystem() { designSystemFields(); renderTypeScalePreview(); designSystemDialog.showModal(); }
layerSearchInput?.addEventListener('input', applyLayerSearch);
layerSearchInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { layerSearchInput.value = ''; applyLayerSearch(); layerSearchInput.blur(); }
});
document.querySelector('.canvas-more-menu')?.addEventListener('click', (event) => {
  if (event.target.closest('button')) event.currentTarget.open = false;
});
document.querySelector('#designSystemBtn').addEventListener('click', openDesignSystem);

// The product guide presents features as a workflow, then deep-links into the
// real tools. It is deliberately user-opened rather than an interruptive popup.
document.querySelector('#productGuideBtn').addEventListener('click', () => productGuideDialog.showModal());
productGuideDialog.addEventListener('click', (event) => {
  if (event.target.closest('[data-close-guide]') || event.target === productGuideDialog) {
    productGuideDialog.close();
    return;
  }
  const action = event.target.closest('[data-guide-action]');
  if (!action) return;
  const destinations = {
    'new-project': '#newProjectBtn',
    'design-system': '#designSystemBtn',
    assets: '#assetLibraryBtn',
    components: '#componentsBtn',
    tablet: '#tabletBtn',
    precision: '#guidesBtn',
    export: '#exportBtn'
  };
  productGuideDialog.close();
  if (action.dataset.guideAction === 'shortcuts') {
    const summary = document.querySelector('.shortcuts-help summary');
    if (summary && !summary.parentElement.open) summary.click();
    return;
  }
  const destination = destinations[action.dataset.guideAction];
  if (destination) document.querySelector(destination)?.click();
});

// Keep the two compact action menus self-dismissing after an action or an
// outside click, so they never cover the canvas longer than necessary.
document.querySelectorAll('.action-menu').forEach((menu) => {
  menu.addEventListener('click', (event) => {
    if (event.target.closest('button')) menu.open = false;
  });
});
document.addEventListener('click', (event) => {
  if (event.target.closest('.action-menu, .canvas-more-menu')) return;
  document.querySelectorAll('.action-menu[open]').forEach((menu) => { menu.open = false; });
  document.querySelectorAll('.canvas-more-menu[open]').forEach((menu) => { menu.open = false; });
});
designSystemDialog.addEventListener('input', renderTypeScalePreview);
designSystemDialog.addEventListener('change', (event) => {
  const target = event.target;
  if (target?.name === 'type-headingFont' || target?.name === 'type-bodyFont') designSystemDialog.querySelector('[name="type-pairing"]').value = 'custom';
  if (target?.name === 'type-baseSize' || target?.name === 'type-ratio') designSystemDialog.querySelector('[name="type-scalePreset"]').value = 'custom';
  if (target?.name === 'type-pairing') {
    const pairings = { modern: ['system','system'], editorial: ['serif','humanist'], friendly: ['rounded','humanist'], technical: ['system','mono'], classic: ['serif','serif'] };
    const selected = pairings[target.value];
    if (selected) { designSystemDialog.querySelector('[name="type-headingFont"]').value = selected[0]; designSystemDialog.querySelector('[name="type-bodyFont"]').value = selected[1]; }
  }
  if (target?.name === 'type-scalePreset') {
    const scales = { compact: [15,1.16], balanced: [16,1.2], expressive: [17,1.25] };
    const selected = scales[target.value];
    if (selected) { designSystemDialog.querySelector('[name="type-baseSize"]').value = selected[0]; designSystemDialog.querySelector('[name="type-ratio"]').value = selected[1]; }
  }
  renderTypeScalePreview();
});
designSystemDialog.addEventListener('click', (event) => {
  const preset = event.target.closest('[data-design-preset]');
  if (preset) {
    const presets = {
      studio: createDefaultDesignSystem(),
      ocean: { ...createDefaultDesignSystem(), colors: { primary: '#1677b8', text: '#102a43', muted: '#486581', surface: '#eaf5fb', border: '#c4dfed', page: '#ffffff' }, radius: { small: 7, medium: 12, large: 20 } },
      forest: { ...createDefaultDesignSystem(), colors: { primary: '#287a52', text: '#183b2d', muted: '#557466', surface: '#edf5ef', border: '#d0e2d5', page: '#ffffff' }, radius: { small: 6, medium: 10, large: 16 } },
      ember: { ...createDefaultDesignSystem(), colors: { primary: '#c45b35', text: '#33211c', muted: '#795b50', surface: '#fff3ec', border: '#f0d8cb', page: '#fffdfa' }, radius: { small: 5, medium: 10, large: 16 } },
      mono: { ...createDefaultDesignSystem(), colors: { primary: '#222222', text: '#151515', muted: '#5b5b5b', surface: '#f2f2f2', border: '#d8d8d8', page: '#ffffff' }, radius: { small: 2, medium: 4, large: 8 } },
      editorial: { ...createDefaultDesignSystem(), colors: { primary: '#8a5b36', text: '#34291f', muted: '#746456', surface: '#f6efe5', border: '#e5d7c8', page: '#fffaf3' }, typography: { ...createDefaultDesignSystem().typography, headingFont: 'serif', bodyFont: 'system' }, radius: { small: 3, medium: 6, large: 10 } }
    };
    const selected = presets[preset.dataset.designPreset];
    if (selected) {
      const pairing = preset.dataset.designPreset === 'editorial' ? 'editorial' : 'modern';
      fillDesignSystemForm({ ...selected, typography: { ...createDefaultDesignSystem().typography, pairing, headingFont: pairing === 'editorial' ? 'serif' : 'system', bodyFont: pairing === 'editorial' ? 'humanist' : 'system' } });
      renderTypeScalePreview();
      showToast(`${preset.textContent.trim()} palette loaded in the editor. Save to apply it.`);
    }
    return;
  }
  if (event.target.closest('[data-close-design-system]') || event.target === designSystemDialog) designSystemDialog.close();
});
designSystemDialog.querySelector('#saveDesignSystemBtn').addEventListener('click', (event) => {
  event.preventDefault();
  const next = readDesignSystemForm();
  recordBeforeMutation();
  // Apply shared token changes to every site page. Explicit token roles follow
  // the system; values manually detached in Properties remain unchanged.
  const pages = project.pages?.length ? project.pages : [project.page];
  for (const page of pages) {
    if (page.designTokens?.backgroundColor === 'page') page.backgroundColor = next.colors.page;
    for (const section of page.sections) {
      if (section.designTokens?.backgroundColor === 'page') section.backgroundColor = next.colors.page;
      else if (section.designTokens?.backgroundColor === 'surface') section.backgroundColor = next.colors.surface;
      walkNodeTree(section.children, (node) => {
        if (node.designTokens?.fontFamily === 'heading') node.fontFamily = next.typography.headingFont;
        if (node.designTokens?.fontFamily === 'body') node.fontFamily = next.typography.bodyFont;
        if (node.designTokens?.fontWeight === 'headingWeight') node.fontWeight = next.typography.headingWeight;
        if (node.designTokens?.fontWeight === 'bodyWeight') node.fontWeight = next.typography.bodyWeight;
        if (node.designTokens?.fontSize) node.fontSize = getTypographyScale(next)[node.designTokens.fontSize];
      });
    }
  }
  project.designSystem = next;
  markDirty(); renderAll(); designSystemDialog.close(); showToast('Design system saved. Token-linked styles and future components now use the updated values.');
});

document.querySelector('#newProjectBtn').addEventListener('click', () => newProjectDialog.showModal());
newProjectDialog.addEventListener('click', (event) => {
  const choice = event.target.closest('[data-new-project]');
  if (choice) { createNewProject(choice.dataset.newProject); return; }
  if (event.target.closest('[data-close-new-project]') || event.target === newProjectDialog) newProjectDialog.close();
});
document.querySelector('#addPageBtn').addEventListener('click', createPage);
document.querySelector('#duplicatePageBtn').addEventListener('click', duplicateCurrentPage);
document.querySelector('#deletePageBtn').addEventListener('click', deleteCurrentPage);
pageList.addEventListener('click', (event) => { const item = event.target.closest('[data-page-id]'); if (item) activatePage(item.dataset.pageId); });
document.querySelector('#siteChromeBtn').addEventListener('click', openSiteChromeDialog);
siteChromeDialog.addEventListener('click', (event) => { if (event.target.closest('[data-close-site-chrome]') || event.target === siteChromeDialog) siteChromeDialog.close(); });
document.querySelector('#saveSiteChromeBtn').addEventListener('click', () => {
  recordBeforeMutation();
  project.siteChrome = { navigationEnabled: document.querySelector('#siteNavEnabled').checked, footerEnabled: document.querySelector('#siteFooterEnabled').checked, brandName: document.querySelector('#siteBrandName').value.trim().slice(0, 80) || project.name, footerText: document.querySelector('#siteFooterText').value.trim().slice(0, 240) };
  markDirty(); renderPreview(); siteChromeDialog.close(); showToast('Shared navigation and footer settings saved for every page.');
});
pageSettingsBtn.addEventListener('click', selectPageSettings);
document.querySelector('#saveBtn').addEventListener('click', () => saveProject(true));
document.querySelector('#openBtn').addEventListener('click', openSavedProject);
document.querySelector('#backupBtn').addEventListener('click', downloadProjectBackup);
document.querySelector('#importBackupBtn').addEventListener('click', () => importInput.click());
document.querySelector('#exportBtn').addEventListener('click', exportWebsite);
document.querySelector('#addSectionBtn').addEventListener('click', addSection);
document.querySelectorAll('[data-insert]').forEach((button) => button.addEventListener('click', () => { insertDialog?.close(); addElement(button.dataset.insert); }));
document.querySelectorAll('[data-vector-tool]').forEach((button) => button.addEventListener('click', () => { insertDialog?.close(); setVectorTool(button.dataset.vectorTool); }));
setVectorTool('select', false);
function setViewport(nextViewport) {
  customPreviewWidth = null; viewport = nextViewport;
  customWidthInput.value = nextViewport === 'desktop' ? '1280' : nextViewport === 'tablet' ? '768' : '390';
  updateViewport(); renderInspector(); renderPreview();
}
desktopBtn.addEventListener('click', () => setViewport('desktop'));
tabletBtn.addEventListener('click', () => setViewport('tablet'));
mobileBtn.addEventListener('click', () => setViewport('mobile'));
applyCustomWidthBtn.addEventListener('click', applyCustomPreviewWidth);
customWidthInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') applyCustomPreviewWidth(); });
fitCanvasBtn.addEventListener('click', () => { fitCanvasToStage(); });
zoomOutBtn.addEventListener('click', () => zoomStep(-1));
zoomInBtn.addEventListener('click', () => zoomStep(1));
zoomPercentInput.addEventListener('change', () => { const value = Number(zoomPercentInput.value); if (!Number.isFinite(value)) { zoomPercentInput.value = String(Math.round(canvasZoom * 100)); return; } setCanvasZoom(value / 100); });
handToolBtn.addEventListener('click', () => { handToolEnabled = !handToolEnabled; previewStage.classList.toggle('hand-mode', handToolEnabled || spaceHeld); handToolBtn.classList.toggle('active', handToolEnabled); handToolBtn.setAttribute('aria-pressed', String(handToolEnabled)); });
centerSelectionBtn.addEventListener('click', centerCanvasOnSelection);
guidesBtn.addEventListener('click', () => { showGuides = !showGuides; updateViewport(); renderPreview(); });
gridBtn.addEventListener('click', () => { showGrid = !showGrid; updateViewport(); });
rulersBtn.addEventListener('click', () => { showRulers = !showRulers; updateViewport(); });
function beginRulerGuide(axis, event) {
  if (event.button !== 0 || !showRulers) return;
  event.preventDefault();
  rulerGuideDrag = { axis, pointerId: event.pointerId, preview: document.createElement('div') };
  rulerGuideDrag.preview.className = `canvas-guide-preview ${axis}`;
  frameWrap.append(rulerGuideDrag.preview);
  try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
  moveRulerGuide(event);
}
function moveRulerGuide(event) {
  if (!rulerGuideDrag || event.pointerId !== rulerGuideDrag.pointerId) return;
  const rect = frameWrap.getBoundingClientRect();
  const position = rulerGuideDrag.axis === 'x' ? (event.clientX - rect.left) / canvasZoom : (event.clientY - rect.top) / canvasZoom;
  rulerGuideDrag.position = Math.round(Math.max(0, Math.min(10000, position)) * 10) / 10;
  if (rulerGuideDrag.axis === 'x') rulerGuideDrag.preview.style.left = `${rulerGuideDrag.position}px`;
  else rulerGuideDrag.preview.style.top = `${rulerGuideDrag.position}px`;
}
function finishRulerGuide(event) {
  if (!rulerGuideDrag || event.pointerId !== rulerGuideDrag.pointerId) return;
  moveRulerGuide(event); const state = rulerGuideDrag; rulerGuideDrag = null; state.preview.remove();
  if (state.position < 0) return;
  recordBeforeMutation(); project.page.editor ||= { guides: [], gridStep: 16, snap: {} }; project.page.editor.guides ||= [];
  if (project.page.editor.guides.length >= 100) { showToast('A page can contain up to 100 ruler guides.', 'error'); return; }
  project.page.editor.guides.push({ id: `guide-${crypto.randomUUID?.().replaceAll('-', '').slice(0, 12) || Math.random().toString(36).slice(2, 14)}`, axis: state.axis, position: state.position, locked: false, visible: true });
  markDirty(); renderInspector(); renderPreview(); showToast(`Added ${state.axis === 'x' ? 'vertical' : 'horizontal'} ruler guide at ${state.position}px.`);
}
// The top ruler measures X and creates vertical guides; the left ruler measures Y.
frameRulerTop.addEventListener('pointerdown', (event) => beginRulerGuide('x', event));
frameRulerLeft.addEventListener('pointerdown', (event) => beginRulerGuide('y', event));
window.addEventListener('pointermove', moveRulerGuide); window.addEventListener('pointerup', finishRulerGuide); window.addEventListener('pointercancel', (event) => { if (rulerGuideDrag?.pointerId === event.pointerId) { rulerGuideDrag.preview.remove(); rulerGuideDrag = null; } });
previewStage.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'touch') {
    stageTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (stageTouchPointers.size >= 2) {
      stageTouchSuppressed = true; activePan = null;
      if (!touchCameraState) beginTouchCameraGesture([...stageTouchPointers.values()], 'stage');
      try { previewStage.setPointerCapture(event.pointerId); } catch {}
      event.preventDefault(); return;
    }
  }
  if (!(handToolEnabled || spaceHeld || event.button === 1) || event.target.closest('.canvas-ruler')) return;
  activePan = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: canvasPan.x, originY: canvasPan.y };
  try { previewStage.setPointerCapture(event.pointerId); } catch {}
  event.preventDefault();
});
previewStage.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch' && stageTouchPointers.has(event.pointerId)) {
    stageTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touchCameraState?.source === 'stage') { moveTouchCameraGesture([...stageTouchPointers.values()], 'stage'); event.preventDefault(); return; }
    if (stageTouchSuppressed) { event.preventDefault(); return; }
  }
  if (!activePan || event.pointerId !== activePan.pointerId) return;
  canvasPan.x = activePan.originX + event.clientX - activePan.startX; canvasPan.y = activePan.originY + event.clientY - activePan.startY; applyCanvasCamera();
});
function finishStagePointer(event) {
  if (event.pointerType === 'touch' && stageTouchPointers.has(event.pointerId)) {
    stageTouchPointers.delete(event.pointerId);
    if (touchCameraState?.source === 'stage') endTouchCameraGesture('stage');
    if (!stageTouchPointers.size) stageTouchSuppressed = false;
  }
  if (activePan?.pointerId === event.pointerId) activePan = null;
}
previewStage.addEventListener('pointerup', finishStagePointer);
previewStage.addEventListener('pointercancel', finishStagePointer);
previewStage.addEventListener('wheel', (event) => { if (!event.ctrlKey && !event.metaKey) return; event.preventDefault(); setCanvasZoom(canvasZoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1), event.clientX, event.clientY); }, { passive: false });
window.addEventListener('keydown', (event) => { const tag = event.target?.tagName?.toLowerCase(); if (['input','textarea','select'].includes(tag) || event.target?.isContentEditable) return; if (event.code === 'Space' && !event.repeat) { spaceHeld = true; previewStage.classList.add('hand-mode'); event.preventDefault(); } if ((event.ctrlKey || event.metaKey) && ['+','='].includes(event.key)) { event.preventDefault(); zoomStep(1); } else if ((event.ctrlKey || event.metaKey) && ['-','_'].includes(event.key)) { event.preventDefault(); zoomStep(-1); } else if ((event.ctrlKey || event.metaKey) && event.key === '0') { event.preventDefault(); setCanvasZoom(1); } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') { event.preventDefault(); fitCanvasToStage(); } });
window.addEventListener('keyup', (event) => { if (event.code === 'Space') { spaceHeld = false; previewStage.classList.toggle('hand-mode', handToolEnabled); } });

importInput.addEventListener('change', () => importProjectBackup(importInput.files?.[0]));
imageInput.addEventListener('change', () => handleImageFile(imageInput.files?.[0]));
assetUploadInput.addEventListener('change', () => handleAssetUploads(assetUploadInput.files));
document.querySelector('#assetLibraryBtn').addEventListener('click', openAssetLibrary);
document.querySelector('#componentsBtn').addEventListener('click', () => openComponentStudio());
componentsDialog.addEventListener('click', (event) => {
  const use = event.target.closest('[data-component-use]'); if (use) { addComponentInstance(use.dataset.componentUse); return; }
  const save = event.target.closest('[data-component-save]'); if (save) { saveComponentMaster(save.dataset.componentSave); return; }
  const addVariant = event.target.closest('[data-component-add-variant]'); if (addVariant) { addComponentVariant(addVariant.dataset.componentAddVariant); return; }
  const saveVariant = event.target.closest('[data-component-variant-save]'); if (saveVariant) { saveComponentVariant(saveVariant.dataset.componentVariantSave, saveVariant.dataset.variantName); return; }
  const remove = event.target.closest('[data-component-delete]'); if (remove) { deleteComponent(remove.dataset.componentDelete); return; }
  if (event.target.closest('[data-close-components]') || event.target === componentsDialog) componentsDialog.close();
});
document.querySelector('#uploadAssetsBtn').addEventListener('click', () => assetUploadInput.click());
assetLibraryContent.addEventListener('click', (event) => {
  if (event.target.closest('[data-upload-assets]')) { assetUploadInput.click(); return; }
  const useButton = event.target.closest('[data-use-asset]');
  if (useButton) { useLibraryAsset(useButton.dataset.useAsset, useButton.dataset.useMode || 'insert'); return; }
  const deleteButton = event.target.closest('[data-delete-asset]');
  if (deleteButton) {
    const asset = project.assets.find((item) => item.id === deleteButton.dataset.deleteAsset);
    if (!asset || assetUseCount(asset.id)) return;
    recordBeforeMutation(); project.assets = project.assets.filter((item) => item.id !== asset.id); markDirty(); renderAssetLibrary(); showToast('Unused asset removed from the project library.');
  }
});
assetSearchInput.addEventListener('input', renderAssetLibrary);
assetLibraryDialog.addEventListener('click', (event) => { if (event.target.closest('[data-close-assets]') || event.target === assetLibraryDialog) assetLibraryDialog.close(); });

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && activeWorkspacePanel) { setWorkspacePanel(null); return; }
  const key = event.key.toLowerCase();
  const typing = event.target instanceof Element && event.target.matches('input,textarea,select,[contenteditable="true"]');
  if (key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); layerSearchInput?.focus(); return; }
  const altShift = event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey;
  if (altShift && !typing) {
    if (key === 'd') { event.preventDefault(); duplicateSelection(); return; }
    if (key === 'h') { event.preventDefault(); applySelectionLayerAction('visible'); return; }
    if (key === 'k') { event.preventDefault(); applySelectionLayerAction('locked'); return; }
    if (key === 'l') { event.preventDefault(); applyAlignment('start'); return; }
    if (key === 'c') { event.preventDefault(); applyAlignment('center'); return; }
    if (key === 'r') { event.preventDefault(); applyAlignment('end'); return; }
    if (key === 's') { event.preventDefault(); applyAlignment('stretch'); return; }
    if (key === 'g') { event.preventDefault(); cycleDistributionGap(); return; }
  }
  if (event.altKey && !event.ctrlKey && !event.metaKey && !typing && ['ArrowUp', 'ArrowDown'].includes(event.key) && !event.target.closest?.('#layersList')) {
    const found = findNode(project, selectedId);
    if (found?.parent) { event.preventDefault(); changeLayerOrder(selectedId, event.key === 'ArrowUp' ? 'raise' : 'lower'); return; }
  }
  const modifier = event.ctrlKey || event.metaKey; if (!modifier) return;
  if (key === 's') { event.preventDefault(); saveProject(true); }
  else if (event.shiftKey && key === 'e') { event.preventDefault(); exportWebsite(); }
  else if (key === 'z' && event.shiftKey) { if (history.canRedo) { event.preventDefault(); redoEdit(); } }
  else if (key === 'z') { if (history.canUndo) { event.preventDefault(); undoEdit(); } }
  else if (key === 'y') { if (history.canRedo) { event.preventDefault(); redoEdit(); } }
});
window.addEventListener('beforeunload', (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

renderAll();
try {
  if (!browserStorageAvailable) { saveStatus.textContent = 'Browser storage unavailable'; saveDot.className = 'save-dot unsaved'; }
  else if (initialProjectLoadedFromStorage) markSaved();
  else { saveStatus.textContent = 'Not saved yet'; saveDot.className = 'save-dot'; }
} catch { saveStatus.textContent = 'Browser storage unavailable'; saveDot.className = 'save-dot unsaved'; }
