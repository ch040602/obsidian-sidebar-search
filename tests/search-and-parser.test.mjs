import test from 'node:test';
import assert from 'node:assert/strict';

import { parseMarkdownNote, splitFrontmatter } from '../src/lib/markdown-parser.js';
import { buildObsidianOpenUri } from '../src/lib/obsidian-uri.js';
import { searchVaultIndex } from '../src/lib/search-engine.js';
import { normalizeTagInput, tagVariantsFromSelection } from '../src/lib/tag-utils.js';
import { normalizeUrl, domainFromUrl } from '../src/lib/url-utils.js';
import { shouldIndexParsedNote } from '../src/lib/vault-access.js';
import { normalizeLanguage, translate } from '../src/lib/i18n.js';
import { makeWebClipPath } from '../src/lib/web-clip-path.js';
import { buildObsidianClipperNote } from '../src/lib/obsidian-clipper-adapter.js';

globalThis.chrome = {
  storage: {
    local: {
      async get() {
        return {
          settings: {
            excludedFolders: ['Private'],
            excludedTags: ['private', 'secret']
          }
        };
      }
    }
  }
};

test('parses LF and CRLF frontmatter tags before privacy filtering', () => {
  const lf = splitFrontmatter('---\ntags:\n  - private\n---\n# Hidden');
  const crlf = splitFrontmatter('---\r\ntags:\r\n  - private\r\n---\r\n# Hidden');

  assert.deepEqual(lf.frontmatter.tags, ['private']);
  assert.deepEqual(crlf.frontmatter.tags, ['private']);
  assert.equal(crlf.body, '# Hidden');

  const note = parseMarkdownNote({
    path: 'Private Note.md',
    markdown: '---\r\ntags: [Private, web-clip]\r\naliases:\r\n  - 비밀 노트\r\nsource_url: "https://www.example.com/a?utm_source=x&keep=1#frag"\r\n---\r\n# Hidden\r\n본문 #연구/자료'
  });

  assert.deepEqual(note.tags, ['private', 'web-clip', '연구/자료']);
  assert.deepEqual(note.aliases, ['비밀 노트']);
  assert.deepEqual(note.normalizedSourceUrls, ['https://example.com/a?keep=1']);
  assert.deepEqual(note.domains, ['example.com']);
});

test('normalizes selection text into useful Obsidian tag variants', () => {
  assert.equal(normalizeTagInput('#Web Clipper!'), 'web-clipper');
  assert.deepEqual(tagVariantsFromSelection('Obsidian Web Clipper'), [
    'obsidian-web-clipper',
    'obsidianwebclipper',
    'obsidian',
    'web',
    'clipper'
  ]);
  assert.equal(normalizeTagInput('한국어 태그'), '한국어-태그');
});

test('tag search only returns actual tags and ignores hash prefix differences', async () => {
  const index = [
    {
      path: 'Public/Web Clipper.md',
      title: 'Reference',
      tags: ['web-clipper'],
      aliases: [],
      headings: [],
      excerpt: 'public note',
      contentText: 'public note',
      mtime: 3
    },
    {
      path: 'Public/Nested.md',
      title: 'Nested',
      tags: ['web-clipper/plugin'],
      aliases: [],
      headings: [],
      excerpt: 'nested tag',
      contentText: 'nested tag',
      mtime: 4
    },
    {
      path: 'Public/Text Only.md',
      title: 'Web Clipper',
      tags: [],
      aliases: ['Web Clipper'],
      headings: ['Web Clipper'],
      excerpt: 'web clipper appears only in content',
      contentText: 'web clipper appears only in content',
      mtime: 5
    },
    {
      path: 'Private/Visible Tag.md',
      title: 'Should not display',
      tags: ['web-clipper'],
      aliases: [],
      headings: [],
      excerpt: 'private folder',
      contentText: 'private folder',
      mtime: 2
    },
    {
      path: 'Public/Secret.md',
      title: 'Should not display',
      tags: ['web-clipper', 'secret'],
      aliases: [],
      headings: [],
      excerpt: 'secret tag',
      contentText: 'secret tag',
      mtime: 1
    }
  ];

  const withoutHash = await searchVaultIndex(index, {
    mode: 'tag',
    query: 'web-clipper',
    limit: 10
  });
  const withHash = await searchVaultIndex(index, {
    mode: 'tag',
    query: '#web-clipper',
    limit: 10
  });

  assert.deepEqual(withoutHash.map((result) => result.path), [
    'Public/Web Clipper.md',
    'Public/Nested.md'
  ]);
  assert.deepEqual(withHash.map((result) => result.path), withoutHash.map((result) => result.path));
  assert.equal(withoutHash.some((result) => result.path === 'Public/Text Only.md'), false);
});

test('tag search does not match partial words inside real tags', async () => {
  const index = [
    {
      path: 'Public/Web Clipper.md',
      title: 'Reference',
      tags: ['web-clipper'],
      aliases: [],
      headings: [],
      excerpt: '',
      contentText: '',
      mtime: 1
    }
  ];

  const results = await searchVaultIndex(index, {
    mode: 'tag',
    query: 'web',
    limit: 10
  });

  assert.deepEqual(results, []);
});

test('text search also matches tag variants from selected words', async () => {
  const index = [
    {
      path: 'Public/Web Clipper.md',
      title: 'Reference',
      tags: ['web-clipper'],
      aliases: [],
      headings: [],
      excerpt: '',
      contentText: '',
      mtime: 1
    }
  ];

  const results = await searchVaultIndex(index, {
    mode: 'text',
    query: 'Web Clipper',
    limit: 10
  });

  assert.equal(results[0].path, 'Public/Web Clipper.md');
  assert.ok(results[0].reasons.includes('#web-clipper 태그 일치'));
});

test('blocks excluded-tag notes before index persistence', () => {
  const settings = { excludedTags: ['private', 'secret'] };

  assert.equal(
    shouldIndexParsedNote({ tags: ['web-clipper', 'private'] }, settings),
    false
  );
  assert.equal(
    shouldIndexParsedNote({ tags: ['web-clipper'] }, settings),
    true
  );
});

test('supports related search using normalized source URL and domain', async () => {
  const index = [
    {
      path: 'Sources/Exact.md',
      title: 'Exact',
      tags: [],
      aliases: [],
      headings: [],
      excerpt: '',
      contentText: '',
      normalizedSourceUrls: ['https://example.com/article?id=1'],
      domains: ['example.com'],
      mtime: 1
    },
    {
      path: 'Sources/Domain.md',
      title: 'Domain',
      tags: [],
      aliases: [],
      headings: [],
      excerpt: '',
      contentText: '',
      normalizedSourceUrls: ['https://example.com/other'],
      domains: ['example.com'],
      mtime: 2
    }
  ];

  const results = await searchVaultIndex(index, {
    mode: 'related',
    pageContext: {
      url: 'https://www.example.com/article?id=1&utm_source=newsletter#comments',
      title: 'Article'
    }
  });

  assert.equal(results[0].path, 'Sources/Exact.md');
  assert.equal(results[0].score, 1750);
  assert.equal(results[1].path, 'Sources/Domain.md');
});

test('builds Obsidian open URIs for nested and Korean paths', () => {
  const withVault = buildObsidianOpenUri({
    vaultName: 'My Vault',
    filePath: '폴더/노트 이름.md'
  });
  const parsed = new URL(withVault);

  assert.equal(parsed.protocol, 'obsidian:');
  assert.equal(parsed.searchParams.get('vault'), 'My Vault');
  assert.equal(parsed.searchParams.get('file'), '폴더/노트 이름');

  const withoutVault = buildObsidianOpenUri({
    vaultName: '',
    filePath: 'Nested/Note.md'
  });

  assert.equal(new URL(withoutVault).searchParams.has('vault'), false);
  assert.equal(new URL(withoutVault).searchParams.get('file'), 'Nested/Note');
});

test('normalizes URLs and domains consistently', () => {
  assert.equal(
    normalizeUrl('https://www.example.com/a/?utm_source=x&keep=1#section'),
    'https://example.com/a/?keep=1'
  );
  assert.equal(domainFromUrl('https://www.example.com/a'), 'example.com');
});

test('translates UI labels for Korean and English language choices', () => {
  assert.equal(normalizeLanguage('en'), 'en');
  assert.equal(normalizeLanguage('unknown'), 'ko');
  assert.equal(translate('ko', 'tagResults', { tag: 'web-clipper', count: 2 }), '실제 태그 검색: #web-clipper · 2개 결과');
  assert.equal(translate('en', 'tagResults', { tag: 'web-clipper', count: 2 }), 'Actual tag search: #web-clipper · 2 results');
});

test('builds configurable web clip save paths safely', () => {
  const path = makeWebClipPath(
    { webClipPathTemplate: 'Clips/{{domain}}/{{date}} - {{title}}' },
    { title: 'A/B: C?' },
    { url: 'https://www.example.com/post' }
  );

  assert.match(path, /^Clips\/example\.com\/\d{4}-\d{2}-\d{2} - A-B- C-\.md$/);
});

test('obsidian clipper adapter falls back when full page html is unavailable', async () => {
  const note = await buildObsidianClipperNote({
    pageContext: {
      title: 'Fallback Page',
      url: 'https://example.com',
      description: 'Short description',
      selectedText: 'Selected text'
    },
    localImages: []
  });

  assert.equal(note.engine, 'basic-fallback');
  assert.equal(note.title, 'Fallback Page');
  assert.match(note.markdown, /source_url: "https:\/\/example\.com"/);
});
