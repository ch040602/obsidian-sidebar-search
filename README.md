# Obsidian Sidebar Search

[English](README.md) | [한국어](README.ko.md)

Obsidian Sidebar Search is a local-first Chrome MV3 extension that indexes a user-selected Obsidian Vault folder and searches notes from a Chrome side panel. It does not use an Obsidian REST API and it does not save web pages into the Vault.

## Features

- Open a Chrome side panel for Obsidian note search.
- Select text on any web page and search it as an actual Obsidian tag.
- Normalize tag input so `#research` and `research` return the same tag results.
- Keep tag search strict: full-text matches are not mixed into tag mode.
- Rank full-text and related-note results with local semantic vectors so related notes can surface even when wording differs.
- Use BM25-style word scoring for lexical search instead of substring-only matching.
- Search current-page related notes with normalized source URLs and domains.
- Open matching notes in Obsidian with `obsidian://open`.
- Store the user-approved Vault directory handle in IndexedDB.
- Apply excluded folders and excluded tags before search results are shown.
- Switch the extension UI between English and Korean.

## Install The Extension In Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this repository root folder.
5. Click the extension icon to open the side panel.

## Connect An Obsidian Vault

1. Open the extension side panel or the extension options page.
2. Click `Choose Vault Folder`.
3. Select the root directory of your Obsidian Vault.
4. Click `Rebuild Index`.
5. Set the Obsidian Vault name in Options if you want note links to open a specific Vault.

The extension only reads Markdown files from the folder you select. Vault content stays local in the browser extension context.

## Search

- `Tag` searches only actual Obsidian tags parsed from frontmatter and inline `#tags`.
- `Full` searches titles, aliases, headings, tags, excerpts, and note text with a local BM25-style scorer, then blends in local semantic vector scores.
- `Related Notes` prioritizes current-page URL/domain matches and also compares BM25 lexical matches plus local semantic vectors from the page title, description, selected text, and note text.
- During index rebuild, each included note stores local semantic metadata: a stable 64-bit note id, vector dimensions, version, and the local vector. Excluded folders and excluded tags are filtered before this metadata is saved.
- Semantic search currently uses `src/lib/semantic-search.js`, a browser-local hashed embedding backend with an `IdMapIndex`-style allowlist adapter. It is shaped to match turbovec stable-id and allowlist semantics; the actual turbovec Rust/Python engine can be swapped in at this boundary when an MV3-compatible WASM or native bridge is available.
- The context-menu item `Obsidian tag search: "%s"` sends selected text to the side panel as a tag query.

## Privacy

- Vault content is not sent to external services.
- Vault results are rendered only in the extension side panel.
- Content scripts only report selected text and basic page metadata.
- Vault directory handles are never exposed to web pages.
- Excluded folders are skipped while indexing.
- Excluded tags are filtered before index persistence and again before display.
- Changing excluded folders or excluded tags invalidates the stored Vault index so old note text and semantic vectors are not kept under stale privacy rules.
- Semantic embeddings are computed inside the browser extension context and do not call network APIs.
- Persisted semantic vectors are stored locally with the Vault index in IndexedDB.

## Development

```bash
npm test
npm run check
```

The extension has no web clipping or page-saving pipeline. The codebase is scoped to local Vault indexing, selected-text tag search, related-note search, and Obsidian URI opening.
