// 역할: 웹페이지 안에서 사용자가 드래그한 텍스트를 감지하는 content script입니다.
// 중요한 보안 원칙: 이 파일은 Vault에 접근하지 않습니다. 단지 선택 텍스트와 현재 페이지 정보를 background에 알려줄 뿐입니다.

let lastSentText = '';
let lastSentAt = 0;

function readSelection() {
  const active = document.activeElement;
  if (active && typeof active.selectionStart === 'number' && typeof active.selectionEnd === 'number') {
    const selected = String(active.value || '').slice(active.selectionStart, active.selectionEnd).trim();
    if (selected) return selected;
  }

  return String(window.getSelection?.().toString() || '').trim();
}

function sendSelectionIfUseful() {
  if (!chrome.runtime?.id) return;

  const text = readSelection();
  const now = Date.now();

  // 너무 짧은 선택은 실수일 가능성이 높으므로 무시합니다.
  if (text.length < 2) return;

  // 같은 선택 텍스트를 너무 자주 보내지 않도록 간단한 중복 방지를 둡니다.
  if (text === lastSentText && now - lastSentAt < 1200) return;

  lastSentText = text;
  lastSentAt = now;

  try {
    chrome.runtime.sendMessage({
      type: 'SELECTION_CHANGED',
      text,
      pageUrl: location.href,
      pageTitle: document.title
    }).catch(() => {
      // 페이지 이동 중 service worker가 잠시 응답하지 않는 경우가 있으므로 조용히 무시합니다.
    });
  } catch {
    // 확장 reload 직후 기존 content script의 context가 무효화될 수 있습니다.
  }
}

document.addEventListener('mouseup', () => {
  setTimeout(sendSelectionIfUseful, 40);
});

document.addEventListener('keyup', () => {
  setTimeout(sendSelectionIfUseful, 40);
});

if (chrome.runtime?.id) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'READ_PAGE_CONTEXT') {
      sendResponse({ ok: true, context: buildBasicPageContext() });
      return true;
    }

    return false;
  });
}

function buildBasicPageContext() {
  return {
    url: location.href,
    title: document.title,
    h1: document.querySelector('h1')?.innerText?.trim() || '',
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    canonicalUrl: document.querySelector('link[rel="canonical"]')?.href || '',
    selectedText: readSelection()
  };
}
