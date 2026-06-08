// 역할: 사용자가 보는 사이드패널 UI입니다.
// - Vault 폴더 선택/권한 확인/인덱싱
// - 드래그 선택어를 Obsidian 태그로 검색
// - 현재 페이지 관련 노트 검색
// - 결과를 간략히 보여주고 Obsidian 앱으로 직접 열기

import { chooseVaultDirectory, getVaultDirectoryHandle, rebuildVaultIndex, loadVaultIndex, getVaultIndexCreatedAt, writeVaultTextFile } from '../lib/vault-access.js';
import { loadSettings, saveSettings } from '../lib/settings.js';
import { applyTranslations, translate } from '../lib/i18n.js';
import { searchVaultIndex } from '../lib/search-engine.js';
import { normalizeTagInput } from '../lib/tag-utils.js';
import { openInObsidian } from '../lib/obsidian-uri.js';
import { detectSearchContext, buildDefaultQuery } from '../lib/page-context.js';
import { buildObsidianClipperNote } from '../lib/obsidian-clipper-adapter.js';
import { makeWebClipPath } from '../lib/web-clip-path.js';
import { localizePageImages } from '../lib/image-localizer.js';

const els = {
  status: document.querySelector('#status'),
  uiLanguage: document.querySelector('#ui-language'),
  openOptions: document.querySelector('#open-options'),
  query: document.querySelector('#query'),
  searchTag: document.querySelector('#search-tag'),
  searchText: document.querySelector('#search-text'),
  queryInfo: document.querySelector('#query-info'),
  pageContext: document.querySelector('#page-context'),
  relatedSearch: document.querySelector('#related-search'),
  clipCurrentPage: document.querySelector('#clip-current-page'),
  reindex: document.querySelector('#reindex'),
  results: document.querySelector('#results'),
  resultTemplate: document.querySelector('#result-template')
};

let state = {
  settings: null,
  activeTabId: null,
  pageContext: null,
  index: [],
  hasVault: false
};

init().catch(showError);

async function init() {
  state.settings = await loadSettings();
  applyLanguage();
  state.hasVault = await ensureVaultOrPrompt();
  bindEvents();

  if (!state.hasVault) return;

  await loadIndexState();
  await loadCurrentPageContext();
  await applyPendingOrSelectionSearch();
}

function bindEvents() {
  els.openOptions.addEventListener('click', () => chrome.runtime.openOptionsPage());

  els.uiLanguage.addEventListener('change', async () => {
    state.settings = { ...state.settings, uiLanguage: els.uiLanguage.value === 'en' ? 'en' : 'ko' };
    await saveSettings(state.settings);
    applyLanguage();
    renderPageContext(state.pageContext || {});
  });

  els.searchTag.addEventListener('click', async () => {
    if (!guardVaultReady()) return;
    await runSearch('tag', els.query.value);
  });

  els.searchText.addEventListener('click', async () => {
    if (!guardVaultReady()) return;
    await runSearch('text', els.query.value);
  });

  els.relatedSearch.addEventListener('click', async () => {
    if (!guardVaultReady()) return;
    await runSearch('related', buildDefaultQuery(state.pageContext));
  });

  els.reindex.addEventListener('click', async () => {
    if (!guardVaultReady()) return;
    await rebuildIndexWithProgress();
    await runSearch('tag', els.query.value || state.pageContext?.selectedText || '');
  });

  els.clipCurrentPage.addEventListener('click', async () => {
    if (!guardVaultReady()) return;
    await clipCurrentPageAsLocalNote();
  });

  els.query.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter' && guardVaultReady()) {
      await runSearch('tag', els.query.value);
    }
  });

  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== 'session' || !state.hasVault) return;
    const pending = changes.pendingSearch?.newValue;
    if (!isCurrentTabSessionItem(pending) || pending.mode !== 'tag' || !pending.query) return;
    await applyPendingTagSearch(pending);
  });
}

async function ensureVaultOrPrompt() {
  const handle = await getVaultDirectoryHandle();
  if (handle) {
    setVaultControlsEnabled(true);
    setStatus(t('vaultConnected', { name: handle.name }));
    return true;
  }

  setVaultControlsEnabled(false);
  setStatus(t('vaultRequired'));
  const button = document.createElement('button');
  button.textContent = t('chooseVault');
  button.addEventListener('click', async () => {
    await chooseVaultDirectory();
    setStatus(t('vaultSelected'));
    await rebuildIndexWithProgress();
    location.reload();
  });

  els.results.innerHTML = '';
  els.results.appendChild(button);
  return false;
}

function guardVaultReady() {
  if (state.hasVault) return true;
  setStatus(t('vaultRequired'));
  return false;
}

function setVaultControlsEnabled(enabled) {
  for (const element of [
    els.query,
    els.searchTag,
    els.searchText,
    els.relatedSearch,
    els.clipCurrentPage,
    els.reindex
  ]) {
    element.disabled = !enabled;
  }
}

async function loadIndexState() {
  state.index = await loadVaultIndex();
  const createdAt = await getVaultIndexCreatedAt();

  if (!state.index.length) {
    setStatus(t('noIndex'));
  } else {
    const date = new Date(createdAt).toLocaleString();
    setStatus(t('indexReady', { count: state.index.length, date }));
  }
}

async function loadCurrentPageContext() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.activeTabId = tab?.id ?? null;
  let context = { url: tab?.url || '', title: tab?.title || '' };

  if (tab?.id && /^https?:/.test(tab.url || '')) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'READ_PAGE_CONTEXT' });
      if (response?.ok) context = { ...context, ...response.context };
    } catch {
      // content script가 없는 chrome:// 또는 확장 페이지에서는 기본 탭 정보만 사용합니다.
    }
  }

  const session = await chrome.storage.session.get(['lastSelection']);
  if (!context.selectedText && session.lastSelection?.tabId === tab?.id) {
    context.selectedText = session.lastSelection.text;
  }

  state.pageContext = detectSearchContext(context);
  renderPageContext(state.pageContext);
}

async function applyPendingOrSelectionSearch() {
  const session = await chrome.storage.session.get(['pendingSearch', 'lastSelection']);
  const pending = isCurrentTabSessionItem(session.pendingSearch) ? session.pendingSearch : null;
  const lastSelection = isCurrentTabSessionItem(session.lastSelection) ? session.lastSelection : null;
  const selected = state.pageContext?.selectedText || lastSelection?.text || '';

  if (pending?.mode === 'tag' && pending.query) {
    await applyPendingTagSearch(pending);
    return;
  }

  if (selected) {
    els.query.value = normalizeTagInput(selected);
    els.queryInfo.textContent = t('selectedByDrag', { tag: els.query.value });
    await runSelectionSearch(selected, '드래그 선택어');
    return;
  }

  const defaultQuery = buildDefaultQuery(state.pageContext);
  els.query.value = defaultQuery;
  els.queryInfo.textContent = t('relatedDefault');
  await runSearch('related', defaultQuery);
}

function isCurrentTabSessionItem(item) {
  if (!item || state.activeTabId == null) return false;
  return item.tabId === state.activeTabId;
}

async function applyPendingTagSearch(pending) {
  await chrome.storage.session.remove('pendingSearch');
  await runSelectionSearch(pending.query, '우클릭/단축키 선택어');
}

async function runSelectionSearch(rawText, label) {
  const tagQuery = normalizeTagInput(rawText);
  els.query.value = tagQuery;
  els.queryInfo.textContent = t(label === '드래그 선택어' ? 'selectedByDrag' : 'pendingSelection', { tag: tagQuery });

  const tagResults = await runSearch('tag', tagQuery, { render: false });
  els.queryInfo.textContent = t('selectedTagResults', { label: localizedSelectionLabel(label), tag: tagQuery, count: tagResults.length });
  renderResults(tagResults);
  return tagResults;
}

async function runSearch(mode, query, options = {}) {
  if (!state.index.length) state.index = await loadVaultIndex();

  const results = await searchVaultIndex(state.index, {
    mode,
    query,
    pageContext: state.pageContext,
    limit: 30
  });

  if (options.render === false) return results;

  if (mode === 'tag') {
    els.queryInfo.textContent = t('tagResults', { tag: normalizeTagInput(query), count: results.length });
  } else if (mode === 'related') {
    els.queryInfo.textContent = t('relatedResults', { count: results.length });
  } else {
    els.queryInfo.textContent = t('textResults', { query, count: results.length });
  }

  renderResults(results);
  return results;
}

async function rebuildIndexWithProgress() {
  setStatus(t('indexing'));
  state.index = await rebuildVaultIndex((progress) => {
    if (progress.done) setStatus(t('indexingDone', { indexed: progress.indexed }));
    else setStatus(t('indexingProgress', { scanned: progress.scanned, indexed: progress.indexed }));
  });
}

async function clipCurrentPageAsLocalNote() {
  setStatus(t('savingPage'));

  const settings = await loadSettings();
  const imageResult = await localizePageImages({
    pageContext: state.pageContext,
    settings,
    limit: 8
  });

  const note = await buildObsidianClipperNote({
    pageContext: state.pageContext,
    localImages: imageResult.assets
  });

  const path = makeWebClipPath(settings, note, state.pageContext);
  await writeVaultTextFile(path, note.markdown);

  setStatus(t('savedPath', { path }));
  await openInObsidian({ vaultName: settings.vaultName, filePath: path });
  await rebuildIndexWithProgress();
}

function renderPageContext(context) {
  els.pageContext.textContent = [
    `${t('titleLabel')}: ${context.title || ''}`,
    context.selectedText ? `${t('selectedLabel')}: ${context.selectedText}` : '',
    context.searchQuery ? `${t('searchLabel')}: ${context.searchQuery}` : '',
    `${t('urlLabel')}: ${context.url || ''}`
  ].filter(Boolean).join('\n');
}

function renderResults(results) {
  els.results.innerHTML = '';

  if (!results.length) {
    const indexedCount = state.index.length;
    els.results.innerHTML = `<p class="muted">${t('noResults', { count: indexedCount })}</p>`;
    return;
  }

  for (const result of results) {
    const node = els.resultTemplate.content.cloneNode(true);
    node.querySelector('.result-title').textContent = result.title;
    node.querySelector('.result-path').textContent = `${result.path} · score ${result.score}`;
    node.querySelector('.result-excerpt').textContent = result.excerpt || '';
    node.querySelector('.result-reasons').textContent = (result.reasons || []).join(' · ');

    const tagList = node.querySelector('.tag-list');
    for (const tag of (result.tags || []).slice(0, 10)) {
      const tagNode = document.createElement('span');
      tagNode.className = 'tag';
      tagNode.textContent = `#${tag}`;
      tagNode.addEventListener('click', async () => {
        els.query.value = tag;
        await runSearch('tag', tag);
      });
      tagList.appendChild(tagNode);
    }

    node.querySelector('.open-note').textContent = t('openInObsidian');
    node.querySelector('.open-note').addEventListener('click', async () => {
      const settings = await loadSettings();
      await openInObsidian({ vaultName: settings.vaultName, filePath: result.path });
    });

    els.results.appendChild(node);
  }
}

function setStatus(text) {
  els.status.textContent = text;
}

function showError(error) {
  console.error(error);
  setStatus(t('error'));
  els.results.innerHTML = `<p class="muted">${error instanceof Error ? error.message : String(error)}</p>`;
}

function applyLanguage() {
  els.uiLanguage.value = state.settings.uiLanguage;
  applyTranslations(document, state.settings.uiLanguage);
}

function t(key, values) {
  return translate(state.settings?.uiLanguage || 'ko', key, values);
}

function localizedSelectionLabel(label) {
  if (state.settings?.uiLanguage !== 'en') return label;
  return label === '드래그 선택어' ? 'Dragged text' : 'Context-menu/shortcut text';
}
