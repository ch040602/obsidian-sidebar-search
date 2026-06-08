// 역할: Obsidian Markdown 파일에서 검색에 필요한 최소 메타데이터를 추출합니다.
// 외부 YAML 라이브러리를 쓰지 않고 frontmatter의 흔한 패턴만 가볍게 파싱합니다.

import { domainFromUrl, normalizeUrl } from './url-utils.js';
import { normalizeTagForCompare } from './tag-utils.js';

export function parseMarkdownNote({ path, markdown, mtime = 0 }) {
  const { frontmatter, body } = splitFrontmatter(markdown);
  const title = readTitle(path, body, frontmatter);
  const tags = collectTags(frontmatter, body);
  const aliases = collectListField(frontmatter, 'aliases');
  const sourceUrls = collectSourceUrls(frontmatter, body);
  const domains = sourceUrls.map(domainFromUrl).filter(Boolean);

  return {
    path,
    title,
    aliases,
    tags,
    sourceUrls,
    normalizedSourceUrls: sourceUrls.map(normalizeUrl),
    domains,
    headings: collectHeadings(body),
    excerpt: makeExcerpt(body),
    contentText: compactText(body),
    frontmatter,
    mtime
  };
}

export function splitFrontmatter(markdown) {
  const text = String(markdown || '');
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
    return { frontmatter: {}, body: text };
  }

  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { frontmatter: {}, body: text };

  const raw = match[1].trim();
  const body = text.slice(match[0].length);
  return { frontmatter: parseSimpleYaml(raw), body };
}

function parseSimpleYaml(raw) {
  const result = {};
  const lines = raw.split(/\r?\n/);
  let currentKey = '';

  for (const line of lines) {
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    const listMatch = line.match(/^\s+-\s+(.*)$/);

    if (keyMatch) {
      currentKey = keyMatch[1];
      const value = keyMatch[2].trim();

      if (!value) {
        result[currentKey] = [];
      } else if (value.startsWith('[') && value.endsWith(']')) {
        result[currentKey] = value.slice(1, -1).split(',').map(cleanScalar).filter(Boolean);
      } else {
        result[currentKey] = cleanScalar(value);
      }
      continue;
    }

    if (currentKey && listMatch && Array.isArray(result[currentKey])) {
      result[currentKey].push(cleanScalar(listMatch[1]));
    }
  }

  return result;
}

function cleanScalar(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '');
}

function readTitle(path, body, frontmatter) {
  if (frontmatter.title) return String(frontmatter.title);
  const h1 = body.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return path.split('/').pop().replace(/\.md$/i, '');
}

function collectTags(frontmatter, body) {
  const tags = new Set();

  for (const tag of collectListField(frontmatter, 'tags')) tags.add(normalizeTagForCompare(tag));
  for (const tag of collectListField(frontmatter, 'tag')) tags.add(normalizeTagForCompare(tag));

  const inlineMatches = body.matchAll(/(^|\s)#([\p{L}\p{N}_/-][\p{L}\p{N}_/-]*)/gu);
  for (const match of inlineMatches) tags.add(normalizeTagForCompare(match[2]));

  return Array.from(tags).filter(Boolean).sort();
}

function collectListField(frontmatter, key) {
  const value = frontmatter[key];
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return String(value).split(/[ ,]+/).map((item) => item.trim()).filter(Boolean);
}

function collectSourceUrls(frontmatter, body) {
  const keys = ['source_url', 'source', 'url', 'canonical_url'];
  const urls = new Set();

  for (const key of keys) {
    const value = frontmatter[key];
    if (Array.isArray(value)) value.forEach((item) => maybeAddUrl(urls, item));
    else maybeAddUrl(urls, value);
  }

  const bodyUrls = body.match(/https?:\/\/[^\s)\]>"']+/g) || [];
  bodyUrls.slice(0, 50).forEach((url) => maybeAddUrl(urls, url));

  return Array.from(urls);
}

function maybeAddUrl(urls, value) {
  const text = String(value || '').trim();
  if (/^https?:\/\//i.test(text)) urls.add(text);
}

function collectHeadings(body) {
  return Array.from(body.matchAll(/^#{1,6}\s+(.+)$/gm)).map((m) => m[1].trim()).slice(0, 50);
}

function makeExcerpt(body) {
  return compactText(body).slice(0, 280);
}

function compactText(body) {
  return String(body || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]*\)/g, ' ')
    .replace(/[#>*_`~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
