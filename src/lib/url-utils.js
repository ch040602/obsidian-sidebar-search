// 역할: 현재 페이지 URL과 노트의 source_url을 비교하기 쉽게 정규화합니다.
// tracking parameter를 제거해야 같은 페이지를 가리키는 노트를 안정적으로 찾을 수 있습니다.

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'igshid', 'mc_cid', 'mc_eid', 'ref', 'ref_src', 'spm'
]);

export function normalizeUrl(urlText) {
  try {
    const url = new URL(urlText);
    url.hash = '';

    for (const key of Array.from(url.searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
    }

    url.hostname = url.hostname.replace(/^www\./, '').toLowerCase();
    return url.toString().replace(/\/$/, '');
  } catch {
    return String(urlText || '').trim();
  }
}

export function domainFromUrl(urlText) {
  try {
    return new URL(urlText).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}
