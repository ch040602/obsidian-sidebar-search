// 역할: vendor/obsidian-clipper의 공식 clipping API를 현재 로컬 Vault 저장 파이프라인에 맞게 감쌉니다.
// vendor 코드는 직접 수정하지 않고, 이 adapter에서 template과 fallback만 관리합니다.

import { buildBasicWebClipNote } from './basic-clipper.js';

const CLIPPER_API_PATH = '../../vendor/obsidian-clipper/dist/api.browser.mjs';

export async function buildObsidianClipperNote({ pageContext, localImages = [] }) {
  if (!pageContext?.html || typeof DOMParser === 'undefined') {
    return { ...buildBasicWebClipNote({ pageContext, localImages }), engine: 'basic-fallback' };
  }

  try {
    const { clip } = await import(CLIPPER_API_PATH);
    const result = await clip({
      html: pageContext.html,
      url: pageContext.url || '',
      documentParser: new DOMParser(),
      template: buildTemplate()
    });

    if (!String(result.content || '').trim()) {
      return { ...buildBasicWebClipNote({ pageContext, localImages }), engine: 'basic-fallback-empty-upstream' };
    }

    return {
      title: normalizeTitle(result.noteName, pageContext),
      markdown: appendLocalSections(result.fullContent, { pageContext, localImages }),
      engine: 'obsidian-clipper',
      variables: result.variables
    };
  } catch (error) {
    console.warn('Obsidian Web Clipper adapter failed; using basic fallback.', error);
    return { ...buildBasicWebClipNote({ pageContext, localImages }), engine: 'basic-fallback' };
  }
}

function buildTemplate() {
  return {
    id: 'local-companion-web-clip',
    name: 'Local Companion Web Clip',
    behavior: 'create',
    noteNameFormat: '{{title}}',
    path: '',
    noteContentFormat: '# {{title}}\n\n{{content}}\n',
    properties: [
      { name: 'type', value: 'web_clip', type: 'text' },
      { name: 'title', value: '{{title}}', type: 'text' },
      { name: 'source_url', value: '{{url}}', type: 'text' },
      { name: 'source_domain', value: '{{domain}}', type: 'text' },
      { name: 'captured_at', value: '{{date}}', type: 'datetime' },
      { name: 'tags', value: 'web-clip', type: 'multitext' }
    ]
  };
}

function appendLocalSections(markdown, { pageContext, localImages }) {
  const sections = [];

  if (pageContext.selectedText) {
    sections.push(`## Selected text\n\n> ${String(pageContext.selectedText).replace(/\n/g, '\n> ')}`);
  }

  const imageLines = localImages.map((img) => `![${escapeMarkdown(img.alt || '')}](${img.localPath})`).join('\n');
  sections.push(`## Local images\n\n${imageLines || '_No images saved._'}`);

  return `${String(markdown || '').trim()}\n\n${sections.join('\n\n')}\n\n`;
}

function escapeMarkdown(text) {
  return String(text || '').replace(/[\[\]]/g, '');
}

function normalizeTitle(noteName, pageContext) {
  if (noteName && noteName !== 'Untitled') return noteName;
  return pageContext.title || pageContext.h1 || 'Untitled Web Clip';
}
