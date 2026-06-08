# Obsidian Local Clipper Companion

REST API 없이 Chrome 확장 프로그램이 사용자가 선택한 Obsidian Vault 폴더에 직접 접근해 `.md` 노트를 인덱싱하고, 브라우저에서 드래그한 단어를 Obsidian 태그로 검색하는 사이드패널형 확장입니다.

## 핵심 기능

- Chrome 사이드패널에서 Obsidian Vault 검색 결과 표시
- 웹페이지에서 선택/드래그한 단어를 실제 Obsidian 태그 검색으로 사용
- Vault 폴더를 File System Access API로 직접 선택하고 IndexedDB에 DirectoryHandle 저장
- Markdown frontmatter `tags`, `aliases`, `source_url` 및 본문 태그를 인덱싱
- 검색 결과를 간단히 확인한 뒤 `obsidian://open` URI로 Obsidian 앱에서 직접 열기
- 현재 페이지를 공식 Obsidian Web Clipper API adapter로 Markdown 노트로 저장하고 원격 이미지를 Vault 내부 `_assets` 폴더에 저장
- 공식 Obsidian Web Clipper는 `git subtree`로 `vendor/obsidian-clipper/`에 포함

## 설치 및 테스트

자동 검증:

```bash
npm test
npm run check
```

Chrome에서 수동 확인:

1. Chrome에서 `chrome://extensions` 열기
2. Developer mode 활성화
3. `Load unpacked` 클릭
4. 이 프로젝트 루트 폴더 선택
5. 확장 아이콘 클릭 → 사이드패널 열기
6. `Vault 선택` 클릭 → Obsidian Vault 폴더 선택
7. `인덱스 재생성` 클릭
8. 웹페이지에서 단어 드래그 → 우클릭 → `Obsidian 태그로 검색` 또는 확장 아이콘 클릭

## subtree 추가

공식 Obsidian Web Clipper 소스는 `vendor/obsidian-clipper/`에 subtree로 포함되어 있습니다. 업데이트는 아래 명령으로 수행합니다.

```bash
git fetch obsidian-clipper main --tags
git subtree pull --prefix=vendor/obsidian-clipper obsidian-clipper main --squash
```

subtree 업데이트 후 browser bundle을 다시 만듭니다.

```bash
npm install --prefix vendor/obsidian-clipper
npm run build:clipper-api
```

현재 페이지 저장은 `src/lib/obsidian-clipper-adapter.js`가 `vendor/obsidian-clipper/dist/api.browser.mjs`의 공식 `clip()` API를 호출합니다. upstream 추출 결과가 비어 있거나 현재 탭 HTML을 얻을 수 없으면 `src/lib/basic-clipper.js` fallback으로 저장합니다.

## 웹 클립 저장 경로

Options의 `웹 클립 저장 경로`에서 저장 위치를 설정합니다.

```text
Web Clips/{{title}}.md
Clips/{{domain}}/{{date}} - {{title}}.md
```

지원 변수:

- `{{title}}`
- `{{date}}`
- `{{datetime}}`
- `{{domain}}`

## 보안 원칙

- Vault 내용은 웹페이지 DOM에 주입하지 않습니다.
- 검색 결과는 extension side panel 내부에서만 표시합니다.
- REST API, 외부 서버, 클라우드 전송을 사용하지 않습니다.
- 사용자가 선택한 Vault 폴더에만 접근합니다.
- 민감 폴더는 파일 순회 단계에서 제외하고, 민감 태그는 인덱스 저장 전과 검색 결과 표시 전에 모두 제외합니다.

## 검색 동작

- `태그` 검색은 frontmatter `tags`/`tag`와 본문 `#tag`에서 추출한 실제 태그만 검색합니다.
- `#web-clipper`와 `web-clipper`는 같은 태그로 처리합니다.
- `web` 같은 부분 단어는 `#web-clipper`를 태그 결과로 표시하지 않습니다.
- 제목, 별칭, 본문까지 찾고 싶을 때는 `전체` 검색을 사용합니다.
