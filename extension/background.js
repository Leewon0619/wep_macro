const tabLocks = new Map();
const approvedHosts = new Set();

function getHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function allowHost(host, allowlist) {
  if (!host) return true;
  if (!allowlist || !allowlist.length) return true;
  if (allowlist.includes(host)) return true;
  return approvedHosts.has(host);
}

async function sendToTab(tabId, payload) {
  return chrome.tabs.sendMessage(tabId, payload);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === 'BG_START_RUN') {
      const { tabId, macro, allowlist = [] } = message;
      if (!tabId || !macro) {
        sendResponse({ ok: false, error: 'tabId/macro required' });
        return;
      }

      if (tabLocks.get(tabId)) {
        sendResponse({ ok: false, error: 'tab locked by running macro' });
        return;
      }

      const tab = await chrome.tabs.get(tabId);
      const host = getHost(tab.url || '');
      if (!allowHost(host, allowlist)) {
        sendResponse({ ok: false, error: `host not allowed: ${host}` });
        return;
      }

      tabLocks.set(tabId, { macroId: macro.id || 'unknown', startedAt: Date.now() });
      try {
        const res = await sendToTab(tabId, { type: 'CT_START_RUN', macro });
        sendResponse({ ok: !!res?.ok, error: res?.error || null });
      } catch (error) {
        tabLocks.delete(tabId);
        sendResponse({ ok: false, error: error.message });
      }
      return;
    }

    if (message.type === 'BG_STOP_RUN') {
      const { tabId } = message;
      if (!tabId) {
        sendResponse({ ok: false, error: 'tabId required' });
        return;
      }
      try {
        const res = await sendToTab(tabId, { type: 'CT_STOP_RUN' });
        tabLocks.delete(tabId);
        sendResponse({ ok: !!res?.ok, error: res?.error || null });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
      return;
    }

    if (message.type === 'BG_REC_START') {
      const { tabId } = message;
      try {
        const res = await sendToTab(tabId, { type: 'CT_REC_START' });
        sendResponse({ ok: !!res?.ok, error: res?.error || null });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
      return;
    }

    if (message.type === 'BG_REC_STOP') {
      const { tabId } = message;
      try {
        const res = await sendToTab(tabId, { type: 'CT_REC_STOP' });
        sendResponse({ ok: !!res?.ok, steps: res?.steps || [], error: res?.error || null });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
      return;
    }

    if (message.type === 'BG_APPROVE_HOST') {
      if (message.host) approvedHosts.add(message.host.toLowerCase());
      sendResponse({ ok: true });
      return;
    }

    if (message.type === 'BG_RUN_FINISHED') {
      if (message.tabId) tabLocks.delete(message.tabId);
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: 'unknown message type' });
  })();

  return true;
});
