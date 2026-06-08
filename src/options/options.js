// 역할: 확장 프로그램 설정 페이지입니다.
// 사용자는 이 페이지에서 Vault 폴더를 선택하고, 권한을 확인하고, 인덱스를 재생성합니다.

import { chooseVaultDirectory, forgetVaultDirectory, getVaultDirectoryHandle, rebuildVaultIndex } from '../lib/vault-access.js';
import { loadSettings, saveSettings } from '../lib/settings.js';
import { applyTranslations, translate } from '../lib/i18n.js';

const els = {
  uiLanguage: document.querySelector('#ui-language'),
  chooseVault: document.querySelector('#choose-vault'),
  forgetVault: document.querySelector('#forget-vault'),
  testPermission: document.querySelector('#test-permission'),
  vaultStatus: document.querySelector('#vault-status'),
  vaultName: document.querySelector('#vault-name'),
  defaultClipFolder: document.querySelector('#default-clip-folder'),
  assetFolder: document.querySelector('#asset-folder'),
  maxImageBytes: document.querySelector('#max-image-bytes'),
  excludedFolders: document.querySelector('#excluded-folders'),
  excludedTags: document.querySelector('#excluded-tags'),
  rebuildIndex: document.querySelector('#rebuild-index'),
  saveSettings: document.querySelector('#save-settings'),
  indexStatus: document.querySelector('#index-status')
};

let currentSettings = null;

init().catch(showError);

async function init() {
  currentSettings = await loadSettings();
  applyTranslations(document, currentSettings.uiLanguage);
  fillForm(currentSettings);
  await refreshVaultStatus();

  els.uiLanguage.addEventListener('change', async () => {
    currentSettings = { ...currentSettings, ...readForm() };
    await saveSettings(currentSettings);
    applyTranslations(document, currentSettings.uiLanguage);
    await refreshVaultStatus();
  });

  els.chooseVault.addEventListener('click', async () => {
    const handle = await chooseVaultDirectory();
    els.vaultStatus.textContent = t('vaultStatusConnected', { name: handle.name });
  });

  els.forgetVault.addEventListener('click', async () => {
    await forgetVaultDirectory();
    els.vaultStatus.textContent = t('vaultForgotten');
  });

  els.testPermission.addEventListener('click', refreshVaultStatus);
  els.saveSettings.addEventListener('click', async () => {
    currentSettings = { ...currentSettings, ...readForm() };
    await saveSettings(currentSettings);
    applyTranslations(document, currentSettings.uiLanguage);
    els.indexStatus.textContent = t('settingsSaved');
  });

  els.rebuildIndex.addEventListener('click', async () => {
    currentSettings = { ...currentSettings, ...readForm() };
    await saveSettings(currentSettings);
    els.indexStatus.textContent = t('indexStart');
    const records = await rebuildVaultIndex((progress) => {
      if (progress.done) els.indexStatus.textContent = t('indexingDone', { indexed: progress.indexed });
      else els.indexStatus.textContent = t('scanProgress', { scanned: progress.scanned, indexed: progress.indexed });
    });
    els.indexStatus.textContent = t('indexingDone', { indexed: records.length });
  });
}

function fillForm(settings) {
  els.uiLanguage.value = settings.uiLanguage;
  els.vaultName.value = settings.vaultName;
  els.defaultClipFolder.value = settings.defaultClipFolder;
  els.assetFolder.value = settings.assetFolder;
  els.maxImageBytes.value = String(settings.maxImageBytes);
  els.excludedFolders.value = settings.excludedFolders.join('\n');
  els.excludedTags.value = settings.excludedTags.join('\n');
}

function readForm() {
  return {
    uiLanguage: els.uiLanguage.value === 'en' ? 'en' : 'ko',
    vaultName: els.vaultName.value.trim(),
    defaultClipFolder: els.defaultClipFolder.value.trim() || 'Web Clips',
    assetFolder: els.assetFolder.value.trim() || '_assets/web-clips',
    maxImageBytes: Number(els.maxImageBytes.value) || 8 * 1024 * 1024,
    excludedFolders: splitLines(els.excludedFolders.value),
    excludedTags: splitLines(els.excludedTags.value)
  };
}

function splitLines(text) {
  return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

async function refreshVaultStatus() {
  const handle = await getVaultDirectoryHandle({ requestPermission: true }).catch(() => null);
  els.vaultStatus.textContent = handle ? t('vaultStatusConnected', { name: handle.name }) : t('vaultStatusMissing');
}

function showError(error) {
  console.error(error);
  els.indexStatus.textContent = error instanceof Error ? error.message : String(error);
}

function t(key, values) {
  return translate(currentSettings?.uiLanguage || 'ko', key, values);
}
