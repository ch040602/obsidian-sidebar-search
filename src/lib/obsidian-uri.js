// 역할: 검색 결과를 Obsidian 데스크톱 앱에서 직접 열기 위한 obsidian:// URI를 만듭니다.
// Vault 직접 파일 접근은 이 확장 내부에서 하고, 최종 확인은 Obsidian 앱으로 위임합니다.

export function buildObsidianOpenUri({ vaultName, filePath }) {
  const params = new URLSearchParams();
  if (vaultName) params.set('vault', vaultName);
  params.set('file', stripMarkdownExtension(filePath));
  return `obsidian://open?${params.toString()}`;
}

export function openInObsidian({ vaultName, filePath }) {
  const url = buildObsidianOpenUri({ vaultName, filePath });
  return chrome.tabs.create({ url });
}

function stripMarkdownExtension(path) {
  return String(path || '').replace(/\.md$/i, '');
}
