# Obsidian Sidebar Search

[English](README.md) | [한국어](README.ko.md)

Obsidian Sidebar Search는 사용자가 직접 선택한 Obsidian Vault 폴더를 로컬에서 인덱싱하고, Chrome 사이드패널에서 노트를 검색하는 MV3 확장 프로그램입니다. Obsidian REST API를 사용하지 않으며, 웹페이지를 Vault에 저장하지 않습니다.

## 기능

- Chrome 사이드패널에서 Obsidian 노트 검색
- 웹페이지에서 드래그한 텍스트를 실제 Obsidian 태그로 검색
- `#research`와 `research`가 같은 태그 결과를 반환하도록 정규화
- 태그 검색에서는 본문 검색 결과를 섞지 않고 실제 태그만 표시
- 전체/관련 노트 검색에서 로컬 의미 벡터를 사용해 어휘가 다른 관련 노트도 함께 순위화
- 본문 검색의 어휘 점수는 단순 substring이 아니라 BM25 스타일 단어 점수로 계산
- 현재 페이지 URL/domain 기준 관련 노트 검색
- `obsidian://open` URI로 Obsidian 앱에서 노트 열기
- 사용자가 승인한 Vault 디렉터리 핸들을 IndexedDB에 저장
- 제외 폴더와 제외 태그를 검색 결과 표시 전에 적용
- UI 언어를 영어/한국어로 전환

## Chrome 확장 등록 방법

1. Chrome에서 `chrome://extensions`를 엽니다.
2. `Developer mode`를 켭니다.
3. `Load unpacked`를 클릭합니다.
4. 이 저장소의 루트 폴더를 선택합니다.
5. 확장 아이콘을 눌러 사이드패널을 엽니다.

## Obsidian Vault 디렉터리 연결

1. 확장 사이드패널 또는 Options 페이지를 엽니다.
2. `Vault 폴더 선택`을 클릭합니다.
3. Obsidian Vault의 루트 디렉터리를 선택합니다.
4. `인덱스 재생성`을 클릭합니다.
5. 특정 Vault로 노트를 열고 싶다면 Options에서 Obsidian Vault 이름을 설정합니다.

확장은 사용자가 선택한 폴더의 Markdown 파일만 읽습니다. Vault 내용은 브라우저 확장 컨텍스트 안에만 남습니다.

## 검색 방식

- `태그`는 frontmatter와 본문 `#tag`에서 파싱한 실제 Obsidian 태그만 검색합니다.
- `전체`는 제목, 별칭, 헤딩, 태그, 발췌문, 본문을 BM25 스타일 로컬 어휘 점수로 검색한 뒤 로컬 의미 벡터 점수를 함께 반영합니다.
- `관련 노트`는 현재 페이지 URL/domain과 연결된 노트를 우선하고, 페이지 제목/설명/선택 텍스트의 BM25 어휘 점수와 Vault 노트의 로컬 의미 벡터 유사도를 함께 사용합니다.
- 인덱스 재생성 중 포함 대상 노트마다 stable 64-bit note id, vector dimensions, version, local vector를 포함하는 semantic metadata를 저장합니다. 제외 폴더와 제외 태그는 이 metadata 저장 전에 먼저 적용됩니다.
- 의미 검색은 `src/lib/semantic-search.js`의 로컬 해시 임베딩과 `IdMapIndex` 형태의 allowlist 검색 어댑터로 동작합니다. 이는 `turbovec`의 stable id/allowlist 계약에 맞춘 브라우저 로컬 백엔드이며, 실제 `turbovec` Rust/Python 엔진은 MV3 호환 WASM 또는 네이티브 브리지 빌드가 확보되면 같은 경계에서 교체할 수 있습니다.
- 우클릭 메뉴의 `Obsidian 태그로 검색: "%s"`는 선택 텍스트를 사이드패널 태그 검색어로 넘깁니다.

## 태그와 description 처리

태그는 일반 본문 텍스트가 아니라 Obsidian 메타데이터로 취급합니다. 인덱스는 frontmatter의 `tags`, `tag` 필드와 본문 inline `#tag`를 읽고, `#research`와 `research`를 같은 값으로 정규화합니다. 태그 모드는 실제 해당 태그를 가진 노트만 반환합니다. `research/papers` 같은 하위 태그는 `research` 검색에 포함되지만, 긴 태그 안의 부분 단어는 태그 검색 결과로 섞지 않습니다.

페이지 description은 관련 노트 검색에 사용합니다. content script는 현재 페이지의 title, 선택 텍스트, heading, canonical URL, 그리고 가능한 경우 `<meta name="description">` 값을 읽습니다. 이 description은 Vault에 저장하지 않고, 현재 검색을 위한 로컬 query context로만 확장 내부에서 사용합니다.

## 사용 가이드

1. 이 폴더를 Chrome의 unpacked extension으로 등록합니다.
2. 사이드패널 또는 Options 페이지에서 Obsidian Vault 폴더를 선택합니다.
3. `obsidian://open` 링크가 특정 Vault를 열어야 한다면 Options에서 Vault 이름을 입력합니다.
4. 제외 폴더와 제외 태그를 확인한 뒤 `인덱스 재생성`을 클릭합니다.
5. 웹페이지에서 텍스트를 선택한 뒤 우클릭 메뉴나 단축키로 실제 Obsidian 태그 검색을 실행합니다.
6. `전체`는 제목, 별칭, 헤딩, 태그, 발췌문, 본문을 대상으로 어휘 검색과 로컬 의미 검색을 함께 수행합니다.
7. `관련 노트`는 글, 검색 결과 페이지, 문서 페이지에서 URL/domain, 페이지 제목, description, 선택 텍스트, BM25 어휘 점수, 로컬 의미 벡터를 함께 사용해 노트를 순위화합니다.
8. 결과의 `Obsidian에서 열기`를 누르면 `obsidian://open`으로 해당 노트를 엽니다.

## Turbovec 호환성

의미 검색은 `turbovec`의 핵심 검색 계약인 stable external note ID, local vector, allowlist-filtered vector search를 기준으로 설계했습니다. 현재 Chrome MV3 확장에서는 공개 `turbovec` 패키지가 Rust/Python 중심이고 MV3-ready JavaScript 표면이 없기 때문에, 같은 계약을 브라우저 로컬 JavaScript 어댑터로 구현합니다. 이 방식은 Vault 내용을 로컬에 유지하면서 향후 `turbovec` WASM 또는 사용자가 승인한 로컬 브리지가 준비될 때 교체 지점을 명확히 남깁니다.

## 프라이버시

- Vault 내용은 외부 서비스로 전송하지 않습니다.
- 검색 결과는 확장 사이드패널 내부에서만 렌더링합니다.
- content script는 선택 텍스트와 기본 페이지 메타데이터만 전달합니다.
- Vault 디렉터리 핸들은 웹페이지에 노출하지 않습니다.
- 제외 폴더는 인덱싱 중 건너뜁니다.
- 제외 태그는 인덱스 저장 전과 결과 표시 전에 다시 필터링합니다.
- 제외 폴더나 제외 태그 설정을 바꾸면 기존 Vault 인덱스를 삭제해 이전 프라이버시 규칙으로 저장된 노트 본문과 semantic vector가 남지 않게 합니다.
- 의미 검색 임베딩은 브라우저 확장 컨텍스트 안에서만 계산하며 네트워크 API를 호출하지 않습니다.
- 저장된 semantic vector는 Vault 인덱스와 함께 IndexedDB에 로컬로만 저장됩니다.

## 개발

```bash
npm test
npm run check
```

이 확장에는 웹 클리핑 또는 페이지 저장 파이프라인이 없습니다. 코드베이스는 로컬 Vault 인덱싱, 선택 텍스트 태그 검색, 관련 노트 검색, Obsidian URI 열기에 집중합니다.
