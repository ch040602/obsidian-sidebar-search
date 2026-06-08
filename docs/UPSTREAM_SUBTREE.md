# Obsidian Web Clipper subtree 운영

## 추가

```bash
git remote add obsidian-clipper https://github.com/obsidianmd/obsidian-clipper.git
git fetch obsidian-clipper main --tags
git subtree add --prefix=vendor/obsidian-clipper obsidian-clipper main --squash
```

## 업데이트

```bash
git fetch obsidian-clipper main --tags
git subtree pull --prefix=vendor/obsidian-clipper obsidian-clipper main --squash
npm install --prefix vendor/obsidian-clipper
npm run build:clipper-api
```

## 정책

- `vendor/obsidian-clipper/`는 upstream 원본 보존 영역입니다.
- 우리 기능은 `src/lib`, `src/sidepanel`, `src/options`에 둡니다.
- upstream에 PR할 수정이 아니라면 vendor 내부 직접 수정은 피합니다.
- 공식 Clipper 추출 결과를 받은 뒤 로컬 이미지 저장 파이프라인과 Vault writer에 연결합니다.
