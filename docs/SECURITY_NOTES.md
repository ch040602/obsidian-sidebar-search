# 보안/프라이버시 메모

## Vault 접근

- 사용자가 명시적으로 선택한 폴더만 읽습니다.
- DirectoryHandle은 IndexedDB에 저장됩니다.
- 브라우저 재시작 후 권한이 만료되면 다시 권한 요청이 필요할 수 있습니다.

## 웹페이지와의 분리

- Vault 검색 결과는 host page DOM에 주입하지 않습니다.
- 검색 결과는 Chrome extension side panel 내부에서만 렌더링됩니다.
- content script는 선택 텍스트와 기본 페이지 메타데이터만 background로 보냅니다.

## 제외 규칙

Options에서 제외 폴더와 제외 태그를 설정할 수 있습니다.

제외 폴더는 Vault 순회 중 건너뜁니다. 제외 태그는 Markdown frontmatter와 inline tag를 파싱한 뒤 IndexedDB 인덱스에 저장하기 전에 제외하며, 검색 결과 표시 전에도 한 번 더 제외합니다. Windows/Obsidian에서 흔한 CRLF frontmatter도 같은 방식으로 처리합니다.

제외 폴더나 제외 태그 설정이 바뀌면 기존 Vault 인덱스와 인덱스 생성 시각을 삭제합니다. Vault 폴더 핸들은 유지하지만, 새 프라이버시 규칙으로 인덱스를 다시 만들기 전까지 이전 규칙으로 저장된 노트 본문과 semantic vector를 재사용하지 않습니다.

기본 제외 폴더:

```text
.obsidian
.git
node_modules
Journal/Private
Finance
People
```

기본 제외 태그:

```text
private
secret
personal
```

## 의미 검색과 로컬 임베딩

- 전체/관련 노트 의미 검색은 확장 컨텍스트 안에서 로컬 해시 임베딩을 계산합니다.
- 현재 구현은 네트워크 기반 embedding API를 호출하지 않습니다.
- 인덱스 재생성 시 포함 대상 노트에 대해서만 semantic metadata와 local vector를 IndexedDB Vault 인덱스에 저장합니다.
- `src/lib/semantic-search.js`는 `turbovec`의 stable id와 allowlist 검색 계약을 따르는 브라우저 로컬 어댑터입니다.
- 실제 `turbovec` Rust/Python 엔진은 Chrome MV3에서 직접 사용할 수 있는 JavaScript 패키지가 아니므로, MV3 호환 WASM 또는 사용자가 승인한 로컬 브리지가 마련되기 전까지 의존성으로 추가하지 않습니다.
- 제외 폴더/태그 필터링은 의미 검색 점수 계산 전의 `safeIndex`에 적용되어, 제외된 노트가 semantic 결과에도 나타나지 않도록 합니다.
