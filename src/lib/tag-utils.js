// 역할: 사용자가 드래그한 단어를 Obsidian 태그 검색어로 정규화합니다.
// 예: "Web Clipper" -> "web-clipper", "#Obsidian" -> "obsidian"

export function normalizeTagInput(text) {
  return String(text || '')
    .trim()
    .replace(/^#+/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[`*_~()[\]{}<>"'.,!?;:|\\]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function normalizeTagForCompare(tag) {
  return normalizeTagInput(tag).replace(/^#+/, '');
}

export function tagVariantsFromSelection(text) {
  const normalized = normalizeTagInput(text);
  const compact = normalized.replace(/-/g, '');
  const words = normalized.split('-').filter(Boolean);

  return Array.from(new Set([
    normalized,
    compact,
    ...words
  ].filter((value) => value.length >= 2)));
}
