// 역할: 로컬 인덱스 안에서 태그 검색과 일반 검색을 수행합니다.
// 태그 검색은 Obsidian의 실제 태그 의미에 맞춰 frontmatter tags/tag와 본문 #tag만 대상으로 삼습니다.

import { normalizeTagForCompare, tagVariantsFromSelection } from './tag-utils.js';
import { normalizeUrl, domainFromUrl } from './url-utils.js';
import { loadSettings } from './settings.js';

export async function searchVaultIndex(index, request) {
  const settings = await loadSettings();
  const safeIndex = index.filter((note) => !isExcluded(note, settings));

  if (request.mode === 'tag') {
    return searchByTag(safeIndex, request.query, request).slice(0, request.limit || 25);
  }

  if (request.mode === 'related') {
    return searchRelated(safeIndex, request).slice(0, request.limit || 25);
  }

  return searchText(safeIndex, request.query, request).slice(0, request.limit || 25);
}

export function searchByTag(index, rawText, request = {}) {
  const queryTag = normalizeTagForCompare(rawText);
  if (!queryTag) return [];

  const results = [];

  for (const note of index) {
    let score = 0;
    const reasons = [];

    for (const tag of note.tags || []) {
      const normalizedTag = normalizeTagForCompare(tag);

      if (normalizedTag === queryTag) {
        score += 1000;
        reasons.push(`#${tag} 정확 일치`);
      } else if (normalizedTag.startsWith(`${queryTag}/`)) {
        score += 800;
        reasons.push(`#${tag} 하위 태그 일치`);
      }
    }

    if (score > 0) results.push(toRankedResult(note, score, reasons));
  }

  return sortResults(results);
}

export function searchText(index, query, request = {}) {
  const tokens = tokenize(query);
  const variants = tagVariantsFromSelection(query);
  const results = [];

  for (const note of index) {
    const reasons = [];
    let score = scoreTitleAliasContent(note, tokens, reasons, 1);

    for (const tag of note.tags || []) {
      const normalizedTag = normalizeTagForCompare(tag);
      if (tokens.includes(normalizedTag) || variants.includes(normalizedTag)) {
        score += 220;
        reasons.push(`#${tag} 태그 일치`);
      }
    }

    if (score > 0) results.push(toRankedResult(note, score, reasons));
  }

  return sortResults(results);
}

export function searchRelated(index, request) {
  const page = request.pageContext || {};
  const url = normalizeUrl(page.url || '');
  const canonicalUrl = normalizeUrl(page.canonicalUrl || '');
  const domain = domainFromUrl(page.url || '');
  const tokens = tokenize([page.selectedText, page.searchQuery, page.h1, page.title, page.description].filter(Boolean).join(' '));

  const results = [];

  for (const note of index) {
    let score = 0;
    const reasons = [];

    if (url && note.normalizedSourceUrls?.includes(url)) {
      score += 1500;
      reasons.push('현재 URL과 source_url 일치');
    }

    if (canonicalUrl && note.normalizedSourceUrls?.includes(canonicalUrl)) {
      score += 1450;
      reasons.push('canonical URL 일치');
    }

    if (domain && note.domains?.includes(domain)) {
      score += 250;
      reasons.push(`같은 도메인: ${domain}`);
    }

    score += scoreTitleAliasContent(note, tokens, reasons, 0.8);

    if (score > 0) results.push(toRankedResult(note, score, reasons));
  }

  return sortResults(results);
}

function scoreTitleAliasContent(note, tokens, reasons, multiplier) {
  if (!tokens.length) return 0;
  let score = 0;
  const title = normalizeText(note.title);
  const aliases = (note.aliases || []).map(normalizeText).join(' ');
  const headings = (note.headings || []).map(normalizeText).join(' ');
  const content = normalizeText(`${note.excerpt || ''} ${note.contentText || ''}`);

  for (const token of tokens) {
    if (title.includes(token)) {
      score += 180 * multiplier;
      reasons.push(`제목에 "${token}" 포함`);
    }
    if (aliases.includes(token)) {
      score += 160 * multiplier;
      reasons.push(`alias에 "${token}" 포함`);
    }
    if (headings.includes(token)) {
      score += 90 * multiplier;
      reasons.push(`heading에 "${token}" 포함`);
    }
    if (content.includes(token)) {
      score += 35 * multiplier;
    }
  }

  return score;
}

function tokenize(text) {
  return Array.from(new Set(String(text || '')
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[`*_~()[\]{}<>"'.,!?;:|\\/]/g, ' ')
    .split(/\s+|-/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 20)));
}

function normalizeText(text) {
  return String(text || '').toLowerCase();
}

function toRankedResult(note, score, reasons) {
  return {
    ...note,
    score: Math.round(score),
    reasons: Array.from(new Set(reasons)).slice(0, 5)
  };
}

function sortResults(results) {
  return results.sort((a, b) => b.score - a.score || b.mtime - a.mtime || a.path.localeCompare(b.path));
}

function isExcluded(note, settings) {
  const path = String(note.path || '').replace(/\\/g, '/');
  const excludedByFolder = settings.excludedFolders.some((folder) => {
    const f = String(folder).replace(/\\/g, '/').replace(/\/$/, '');
    return path === f || path.startsWith(`${f}/`);
  });

  const excludedTags = new Set(settings.excludedTags.map(normalizeTagForCompare));
  const excludedByTag = (note.tags || []).some((tag) => excludedTags.has(normalizeTagForCompare(tag)));

  return excludedByFolder || excludedByTag;
}
