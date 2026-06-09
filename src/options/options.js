// 역할: 확장 프로그램 설정 페이지입니다.
// 사용자는 이 페이지에서 Vault 폴더를 선택하고, 권한을 확인하고, 인덱스를 재생성합니다.

import { chooseVaultDirectory, forgetVaultDirectory, getVaultDirectoryHandle, purgeVaultIndex, rebuildVaultIndex } from '../lib/vault-access.js';
import { loadSettings, privacyIndexSettingsChanged, saveSettings } from '../lib/settings.js';
import { applyTranslations, translate } from '../lib/i18n.js';

const els = {
  uiLanguage: document.querySelector('#ui-language'),
  chooseVault: document.querySelector('#choose-vault'),
  forgetVault: document.querySelector('#forget-vault'),
  testPermission: document.querySelector('#test-permission'),
  vaultStatus: document.querySelector('#vault-status'),
  vaultName: document.querySelector('#vault-name'),
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
    try {
      const previousSettings = currentSettings;
      currentSettings = { ...currentSettings, ...readForm() };
      await saveSettingsAndMaybePurgeIndex(previousSettings, currentSettings);
      applyTranslations(document, currentSettings.uiLanguage);
      await refreshVaultStatus();
    } catch (error) {
      showError(error);
    }
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
    try {
      const previousSettings = currentSettings;
      currentSettings = { ...currentSettings, ...readForm() };
      const purged = await saveSettingsAndMaybePurgeIndex(previousSettings, currentSettings);
      fillForm(currentSettings);
      applyTranslations(document, currentSettings.uiLanguage);
      els.indexStatus.textContent = purged ? t('settingsSavedIndexPurged') : t('settingsSaved');
    } catch (error) {
      showError(error);
    }
  });

  els.rebuildIndex.addEventListener('click', async () => {
    try {
      currentSettings = { ...currentSettings, ...readForm() };
      await saveSettings(currentSettings);
      els.indexStatus.textContent = t('indexStart');
      const records = await rebuildVaultIndex((progress) => {
        if (progress.done) els.indexStatus.textContent = t('indexingDone', { indexed: progress.indexed });
        else els.indexStatus.textContent = t('scanProgress', { scanned: progress.scanned, indexed: progress.indexed });
      });
      els.indexStatus.textContent = t('indexingDone', { indexed: records.length });
    } catch (error) {
      showError(error);
    }
  });
}

function fillForm(settings) {
  els.uiLanguage.value = settings.uiLanguage;
  els.vaultName.value = settings.vaultName;
  els.excludedFolders.value = settings.excludedFolders.join('\n');
  els.excludedTags.value = settings.excludedTags.join('\n');
}

function readForm() {
  return {
    uiLanguage: els.uiLanguage.value === 'en' ? 'en' : 'ko',
    vaultName: els.vaultName.value.trim(),
    excludedFolders: splitLines(els.excludedFolders.value),
    excludedTags: splitLines(els.excludedTags.value)
  };
}

async function saveSettingsAndMaybePurgeIndex(previousSettings, nextSettings) {
  await saveSettings(nextSettings);
  if (!privacyIndexSettingsChanged(previousSettings, nextSettings)) return false;

  await purgeVaultIndex();
  return true;
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
