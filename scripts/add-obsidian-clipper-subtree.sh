#!/usr/bin/env bash
set -euo pipefail

# 역할: 공식 obsidianmd/obsidian-clipper를 vendor/obsidian-clipper 아래에 git subtree로 추가합니다.
# 이미 remote가 있으면 재사용하고, 없으면 추가합니다.

REMOTE_NAME="obsidian-clipper"
REMOTE_URL="https://github.com/obsidianmd/obsidian-clipper.git"
PREFIX="vendor/obsidian-clipper"
REF="main"

if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  git remote add "$REMOTE_NAME" "$REMOTE_URL"
fi

git fetch "$REMOTE_NAME" "$REF" --tags

git subtree add --prefix="$PREFIX" "$REMOTE_NAME" "$REF" --squash
