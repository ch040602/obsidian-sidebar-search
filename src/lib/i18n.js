// 역할: 확장 UI에서 쓰는 한국어/영어 문구를 관리합니다.
// Chrome i18n 메시지 번들 없이도 사용자가 Options에서 언어를 즉시 바꿀 수 있게 합니다.

export const LANGUAGES = {
  ko: '한국어',
  en: 'English'
};

const MESSAGES = {
  ko: {
    appTitle: 'Obsidian Companion',
    settingsTitle: 'Obsidian Companion 설정',
    settings: '설정',
    openSettings: '설정 열기',
    vaultChecking: 'Vault 상태 확인 중',
    vaultAccess: 'Vault 접근',
    vaultAccessHelp: 'REST API 없이 Chrome File System Access API로 사용자가 선택한 Vault 폴더에 직접 접근합니다.',
    chooseVault: 'Vault 폴더 선택',
    forgetVault: 'Vault 연결 해제',
    testPermission: '권한 확인',
    generalSettings: '기본 설정',
    language: '언어',
    vaultName: 'Vault 이름',
    vaultNamePlaceholder: 'Obsidian 앱의 Vault 이름',
    defaultClipFolder: '기본 클립 폴더',
    assetFolder: '이미지 저장 폴더',
    maxImageBytes: '이미지 최대 크기(bytes)',
    privacyFilters: '프라이버시 필터',
    excludedFolders: '제외 폴더, 줄 단위',
    excludedTags: '제외 태그, 줄 단위',
    index: '인덱스',
    rebuildIndex: '인덱스 재생성',
    saveSettings: '설정 저장',
    selectionTagSearch: '선택어 태그 검색',
    selectionTagSearchHelp: '웹페이지에서 단어를 드래그한 뒤 이 패널을 열면 해당 단어를 Obsidian 실제 태그로 검색합니다.',
    queryPlaceholder: '예: obsidian, web-clipper, #research',
    tag: '태그',
    fullText: '전체',
    currentPage: '현재 페이지',
    relatedNotes: '관련 노트',
    clipCurrentPage: '현재 페이지 저장',
    searchResults: '검색 결과',
    openInObsidian: 'Obsidian에서 열기',
    vaultConnected: 'Vault 연결됨: {name}',
    vaultRequired: 'Vault 폴더를 선택해야 합니다.',
    vaultSelected: 'Vault 폴더 선택 완료. 인덱스를 생성합니다.',
    noIndex: 'Vault 인덱스가 없습니다. 인덱스 재생성이 필요합니다.',
    indexReady: '인덱스 {count}개 노트 · {date}',
    indexing: 'Vault 인덱싱 중',
    indexingProgress: '인덱싱 중: 스캔 {scanned}개 · 색인 {indexed}개',
    indexingDone: '인덱싱 완료: {indexed}개 노트',
    selectedByDrag: '드래그 선택어를 태그로 검색합니다: #{tag}',
    pendingSelection: '우클릭/단축키 선택어를 태그로 검색합니다: #{tag}',
    selectedTagResults: '{label} 실제 태그 검색: #{tag} · {count}개 결과',
    relatedDefault: '선택어가 없어서 현재 페이지 기준 관련 노트를 표시합니다.',
    tagResults: '실제 태그 검색: #{tag} · {count}개 결과',
    textResults: '전체 검색: {query} · {count}개 결과',
    relatedResults: '현재 페이지 관련 노트 · {count}개 결과',
    noResults: '검색 결과가 없습니다. 현재 인덱스: {count}개 노트. Vault를 처음 연결했거나 노트를 추가/수정했다면 인덱스 재생성을 눌러주세요. 제외 폴더/태그에 걸린 노트는 표시하지 않습니다.',
    savingPage: '현재 페이지 저장 중',
    savedPath: '저장 완료: {path}',
    settingsSaved: '설정 저장 완료',
    vaultForgotten: 'Vault 연결 해제됨',
    vaultStatusConnected: '연결됨: {name}',
    vaultStatusMissing: 'Vault 폴더가 선택되어 있지 않거나 권한이 없습니다.',
    indexStart: '인덱싱 시작',
    scanProgress: '스캔 {scanned}개 · 색인 {indexed}개',
    error: '오류',
    titleLabel: 'Title',
    selectedLabel: 'Selected',
    searchLabel: 'Search',
    urlLabel: 'URL'
  },
  en: {
    appTitle: 'Obsidian Companion',
    settingsTitle: 'Obsidian Companion Settings',
    settings: 'Settings',
    openSettings: 'Open settings',
    vaultChecking: 'Checking Vault status',
    vaultAccess: 'Vault Access',
    vaultAccessHelp: 'Accesses the user-selected Vault folder directly with the Chrome File System Access API, without a REST API.',
    chooseVault: 'Choose Vault Folder',
    forgetVault: 'Forget Vault',
    testPermission: 'Check Permission',
    generalSettings: 'General Settings',
    language: 'Language',
    vaultName: 'Vault name',
    vaultNamePlaceholder: 'Vault name in the Obsidian app',
    defaultClipFolder: 'Default clip folder',
    assetFolder: 'Image folder',
    maxImageBytes: 'Max image size (bytes)',
    privacyFilters: 'Privacy Filters',
    excludedFolders: 'Excluded folders, one per line',
    excludedTags: 'Excluded tags, one per line',
    index: 'Index',
    rebuildIndex: 'Rebuild Index',
    saveSettings: 'Save Settings',
    selectionTagSearch: 'Selected Text Tag Search',
    selectionTagSearchHelp: 'Select text on a web page and open this panel to search it as an actual Obsidian tag.',
    queryPlaceholder: 'Example: obsidian, web-clipper, #research',
    tag: 'Tag',
    fullText: 'Full',
    currentPage: 'Current Page',
    relatedNotes: 'Related Notes',
    clipCurrentPage: 'Save Current Page',
    searchResults: 'Search Results',
    openInObsidian: 'Open in Obsidian',
    vaultConnected: 'Vault connected: {name}',
    vaultRequired: 'Choose a Vault folder first.',
    vaultSelected: 'Vault folder selected. Building the index.',
    noIndex: 'No Vault index yet. Rebuild the index first.',
    indexReady: 'Index: {count} notes · {date}',
    indexing: 'Indexing Vault',
    indexingProgress: 'Indexing: scanned {scanned} · indexed {indexed}',
    indexingDone: 'Index complete: {indexed} notes',
    selectedByDrag: 'Searching dragged text as a tag: #{tag}',
    pendingSelection: 'Searching context-menu/shortcut text as a tag: #{tag}',
    selectedTagResults: '{label} actual tag search: #{tag} · {count} results',
    relatedDefault: 'No selected text. Showing notes related to the current page.',
    tagResults: 'Actual tag search: #{tag} · {count} results',
    textResults: 'Full search: {query} · {count} results',
    relatedResults: 'Current page related notes · {count} results',
    noResults: 'No results. Current index: {count} notes. If this is a new Vault or notes changed, rebuild the index. Notes matching excluded folders/tags are never shown.',
    savingPage: 'Saving current page',
    savedPath: 'Saved: {path}',
    settingsSaved: 'Settings saved',
    vaultForgotten: 'Vault disconnected',
    vaultStatusConnected: 'Connected: {name}',
    vaultStatusMissing: 'No Vault folder is selected, or permission is missing.',
    indexStart: 'Indexing started',
    scanProgress: 'Scanned {scanned} · indexed {indexed}',
    error: 'Error',
    titleLabel: 'Title',
    selectedLabel: 'Selected',
    searchLabel: 'Search',
    urlLabel: 'URL'
  }
};

export function normalizeLanguage(language) {
  return language === 'en' ? 'en' : 'ko';
}

export function translate(language, key, values = {}) {
  const lang = normalizeLanguage(language);
  const template = MESSAGES[lang][key] || MESSAGES.ko[key] || key;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_match, name) => String(values[name] ?? ''));
}

export function applyTranslations(root, language) {
  const lang = normalizeLanguage(language);
  root.documentElement.lang = lang;

  for (const element of root.querySelectorAll('[data-i18n]')) {
    element.textContent = translate(lang, element.dataset.i18n);
  }

  for (const element of root.querySelectorAll('[data-i18n-placeholder]')) {
    element.placeholder = translate(lang, element.dataset.i18nPlaceholder);
  }

  for (const element of root.querySelectorAll('[data-i18n-title]')) {
    element.title = translate(lang, element.dataset.i18nTitle);
  }
}
