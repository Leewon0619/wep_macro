const $ = (id) => document.getElementById(id);
const status = $('status');

function uid(prefix = 'req') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

async function activeTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

$('ping').addEventListener('click', async () => {
  const res = await chrome.runtime.sendMessage({
    type: 'EXT_PING_REQ',
    requestId: uid(),
    source: 'WEBAPP',
    target: 'BG',
    timestamp: Date.now(),
    payload: {}
  });
  status.textContent = JSON.stringify(res, null, 2);
});

$('stopAll').addEventListener('click', async () => {
  const tabId = await activeTabId();
  const res = await chrome.runtime.sendMessage({
    type: 'RUN_STOP_REQ',
    requestId: uid(),
    source: 'WEBAPP',
    target: 'BG',
    timestamp: Date.now(),
    payload: { runId: `tab-${tabId}`, reason: 'USER', tabId }
  });
  status.textContent = JSON.stringify(res, null, 2);
});
