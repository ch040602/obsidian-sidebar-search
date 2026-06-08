// 역할: 현재 탭의 URL/title/검색어를 분석해 Vault 검색 신호로 변환합니다.
// 검색 결과 페이지라면 페이지 제목보다 검색창 query를 더 우선합니다.

export function detectSearchContext(pageContext) {
  const urlText = pageContext?.url || '';
  let url;

  try {
    url = new URL(urlText);
  } catch {
    return { ...pageContext, isSearchPage: false };
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const output = { ...pageContext, domain: host, isSearchPage: false };

  if (host.includes('google.') && url.pathname === '/search') {
    output.isSearchPage = true;
    output.searchEngine = 'google';
    output.searchQuery = url.searchParams.get('q') || '';
  } else if (host.includes('bing.') && url.pathname.includes('/search')) {
    output.isSearchPage = true;
    output.searchEngine = 'bing';
    output.searchQuery = url.searchParams.get('q') || '';
  } else if (host.includes('duckduckgo.') && url.searchParams.has('q')) {
    output.isSearchPage = true;
    output.searchEngine = 'duckduckgo';
    output.searchQuery = url.searchParams.get('q') || '';
  } else if (host === 'github.com' && url.pathname === '/search') {
    output.isSearchPage = true;
    output.searchEngine = 'github';
    output.searchQuery = url.searchParams.get('q') || '';
  } else if (host.endsWith('reddit.com') && url.pathname.includes('/search')) {
    output.isSearchPage = true;
    output.searchEngine = 'reddit';
    output.searchQuery = url.searchParams.get('q') || '';
  } else if (host.endsWith('youtube.com') && url.pathname === '/results') {
    output.isSearchPage = true;
    output.searchEngine = 'youtube';
    output.searchQuery = url.searchParams.get('search_query') || '';
  }

  return output;
}

export function buildDefaultQuery(pageContext) {
  if (pageContext?.selectedText) return pageContext.selectedText;
  if (pageContext?.searchQuery) return pageContext.searchQuery;
  if (pageContext?.h1) return pageContext.h1;
  if (pageContext?.title) return cleanBrowserTitle(pageContext.title);
  return pageContext?.domain || '';
}

function cleanBrowserTitle(title) {
  return String(title || '')
    .replace(/\s+-\s+Google Search$/i, '')
    .replace(/\s+-\s+GitHub$/i, '')
    .replace(/\s+-\s+YouTube$/i, '')
    .trim();
}
