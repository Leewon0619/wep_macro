const $ = (id) => document.getElementById(id);

const el = {
  run: $('run'),
  stop: $('stop'),
  recStart: $('recStart'),
  recStop: $('recStop'),
  macroJson: $('macroJson'),
  allowlist: $('allowlist'),
  status: $('status')
};

function setStatus(text) {
  el.status.textContent = text;
}

function getDefaultMacro() {
  return {
    id: 'popup-macro',
    name: 'Popup Macro',
    repeatCnt: 1,
    items: [
      { id: 'none', type: 'NONE' },
      { id: 's1', type: 'CLICK', selector: 'button' },
      { id: 's2', type: 'WAIT', ms: 300 }
    ]
  };
}

async function activeTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

el.run.addEventListener('click', async () => {
  try {
    const tabId = await activeTabId();
    if (!tabId) return;

    let macro = getDefaultMacro();
    if (el.macroJson.value.trim()) macro = JSON.parse(el.macroJson.value);

    const allowlist = el.allowlist.value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    const res = await chrome.runtime.sendMessage({ type: 'BG_START_RUN', tabId, macro, allowlist });
    setStatus(res?.ok ? 'run started' : `run fail: ${res?.error || 'unknown'}`);
  } catch (error) {
    setStatus(`error: ${error.message}`);
  }
});

el.stop.addEventListener('click', async () => {
  const tabId = await activeTabId();
  const res = await chrome.runtime.sendMessage({ type: 'BG_STOP_RUN', tabId });
  setStatus(res?.ok ? 'stop requested' : `stop fail: ${res?.error || 'unknown'}`);
});

el.recStart.addEventListener('click', async () => {
  const tabId = await activeTabId();
  const res = await chrome.runtime.sendMessage({ type: 'BG_REC_START', tabId });
  setStatus(res?.ok ? 'rec start' : `rec start fail: ${res?.error || 'unknown'}`);
});

el.recStop.addEventListener('click', async () => {
  const tabId = await activeTabId();
  const res = await chrome.runtime.sendMessage({ type: 'BG_REC_STOP', tabId });
  if (res?.ok && res.steps) {
    el.macroJson.value = JSON.stringify({
      id: 'recorded-macro',
      name: 'Recorded Macro',
      repeatCnt: 1,
      items: [{ id: 'none', type: 'NONE' }, ...res.steps]
    }, null, 2);
  }
  setStatus(res?.ok ? `rec stop (${res.steps?.length || 0} steps)` : `rec stop fail: ${res?.error || 'unknown'}`);
});
