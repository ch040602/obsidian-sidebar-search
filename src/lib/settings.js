// 역할: 확장 설정을 chrome.storage.local에 저장하고 읽습니다.
// 원칙: Vault DirectoryHandle은 IndexedDB에 저장하고, 문자열 설정만 chrome.storage.local에 저장합니다.

export const DEFAULT_SETTINGS = {
  uiLanguage: 'ko',
  vaultName: '',
  defaultClipFolder: 'Web Clips',
  webClipPathTemplate: 'Web Clips/{{title}}.md',
  assetFolder: '_assets/web-clips',
  maxImageBytes: 8 * 1024 * 1024,
  excludedFolders: ['.obsidian', '.git', 'node_modules', 'Journal/Private', 'Finance', 'People'],
  excludedTags: ['private', 'secret', 'personal'],
  maxIndexedFileBytes: 512 * 1024
};

export async function loadSettings() {
  const data = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ settings: { ...DEFAULT_SETTINGS, ...settings } });
}
