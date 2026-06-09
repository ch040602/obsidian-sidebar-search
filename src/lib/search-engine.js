// 역할: 로컬 인덱스 안에서 태그 검색과 일반 검색을 수행합니다.
// 태그 검색은 Obsidian의 실제 태그 의미에 맞춰 frontmatter tags/tag와 본문 #tag만 대상으로 삼습니다.

import { normalizeTagForCompare, tagVariantsFromSelection } from './tag-utils.js';
import { normalizeUrl, domainFromUrl } from './url-utils.js';
import { loadSettings } from './settings.js';
import { searchSemanticNotes } from './semantic-search.js';
import { scoreLexicalNotes, tokenizeLexical } from './lexical-search.js';

const SEMANTIC_SCORE_WEIGHT = 260;

export async function searchVaultIndex(index, request) {
  const settings = await loadSettings();
  const safeIndex = index.filter((note) => !isExcluded(note, settings));

  if (request.mode === 'tag') {
    return searchByTag(safeIndex, request.query, request).slice(0, request.limit || 25);
  }

  if (request.mode === 'related') {
    return searchRelatedHybrid(safeIndex, request).slice(0, request.limit || 25);
  }

  return searchTextHybrid(safeIndex, request.query, request).slice(0, request.limit || 25);
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
  const resultsByPath = new Map();

  for (const result of scoreLexicalNotes(index, query)) {
    resultsByPath.set(result.note.path, toRankedResult(result.note, result.score, result.reasons));
  }

  for (const note of index) {
    for (const tag of note.tags || []) {
      const normalizedTag = normalizeTagForCompare(tag);
      if (tokens.includes(normalizedTag) || variants.includes(normalizedTag)) {
        const existing = resultsByPath.get(note.path) || toRankedResult(note, 0, []);
        existing.score += 220;
        existing.reasons = Array.from(new Set([...(existing.reasons || []), `#${tag} 태그 일치`])).slice(0, 5);
        resultsByPath.set(note.path, existing);
      }
    }
  }

  return sortResults(Array.from(resultsByPath.values()));
}

export function searchRelated(index, request) {
  const page = request.pageContext || {};
  const url = normalizeUrl(page.url || '');
  const canonicalUrl = normalizeUrl(page.canonicalUrl || '');
  const domain = domainFromUrl(page.url || '');
  const query = [page.selectedText, page.searchQuery, page.h1, page.title, page.description].filter(Boolean).join(' ');
  const lexicalByPath = new Map(scoreLexicalNotes(index, query, { multiplier: 0.8 }).map((result) => [result.note.path, result]));

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

    const lexical = lexicalByPath.get(note.path);
    if (lexical) {
      score += lexical.score;
      reasons.push(...lexical.reasons);
    }

    if (score > 0) results.push(toRankedResult(note, score, reasons));
  }

  return sortResults(results);
}

function searchTextHybrid(index, query, request = {}) {
  const lexicalResults = searchText(index, query, request);
  const semanticResults = searchSemanticNotes(index, query, {
    limit: Math.max(request.limit || 25, 50)
  });

  return mergeSemanticResults(lexicalResults, semanticResults);
}

function searchRelatedHybrid(index, request) {
  const lexicalResults = searchRelated(index, request);
  const page = request.pageContext || {};
  const semanticQuery = [
    page.selectedText,
    page.searchQuery,
    page.h1,
    page.title,
    page.description,
    request.query
  ].filter(Boolean).join(' ');

  const semanticResults = searchSemanticNotes(index, semanticQuery, {
    limit: Math.max(request.limit || 25, 50),
    threshold: 0.16
  });

  return mergeSemanticResults(lexicalResults, semanticResults);
}

function mergeSemanticResults(lexicalResults, semanticResults) {
  const byPath = new Map();

  for (const result of lexicalResults) {
    byPath.set(result.path, {
      ...result,
      reasons: [...(result.reasons || [])]
    });
  }

  for (const result of semanticResults) {
    const semanticScore = Math.round(result.similarity * SEMANTIC_SCORE_WEIGHT);
    const reason = `로컬 의미 벡터 유사도 ${result.similarity.toFixed(2)}`;
    const existing = byPath.get(result.note.path);

    if (existing) {
      existing.score += semanticScore;
      existing.reasons = Array.from(new Set([...(existing.reasons || []), reason])).slice(0, 5);
      continue;
    }

    byPath.set(result.note.path, toRankedResult(result.note, semanticScore, [reason]));
  }

  return sortResults(Array.from(byPath.values()));
}

function tokenize(text) {
  return Array.from(new Set(tokenizeLexical(text).slice(0, 20)));
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
