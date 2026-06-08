// 역할: 공식 Obsidian Web Clipper subtree를 연결하기 전까지 사용할 최소 클리핑 모듈입니다.
// 실제 제품에서는 vendor/obsidian-clipper/src/api.ts의 clip() 결과를 이 모듈 대신 사용하면 됩니다.

import { domainFromUrl } from './url-utils.js';

export function buildBasicWebClipNote({ pageContext, localImages = [] }) {
  const now = new Date().toISOString();
  const title = sanitizeTitle(pageContext.title || pageContext.h1 || 'Untitled Web Clip');
  const domain = domainFromUrl(pageContext.url || '');

  const imageLines = localImages.map((img) => `![${escapeMarkdown(img.alt || '')}](${img.localPath})`).join('\n');

  return {
    title,
    markdown: `---\ntype: web_clip\ntitle: "${escapeYaml(title)}"\nsource_url: "${escapeYaml(pageContext.url || '')}"\nsource_domain: "${escapeYaml(domain)}"\ncaptured_at: "${now}"\ntags:\n  - web-clip\n---\n\n# ${title}\n\n## Source\n\n- URL: ${pageContext.url || ''}\n- Domain: ${domain}\n- Captured: ${now}\n\n## Page summary\n\n${pageContext.description || ''}\n\n## Selected text\n\n${pageContext.selectedText ? `> ${pageContext.selectedText.replace(/\n/g, '\n> ')}` : '_No selected text captured._'}\n\n## Local images\n\n${imageLines || '_No images saved._'}\n\n## Notes\n\n`
  };
}

export function makeClipPath(folder, title) {
  const safe = sanitizeTitle(title)
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  return `${folder}/${safe}.md`;
}

function sanitizeTitle(text) {
  return String(text || 'Untitled').replace(/\s+/g, ' ').trim();
}

function escapeYaml(text) {
  return String(text || '').replace(/"/g, '\\"');
}

function escapeMarkdown(text) {
  return String(text || '').replace(/[\[\]]/g, '');
}
