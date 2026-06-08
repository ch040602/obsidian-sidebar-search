// 역할: 확장 프로그램의 중앙 라우터입니다.
// - 툴바 아이콘 클릭 시 Chrome 사이드패널을 열거나 닫습니다.
// - 사용자가 웹페이지에서 드래그한 선택 텍스트를 세션 저장소에 보관합니다.
// - 우클릭 메뉴로 선택 텍스트를 Obsidian 태그 검색어로 넘깁니다.
// - 이 파일은 Vault 파일에 직접 접근하지 않습니다. Vault 접근은 side panel/options 같은 extension page에서만 수행합니다.

const PANEL_PATH = 'src/sidepanel/sidepanel.html';
const SELECTION_MENU_ID = 'search-selection-as-obsidian-tag';

configureSidePanel().catch((error) => {
  console.warn('사이드패널 설정을 적용할 수 없습니다.', error);
});

chrome.runtime.onInstalled.addListener(async () => {
  await configureSidePanel();
  await configureContextMenu();
});

chrome.action.onClicked.addListener(async (tab) => {
  await openPanelForTab(tab);
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  if (command === 'toggle_panel') {
    await openPanelForTab(tab);
  }

  if (command === 'search_selection_as_tag') {
    const openPromise = openPanelForTab(tab);
    await prepareSelectionTagSearch(tab);
    await openPromise;
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== SELECTION_MENU_ID || !tab) return;

  const selectedText = String(info.selectionText || '').trim();
  const openPromise = openPanelForTab(tab);

  await chrome.storage.session.set({
    pendingSearch: {
      mode: 'tag',
      query: selectedText,
      reason: 'context-menu-selection',
      createdAt: Date.now(),
      tabId: tab.id,
      pageUrl: tab.url,
      pageTitle: tab.title
    }
  });

  await openPromise;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'SELECTION_CHANGED') {
    chrome.storage.session.set({
      lastSelection: {
        text: message.text,
        pageUrl: sender.tab?.url || message.pageUrl || '',
        pageTitle: sender.tab?.title || message.pageTitle || '',
        tabId: sender.tab?.id,
        createdAt: Date.now()
      }
    });
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === 'GET_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      sendResponse({ ok: Boolean(tab), tab });
    });
    return true;
  }

  return false;
});


async function configureSidePanel() {
  await chrome.sidePanel.setOptions({ path: PANEL_PATH, enabled: true });
  if (chrome.sidePanel.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
}

async function configureContextMenu() {
  await chrome.contextMenus.remove(SELECTION_MENU_ID).catch(() => {});
  chrome.contextMenus.create({
    id: SELECTION_MENU_ID,
    title: 'Obsidian 태그로 검색: "%s"',
    contexts: ['selection']
  });
}

async function openPanelForTab(tab) {
  if (!tab?.windowId) return;

  chrome.sidePanel.setOptions({ path: PANEL_PATH, enabled: true }).catch(() => {});
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
    return true;
  } catch (error) {
    console.warn('사이드패널을 열 수 없습니다.', error);
    return false;
  }
}

async function prepareSelectionTagSearch(tab) {
  if (!isScriptableTab(tab)) return;

  let result = '';
  try {
    [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => String(window.getSelection?.().toString() || '').trim()
    });
  } catch (error) {
    console.warn('현재 탭에서 선택어를 읽을 수 없습니다.', error);
    return;
  }

  const selectedText = String(result || '').trim();
  if (!selectedText) return;

  await chrome.storage.session.set({
    pendingSearch: {
      mode: 'tag',
      query: selectedText,
      reason: 'command-selection',
      createdAt: Date.now(),
      tabId: tab.id,
      pageUrl: tab.url,
      pageTitle: tab.title
    }
  });
}

function isScriptableTab(tab) {
  return Boolean(tab?.id && /^https?:\/\//i.test(tab.url || ''));
}
