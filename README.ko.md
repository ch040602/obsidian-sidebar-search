# Obsidian Sidebar Search

[English](README.md) | [한국어](README.ko.md)

Obsidian Sidebar Search는 사용자가 직접 선택한 Obsidian Vault 폴더를 로컬에서 인덱싱하고, Chrome 사이드패널에서 노트를 검색하는 MV3 확장 프로그램입니다. Obsidian REST API를 사용하지 않으며, 웹페이지를 Vault에 저장하지 않습니다.

## 기능

- Chrome 사이드패널에서 Obsidian 노트 검색
- 웹페이지에서 드래그한 텍스트를 실제 Obsidian 태그로 검색
- `#research`와 `research`가 같은 태그 결과를 반환하도록 정규화
- 태그 검색에서는 본문 검색 결과를 섞지 않고 실제 태그만 표시
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
- `전체`는 제목, 별칭, 헤딩, 태그, 발췌문, 본문을 검색합니다.
- `관련 노트`는 현재 페이지 URL/domain과 연결된 노트를 검색합니다.
- 우클릭 메뉴의 `Obsidian 태그로 검색: "%s"`는 선택 텍스트를 사이드패널 태그 검색어로 넘깁니다.

## 프라이버시

- Vault 내용은 외부 서비스로 전송하지 않습니다.
- 검색 결과는 확장 사이드패널 내부에서만 렌더링합니다.
- content script는 선택 텍스트와 기본 페이지 메타데이터만 전달합니다.
- Vault 디렉터리 핸들은 웹페이지에 노출하지 않습니다.
- 제외 폴더는 인덱싱 중 건너뜁니다.
- 제외 태그는 인덱스 저장 전과 결과 표시 전에 다시 필터링합니다.

## 개발

```bash
npm test
npm run check
```

이 확장에는 웹 클리핑 또는 페이지 저장 파이프라인이 없습니다. 코드베이스는 로컬 Vault 인덱싱, 선택 텍스트 태그 검색, 관련 노트 검색, Obsidian URI 열기에 집중합니다.
