import test from 'node:test';
import assert from 'node:assert/strict';

import { parseMarkdownNote, splitFrontmatter } from '../src/lib/markdown-parser.js';
import { buildObsidianOpenUri } from '../src/lib/obsidian-uri.js';
import { searchVaultIndex } from '../src/lib/search-engine.js';
import { buildSemanticSearchMetadata, embedLocalText, searchSemanticNotes, stableNoteId } from '../src/lib/semantic-search.js';
import { privacyIndexSettingsChanged } from '../src/lib/settings.js';
import { normalizeTagInput, tagVariantsFromSelection } from '../src/lib/tag-utils.js';
import { normalizeUrl, domainFromUrl } from '../src/lib/url-utils.js';
import { buildIndexedNoteRecord, shouldIndexParsedNote } from '../src/lib/vault-access.js';
import { normalizeLanguage, translate } from '../src/lib/i18n.js';

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
    markdown: '---\r\ntags: [Private, reference]\r\naliases:\r\n  - 비밀 노트\r\nsource_url: "https://www.example.com/a?utm_source=x&keep=1#frag"\r\n---\r\n# Hidden\r\n본문 #연구/자료'
  });

  assert.deepEqual(note.tags, ['private', 'reference', '연구/자료']);
  assert.deepEqual(note.aliases, ['비밀 노트']);
  assert.deepEqual(note.normalizedSourceUrls, ['https://example.com/a?keep=1']);
  assert.deepEqual(note.domains, ['example.com']);
});

test('normalizes selection text into useful Obsidian tag variants', () => {
  assert.equal(normalizeTagInput('#Machine Learning!'), 'machine-learning');
  assert.deepEqual(tagVariantsFromSelection('Deep Learning'), [
    'deep-learning',
    'deeplearning',
    'deep',
    'learning'
  ]);
  assert.equal(normalizeTagInput('한국어 태그'), '한국어-태그');
});

test('tag search only returns actual tags and ignores hash prefix differences', async () => {
  const index = [
    {
      path: 'Public/Machine Learning.md',
      title: 'Reference',
      tags: ['machine-learning'],
      aliases: [],
      headings: [],
      excerpt: 'public note',
      contentText: 'public note',
      mtime: 3
    },
    {
      path: 'Public/Nested.md',
      title: 'Nested',
      tags: ['machine-learning/papers'],
      aliases: [],
      headings: [],
      excerpt: 'nested tag',
      contentText: 'nested tag',
      mtime: 4
    },
    {
      path: 'Public/Text Only.md',
      title: 'Machine Learning',
      tags: [],
      aliases: ['Machine Learning'],
      headings: ['Machine Learning'],
      excerpt: 'machine learning appears only in content',
      contentText: 'machine learning appears only in content',
      mtime: 5
    },
    {
      path: 'Private/Visible Tag.md',
      title: 'Should not display',
      tags: ['machine-learning'],
      aliases: [],
      headings: [],
      excerpt: 'private folder',
      contentText: 'private folder',
      mtime: 2
    },
    {
      path: 'Public/Secret.md',
      title: 'Should not display',
      tags: ['machine-learning', 'secret'],
      aliases: [],
      headings: [],
      excerpt: 'secret tag',
      contentText: 'secret tag',
      mtime: 1
    }
  ];

  const withoutHash = await searchVaultIndex(index, {
    mode: 'tag',
    query: 'machine-learning',
    limit: 10
  });
  const withHash = await searchVaultIndex(index, {
    mode: 'tag',
    query: '#machine-learning',
    limit: 10
  });

  assert.deepEqual(withoutHash.map((result) => result.path), [
    'Public/Machine Learning.md',
    'Public/Nested.md'
  ]);
  assert.deepEqual(withHash.map((result) => result.path), withoutHash.map((result) => result.path));
  assert.equal(withoutHash.some((result) => result.path === 'Public/Text Only.md'), false);
});

test('tag search does not match partial words inside real tags', async () => {
  const index = [
    {
      path: 'Public/Machine Learning.md',
      title: 'Reference',
      tags: ['machine-learning'],
      aliases: [],
      headings: [],
      excerpt: '',
      contentText: '',
      mtime: 1
    }
  ];

  const results = await searchVaultIndex(index, {
    mode: 'tag',
    query: 'machine',
    limit: 10
  });

  assert.deepEqual(results, []);
});

test('text search also matches tag variants from selected words', async () => {
  const index = [
    {
      path: 'Public/Machine Learning.md',
      title: 'Reference',
      tags: ['machine-learning'],
      aliases: [],
      headings: [],
      excerpt: '',
      contentText: '',
      mtime: 1
    }
  ];

  const results = await searchVaultIndex(index, {
    mode: 'text',
    query: 'Machine Learning',
    limit: 10
  });

  assert.equal(results[0].path, 'Public/Machine Learning.md');
  assert.ok(results[0].reasons.includes('#machine-learning 태그 일치'));
});

test('text search uses BM25-style word scoring instead of substring-only matches', async () => {
  const index = [
    {
      path: 'Public/Exact Retrieval.md',
      title: 'Retrieval Systems',
      tags: [],
      aliases: [],
      headings: ['Retrieval architecture'],
      excerpt: 'retrieval retrieval retrieval ranking',
      contentText: 'retrieval retrieval retrieval ranking',
      mtime: 1
    },
    {
      path: 'Public/String Noise.md',
      title: 'Irrelevant',
      tags: [],
      aliases: [],
      headings: [],
      excerpt: 'pretrieval substring should not dominate',
      contentText: 'pretrieval substring should not dominate',
      mtime: 5
    }
  ];

  const results = await searchVaultIndex(index, {
    mode: 'text',
    query: 'retrieval',
    limit: 10
  });

  assert.equal(results[0].path, 'Public/Exact Retrieval.md');
  assert.ok(results[0].reasons.some((reason) => reason.includes('BM25')));
  assert.equal(results.some((result) => result.path === 'Public/String Noise.md'), false);
});

test('text search includes local semantic vector matches without sending note text away', async () => {
  const index = [
    {
      path: 'Public/Systems.md',
      title: 'Systems',
      tags: [],
      aliases: [],
      headings: ['Model notes'],
      excerpt: 'artificial intelligence models and evaluation',
      contentText: 'artificial intelligence models and evaluation',
      mtime: 2
    },
    {
      path: 'Public/Cooking.md',
      title: 'Cooking',
      tags: [],
      aliases: [],
      headings: [],
      excerpt: 'recipe timing and ingredients',
      contentText: 'recipe timing and ingredients',
      mtime: 3
    },
    {
      path: 'Private/Hidden.md',
      title: 'Hidden',
      tags: [],
      aliases: [],
      headings: [],
      excerpt: 'artificial intelligence private note',
      contentText: 'artificial intelligence private note',
      mtime: 4
    }
  ];

  const results = await searchVaultIndex(index, {
    mode: 'text',
    query: 'AI',
    limit: 10
  });

  assert.equal(results[0].path, 'Public/Systems.md');
  assert.ok(results[0].reasons.some((reason) => reason.startsWith('로컬 의미 벡터 유사도')));
  assert.equal(results.some((result) => result.path.startsWith('Private/')), false);
});

test('related search uses local semantic vectors when URL and lexical clues are weak', async () => {
  const index = [
    {
      path: 'Public/Metadata.md',
      title: 'Metadata taxonomy',
      tags: ['knowledge-management'],
      aliases: [],
      headings: [],
      excerpt: 'labels and metadata for organizing notes',
      contentText: 'labels and metadata for organizing notes',
      normalizedSourceUrls: [],
      domains: [],
      mtime: 1
    }
  ];

  const results = await searchVaultIndex(index, {
    mode: 'related',
    pageContext: {
      url: 'https://example.com/unmatched',
      title: 'Tag strategy',
      description: ''
    },
    limit: 10
  });

  assert.equal(results[0].path, 'Public/Metadata.md');
  assert.ok(results[0].reasons.some((reason) => reason.startsWith('로컬 의미 벡터 유사도')));
});

test('local semantic index follows turbovec-style ids and allowlist filtering', () => {
  const index = [
    {
      path: 'Public/Allowed.md',
      title: 'Allowed',
      aliases: [],
      tags: [],
      headings: [],
      excerpt: 'artificial intelligence',
      contentText: 'artificial intelligence'
    },
    {
      path: 'Public/Blocked.md',
      title: 'Blocked',
      aliases: [],
      tags: [],
      headings: [],
      excerpt: 'artificial intelligence',
      contentText: 'artificial intelligence'
    }
  ];
  const queryVector = embedLocalText('AI');

  assert.equal(queryVector.length, 128);
  assert.equal(typeof stableNoteId('Public/Allowed.md'), 'bigint');
  assert.ok(stableNoteId('Public/Allowed.md') > 0xffffffffn);

  const results = searchSemanticNotes(index, 'AI', {
    allowPaths: ['Public/Allowed.md'],
    limit: 10
  });

  assert.deepEqual(results.map((result) => result.note.path), ['Public/Allowed.md']);
});

test('local embedding path does not call network APIs', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error('network should not be used for local semantic search');
  };

  try {
    const results = searchSemanticNotes([
      {
        path: 'Public/Local.md',
        title: 'Local AI note',
        aliases: [],
        tags: [],
        headings: [],
        excerpt: 'artificial intelligence',
        contentText: 'artificial intelligence'
      }
    ], 'AI', { limit: 5 });

    assert.equal(results[0].note.path, 'Public/Local.md');
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('indexed note records persist semantic metadata for reuse during search', () => {
  const note = parseMarkdownNote({
    path: 'Public/Semantic.md',
    markdown: '# Semantic\nartificial intelligence retrieval'
  });

  const record = buildIndexedNoteRecord(note);

  assert.equal(record.semanticSearch.version, 1);
  assert.equal(typeof record.semanticSearch.id, 'string');
  assert.equal(record.semanticSearch.dimensions, 128);
  assert.equal(record.semanticSearch.vector.length, 128);
  assert.ok(record.semanticSearch.vector.some((value) => value !== 0));
});

test('privacy filter changes invalidate the persisted vault index', () => {
  const before = {
    excludedFolders: ['Private', '.git'],
    excludedTags: ['secret']
  };

  assert.equal(privacyIndexSettingsChanged(before, {
    excludedFolders: ['.git', 'private'],
    excludedTags: ['SECRET']
  }), false);

  assert.equal(privacyIndexSettingsChanged(before, {
    excludedFolders: ['Private', '.git', 'Archive'],
    excludedTags: ['secret']
  }), true);

  assert.equal(privacyIndexSettingsChanged(before, {
    excludedFolders: ['Private', '.git'],
    excludedTags: ['secret', 'personal']
  }), true);
});

test('semantic search reuses persisted vectors when present', () => {
  const semanticSource = {
    path: 'Public/Reused.md',
    title: 'AI source',
    aliases: [],
    tags: [],
    headings: [],
    excerpt: 'artificial intelligence',
    contentText: 'artificial intelligence'
  };
  const note = {
    ...semanticSource,
    title: 'Cooking note',
    excerpt: 'recipe ingredients',
    contentText: 'recipe ingredients',
    semanticSearch: buildSemanticSearchMetadata(semanticSource)
  };

  const results = searchSemanticNotes([note], 'AI', { limit: 5 });

  assert.equal(results[0].note.path, 'Public/Reused.md');
});

test('blocks excluded-tag notes before index persistence', () => {
  const settings = { excludedTags: ['private', 'secret'] };

  assert.equal(
    shouldIndexParsedNote({ tags: ['machine-learning', 'private'] }, settings),
    false
  );
  assert.equal(
    shouldIndexParsedNote({ tags: ['machine-learning'] }, settings),
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
  assert.equal(translate('ko', 'tagResults', { tag: 'machine-learning', count: 2 }), '실제 태그 검색: #machine-learning · 2개 결과');
  assert.equal(translate('en', 'tagResults', { tag: 'machine-learning', count: 2 }), 'Actual tag search: #machine-learning · 2 results');
});
