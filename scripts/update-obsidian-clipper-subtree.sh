#!/usr/bin/env bash
set -euo pipefail

# 역할: 이미 추가된 공식 Obsidian Web Clipper subtree를 최신 main으로 갱신합니다.

REMOTE_NAME="obsidian-clipper"
PREFIX="vendor/obsidian-clipper"
REF="main"

git fetch "$REMOTE_NAME" "$REF" --tags

git subtree pull --prefix="$PREFIX" "$REMOTE_NAME" "$REF" --squash
