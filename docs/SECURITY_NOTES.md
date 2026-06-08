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
