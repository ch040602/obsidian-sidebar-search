// 역할: 웹 클립 노트를 Vault 안 어느 경로에 저장할지 결정합니다.
// 사용자는 Options에서 `{{title}}`, `{{date}}`, `{{domain}}` 변수를 포함한 경로 템플릿을 설정할 수 있습니다.

import { domainFromUrl } from './url-utils.js';

export function makeWebClipPath(settings, note, pageContext = {}) {
  const fallbackTemplate = `${settings.defaultClipFolder || 'Web Clips'}/{{title}}.md`;
  const template = String(settings.webClipPathTemplate || fallbackTemplate).trim() || fallbackTemplate;
  const now = new Date();
  const values = {
    title: sanitizeTemplateValue(note.title || pageContext.title || pageContext.h1 || 'Untitled Web Clip'),
    date: now.toISOString().slice(0, 10),
    datetime: now.toISOString().replace(/[:.]/g, '-'),
    domain: sanitizeTemplateValue(domainFromUrl(pageContext.url || '') || 'unknown-domain')
  };

  const rendered = template.replace(/\{\{(title|date|datetime|domain)\}\}/g, (_match, key) => values[key]);
  const normalized = rendered
    .split('/')
    .map((part) => sanitizePathPart(part))
    .filter(Boolean)
    .join('/');

  return normalized.toLowerCase().endsWith('.md') ? normalized : `${normalized}.md`;
}

function sanitizePathPart(part) {
  return String(part || '')
    .replace(/[\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function sanitizeTemplateValue(value) {
  return sanitizePathPart(value).replace(/\//g, '-');
}
