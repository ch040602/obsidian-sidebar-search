# 프로젝트 전체 개요

## 목표

이 확장은 Obsidian REST API 없이 Chrome 자체 권한만으로 사용자의 로컬 Vault를 검색합니다.

핵심 사용 흐름:

```text
1. 사용자가 Options 또는 Side Panel에서 Vault 폴더를 선택
2. 확장이 File System Access API로 .md 파일을 직접 읽음
3. frontmatter tags, inline #tags, title, aliases, source_url을 인덱싱
4. 사용자가 웹페이지에서 단어를 드래그
5. 우클릭 메뉴 또는 확장 아이콘으로 Side Panel 열기
6. 선택어를 Obsidian 태그로 정규화해 검색
7. 결과를 Side Panel에서 간략 확인
8. 필요한 노트는 obsidian://open URI로 Obsidian 앱에서 직접 열기
```

## 주요 모듈

| 모듈 | 파일 | 역할 |
|---|---|---|
| Background router | `src/background/background.js` | 아이콘/단축키/우클릭 메뉴 처리 |
| Selection tracker | `src/content/selection-tracker.js` | 웹페이지 선택 텍스트 감지 |
| Vault access | `src/lib/vault-access.js` | File System Access API로 Vault 읽기/쓰기 |
| IndexedDB store | `src/lib/idb-store.js` | DirectoryHandle과 인덱스 저장 |
| Markdown parser | `src/lib/markdown-parser.js` | Obsidian Markdown 메타데이터 추출 |
| Search engine | `src/lib/search-engine.js` | 태그/본문/관련 노트 검색 |
| Side panel | `src/sidepanel/sidepanel.js` | 검색 UI와 Obsidian 열기 |
| Options | `src/options/options.js` | Vault 선택, 인덱스 재생성, 필터 설정 |
| Obsidian clipper adapter | `src/lib/obsidian-clipper-adapter.js` | 공식 Obsidian Web Clipper API bundle 호출 |
| Basic clipper | `src/lib/basic-clipper.js` | upstream 추출 실패 시 fallback 저장 |
| Web clip path | `src/lib/web-clip-path.js` | 웹 클립 저장 경로 템플릿 렌더링 |
| Image localizer | `src/lib/image-localizer.js` | 이미지 로컬 저장 기초 구현 |

## REST API를 쓰지 않는 이유

- 별도 Obsidian 플러그인 설치가 필요 없습니다.
- Vault는 사용자가 직접 선택한 폴더로 한정됩니다.
- API key, HTTPS 인증서, localhost CORS 이슈를 피합니다.
- 대신 대형 Vault 인덱싱 성능과 권한 재요청 처리는 확장 자체가 담당합니다.

## 선택어 태그 검색 설계

선택어 예시:

```text
Obsidian Web Clipper
```

검색 후보:

```text
obsidian-web-clipper
obsidianwebclipper
obsidian
web
clipper
```

노트에서 검색하는 대상:

```yaml
---
tags:
  - obsidian-web-clipper
  - chrome-extension
aliases:
  - Web Clipper
source_url: https://example.com
---
```

본문 태그도 검색합니다.

```md
이 노트는 #obsidian-web-clipper 와 관련됩니다.
```

## Obsidian 직접 열기

검색 결과의 `Obsidian에서 열기` 버튼은 다음 URI를 생성합니다.

```text
obsidian://open?vault=<vaultName>&file=<path-without-md>
```

Vault 이름은 Options에서 설정합니다. Vault 이름을 비워두면 기본 Obsidian 동작에 맡깁니다.

## 공식 Obsidian Web Clipper 내부 포함

이 프로젝트는 subtree 방식으로 공식 Web Clipper를 `vendor/obsidian-clipper/`에 포함하도록 설계되어 있습니다.

```bash
git remote add obsidian-clipper https://github.com/obsidianmd/obsidian-clipper.git
git fetch obsidian-clipper main --tags
git subtree add --prefix=vendor/obsidian-clipper obsidian-clipper main --squash
```

현재 구현은 `vendor/obsidian-clipper/src/api.ts`를 browser ESM bundle인 `vendor/obsidian-clipper/dist/api.browser.mjs`로 빌드한 뒤 `src/lib/obsidian-clipper-adapter.js`에서 호출합니다. 사용자는 Options에서 `Web Clips/{{title}}.md` 같은 웹 클립 저장 경로 템플릿을 설정할 수 있습니다.
