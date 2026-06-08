# Obsidian Sidebar Search

[English](README.md) | [한국어](README.ko.md)

Obsidian Sidebar Search is a local-first Chrome MV3 extension that indexes a user-selected Obsidian Vault folder and searches notes from a Chrome side panel. It does not use an Obsidian REST API and it does not save web pages into the Vault.

## Features

- Open a Chrome side panel for Obsidian note search.
- Select text on any web page and search it as an actual Obsidian tag.
- Normalize tag input so `#research` and `research` return the same tag results.
- Keep tag search strict: full-text matches are not mixed into tag mode.
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
- `Full` searches titles, aliases, headings, tags, excerpts, and note text.
- `Related Notes` searches notes connected to the current page URL/domain.
- The context-menu item `Obsidian tag search: "%s"` sends selected text to the side panel as a tag query.

## Privacy

- Vault content is not sent to external services.
- Vault results are rendered only in the extension side panel.
- Content scripts only report selected text and basic page metadata.
- Vault directory handles are never exposed to web pages.
- Excluded folders are skipped while indexing.
- Excluded tags are filtered before index persistence and again before display.

## Development

```bash
npm test
npm run check
```

The extension has no web clipping or page-saving pipeline. The codebase is scoped to local Vault indexing, selected-text tag search, related-note search, and Obsidian URI opening.
