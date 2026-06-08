# AGENTS.md

## Project role

This project is a Chrome MV3 extension that connects Chrome and Obsidian without a REST API. It stores a user-approved Obsidian Vault directory handle in IndexedDB, indexes Markdown notes locally, searches selected browser text as Obsidian tags, and opens results through Obsidian URI.

## Rules

- Do not send Vault content to external services.
- Keep Vault access in extension pages only: side panel/options. Content scripts must not receive directory handles.
- Do not inject note contents into host page DOM.
- Preserve user privacy defaults: excluded folders and excluded tags must be applied before displaying results.
- Keep natural-language comments that explain each file's role.
- Put upstream Obsidian Web Clipper code under `vendor/obsidian-clipper/` through git subtree.
- Keep local-only code under `src/lib/` and UI code under `src/sidepanel/` and `src/options/`.
