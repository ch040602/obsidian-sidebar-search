// 역할: 현재 페이지 이미지 URL을 다운로드해 Vault 내부 asset 파일로 저장합니다.
// 제한: 로그인 쿠키가 필요한 이미지, hotlink 방지 이미지, CORS/권한 제한 이미지 일부는 실패할 수 있습니다.
// 실패한 이미지는 조용히 건너뛰고 manifest에 실패 사유를 남기도록 설계할 수 있습니다.

import { writeVaultBinaryFile, writeVaultTextFile } from './vault-access.js';
import { domainFromUrl } from './url-utils.js';

export async function localizePageImages({ pageContext, settings, limit = 8 }) {
  const images = Array.isArray(pageContext.images) ? pageContext.images : [];
  const domain = domainFromUrl(pageContext.url || '') || 'unknown-domain';
  const slug = slugify(pageContext.title || pageContext.h1 || 'web-clip');
  const assets = [];
  const failures = [];

  for (const [index, image] of images.slice(0, limit).entries()) {
    const src = image.src;
    if (!src || !/^https?:\/\//i.test(src)) continue;

    try {
      const response = await fetch(src, { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      if (!contentType.startsWith('image/')) throw new Error(`Not an image: ${contentType}`);

      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > settings.maxImageBytes) throw new Error(`Image too large: ${bytes.byteLength} bytes`);

      const hash = await sha256Hex(bytes);
      const ext = extensionFromContentType(contentType);
      const localPath = `${settings.assetFolder}/${domain}/${slug}/${String(index + 1).padStart(3, '0')}-${hash.slice(0, 10)}.${ext}`;

      await writeVaultBinaryFile(localPath, bytes, contentType);
      assets.push({ originalUrl: src, localPath, alt: image.alt || '', contentType, bytes: bytes.byteLength, sha256: hash });
    } catch (error) {
      failures.push({ originalUrl: src, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  const manifestPath = `${settings.assetFolder}/${domain}/${slug}/manifest.json`;
  await writeVaultTextFile(manifestPath, JSON.stringify({
    type: 'web_clip_asset_manifest',
    source_url: pageContext.url,
    created_at: new Date().toISOString(),
    assets,
    failures
  }, null, 2));

  return { assets, failures, manifestPath };
}

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function extensionFromContentType(contentType) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('svg')) return 'svg';
  return 'jpg';
}

function slugify(text) {
  return String(text || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'untitled';
}
