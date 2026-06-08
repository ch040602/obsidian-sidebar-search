// 역할: REST API 없이 Obsidian Vault 폴더를 직접 읽는 계층입니다.
// Chrome File System Access API의 DirectoryHandle을 사용합니다.
// 사용자가 명시적으로 선택한 폴더만 접근하며, 이 핸들은 IndexedDB에 저장됩니다.

import { idbGet, idbSet, idbDelete } from './idb-store.js';
import { loadSettings } from './settings.js';
import { parseMarkdownNote } from './markdown-parser.js';
import { normalizeTagForCompare } from './tag-utils.js';

const VAULT_HANDLE_KEY = 'vaultDirectoryHandle';
const VAULT_INDEX_KEY = 'vaultIndex';
const VAULT_INDEX_CREATED_AT_KEY = 'vaultIndexCreatedAt';

export async function chooseVaultDirectory() {
  if (!window.showDirectoryPicker) {
    throw new Error('이 Chrome 환경은 File System Access API의 showDirectoryPicker를 지원하지 않습니다.');
  }

  const handle = await window.showDirectoryPicker({ mode: 'read' });
  await requestReadPermission(handle);
  await idbSet(VAULT_HANDLE_KEY, handle);
  return handle;
}

export async function forgetVaultDirectory() {
  await idbDelete(VAULT_HANDLE_KEY);
  await idbDelete(VAULT_INDEX_KEY);
  await idbDelete(VAULT_INDEX_CREATED_AT_KEY);
}

export async function getVaultDirectoryHandle({ requestPermission = false } = {}) {
  const handle = await idbGet(VAULT_HANDLE_KEY);
  if (!handle) return null;

  if (requestPermission) {
    await requestReadPermission(handle);
  } else {
    const permission = await handle.queryPermission({ mode: 'read' });
    if (permission !== 'granted') return null;
  }

  return handle;
}

export async function requestReadPermission(handle) {
  const query = await handle.queryPermission({ mode: 'read' });
  if (query === 'granted') return true;

  const permission = await handle.requestPermission({ mode: 'read' });
  if (permission !== 'granted') {
    throw new Error('Vault 폴더 읽기 권한이 필요합니다.');
  }
  return true;
}

export async function rebuildVaultIndex(onProgress = () => {}) {
  const settings = await loadSettings();
  const root = await getVaultDirectoryHandle({ requestPermission: true });
  if (!root) throw new Error('Vault 폴더가 선택되어 있지 않습니다.');

  const records = [];
  let scanned = 0;

  for await (const fileEntry of walkMarkdownFiles(root, '', settings)) {
    scanned += 1;
    if (scanned % 25 === 0) onProgress({ scanned, indexed: records.length });

    const file = await fileEntry.handle.getFile();
    if (file.size > settings.maxIndexedFileBytes) continue;

    const markdown = await file.text();
    const note = parseMarkdownNote({
      path: fileEntry.path,
      markdown,
      mtime: file.lastModified || 0
    });

    if (!shouldIndexParsedNote(note, settings)) continue;

    records.push(note);
  }

  await idbSet(VAULT_INDEX_KEY, records);
  await idbSet(VAULT_INDEX_CREATED_AT_KEY, Date.now());
  onProgress({ scanned, indexed: records.length, done: true });

  return records;
}

export async function loadVaultIndex() {
  return (await idbGet(VAULT_INDEX_KEY)) || [];
}

export async function getVaultIndexCreatedAt() {
  return (await idbGet(VAULT_INDEX_CREATED_AT_KEY)) || 0;
}

async function* walkMarkdownFiles(dirHandle, prefix, settings) {
  for await (const [name, handle] of dirHandle.entries()) {
    const path = prefix ? `${prefix}/${name}` : name;

    if (handle.kind === 'directory') {
      if (isExcludedFolder(path, name, settings.excludedFolders)) continue;
      yield* walkMarkdownFiles(handle, path, settings);
      continue;
    }

    if (handle.kind === 'file' && name.toLowerCase().endsWith('.md')) {
      yield { path, handle };
    }
  }
}

function isExcludedFolder(path, name, excludedFolders) {
  const normalized = path.replace(/\\/g, '/');
  return excludedFolders.some((folder) => {
    const f = String(folder).replace(/\\/g, '/').replace(/\/$/, '');
    return name === f || normalized === f || normalized.startsWith(`${f}/`);
  });
}

export function shouldIndexParsedNote(note, settings) {
  const blocked = new Set((settings.excludedTags || []).map(normalizeTagForCompare));
  return !(note.tags || []).some((tag) => blocked.has(normalizeTagForCompare(tag)));
}
