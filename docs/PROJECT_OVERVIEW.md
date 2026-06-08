# Project Overview

## Goal

This project is a Chrome MV3 extension that searches a local Obsidian Vault from a side panel without an Obsidian REST API.

Primary flow:

```text
1. The user chooses an Obsidian Vault folder in Options or the side panel.
2. The extension stores the approved DirectoryHandle in IndexedDB.
3. The extension reads Markdown files through the File System Access API.
4. It indexes frontmatter tags, inline #tags, titles, aliases, source URLs, and domains.
5. The user selects text on a web page.
6. A context menu, shortcut, or action button opens the side panel.
7. The selected text is normalized and searched as an actual Obsidian tag.
8. The user opens a matching note with an obsidian://open URI.
```

## Modules

| Module | File | Role |
|---|---|---|
| Background router | `src/background/background.js` | Handles action clicks, shortcuts, context menu searches, and side panel opening |
| Selection tracker | `src/content/selection-tracker.js` | Sends selected text and basic page metadata from web pages |
| Vault access | `src/lib/vault-access.js` | Reads the selected Vault folder and rebuilds the Markdown index |
| IndexedDB store | `src/lib/idb-store.js` | Stores the DirectoryHandle and local search index |
| Markdown parser | `src/lib/markdown-parser.js` | Extracts Obsidian note metadata |
| Search engine | `src/lib/search-engine.js` | Runs tag, full-text, and current-page related search |
| Side panel | `src/sidepanel/sidepanel.js` | Renders search controls, results, and Obsidian open actions |
| Options | `src/options/options.js` | Manages Vault selection, language, filters, and index rebuilds |

## Why No REST API

- No Obsidian plugin installation is required.
- The extension only accesses the user-selected folder.
- There are no API keys, localhost servers, HTTPS certificate issues, or CORS concerns.
- Large Vault indexing and permission renewal are handled inside the extension.

## Tag Search

Example selected text:

```text
Machine Learning
```

Generated tag candidates:

```text
machine-learning
machinelearning
machine
learning
```

Tag mode searches only actual tags parsed from frontmatter and inline Markdown tags:

```yaml
---
tags:
  - machine-learning
  - chrome-extension
aliases:
  - Machine Learning
source_url: https://example.com
---
```

```md
This note also contains #machine-learning inline.
```

`#tag` and `tag` input are treated the same, but partial words do not match longer tags in tag mode.

## Obsidian Open URI

Search result buttons generate:

```text
obsidian://open?vault=<vaultName>&file=<path-without-md>
```

The Vault name is optional and can be set in Options. If it is blank, Obsidian chooses the default behavior.

## Privacy Boundary

- Vault content stays in extension pages and IndexedDB.
- Content scripts do not receive Vault handles or note contents.
- Search results are not injected into host page DOM.
- Excluded folders are skipped during indexing.
- Excluded tags are filtered before index persistence and before display.
