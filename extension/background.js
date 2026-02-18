const EXT_VERSION = '1.0.0';
const tabLocks = new Map();
const runById = new Map();

function clone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function makeRes(req, payload = {}) {
  return {
    type: req.type.replace('_REQ', '_RES'),
    requestId: req.requestId,
    source: 'BG',
    target: req.source || 'WEBAPP',
    timestamp: Date.now(),
    payload
  };
}

function makeEvt(type, requestId, payload = {}) {
  return {
    type,
    requestId,
    source: 'BG',
    target: 'WEBAPP',
    timestamp: Date.now(),
    payload
  };
}

function hostOfUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isAllowedDomain(host, allowedDomains) {
  if (!Array.isArray(allowedDomains) || !allowedDomains.length) return false;
  const exact = allowedDomains.includes(host);
  const wildcard = allowedDomains.some((d) => d.startsWith('*.') && host.endsWith(d.slice(1)));
  return exact || wildcard;
}

async function sendToTab(tabId, envelope) {
  return chrome.tabs.sendMessage(tabId, envelope);
}

async function activeTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id || null;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (!msg || !msg.type) {
      sendResponse({ error: 'invalid message' });
      return;
    }

    if (msg.type.endsWith('_EVT')) {
      // CS -> BG event stream
      if (msg.type === 'RUN_STATUS_EVT' || msg.type === 'RUN_LOG_EVT' || msg.type === 'RUN_END_EVT' || msg.type === 'SCREENREC_MARK_EVT' || msg.type === 'REC_EVENT_EVT') {
        if (msg.type === 'RUN_END_EVT') {
          const runId = msg.payload?.runId;
          if (runId && runById.has(runId)) {
            const info = runById.get(runId);
            runById.delete(runId);
            tabLocks.delete(info.tabId);
          }
        }
        sendResponse({ ok: true });
        return;
      }
    }

    if (!msg.type.endsWith('_REQ')) {
      sendResponse({ error: 'REQ type required' });
      return;
    }

    const req = msg;

    if (req.type === 'EXT_PING_REQ') {
      sendResponse(makeRes(req, {
        version: EXT_VERSION,
        capabilities: ['RECORDER', 'RUNNER', 'SCREENREC_MARKERS', 'TAB_MUTEX'],
        activeTabId: await activeTabId(),
        permissions: ['storage', 'tabs', 'activeTab', 'scripting']
      }));
      return;
    }

    if (req.type === 'EXT_GET_PERMISSIONS_REQ') {
      sendResponse(makeRes(req, {
        canRecord: true,
        canRun: true,
        canCaptureScreen: true,
        hostPermissions: ['<all_urls>'],
        optionalPermissions: []
      }));
      return;
    }

    if (req.type === 'EXT_REQUEST_HOST_PERMISSION_REQ') {
      const domains = req.payload?.domains || [];
      sendResponse(makeRes(req, {
        granted: true,
        deniedDomains: domains.filter((d) => !d)
      }));
      return;
    }

    if (req.type === 'REC_START_REQ') {
      const tabId = req.payload?.tabId || sender.tab?.id || await activeTabId();
      if (!tabId) {
        sendResponse(makeRes(req, { started: false, error: 'NO_TAB' }));
        return;
      }

      const forward = {
        ...req,
        source: 'BG',
        target: 'CS',
        payload: { ...clone(req.payload), tabId }
      };
      const res = await sendToTab(tabId, forward);
      sendResponse(makeRes(req, { started: !!res?.payload?.started, tabId }));
      return;
    }

    if (req.type === 'REC_STOP_REQ') {
      const tabId = req.payload?.tabId || sender.tab?.id || await activeTabId();
      if (!tabId) {
        sendResponse(makeRes(req, { stopped: false, steps: [], stats: { rawEventCount: 0, stepCount: 0, durationMs: 0 } }));
        return;
      }

      const res = await sendToTab(tabId, { ...req, source: 'BG', target: 'CS', payload: { ...clone(req.payload), tabId } });
      sendResponse(makeRes(req, {
        stopped: !!res?.payload?.stopped,
        steps: res?.payload?.steps || [],
        stats: res?.payload?.stats || { rawEventCount: 0, stepCount: 0, durationMs: 0 }
      }));
      return;
    }

    if (req.type === 'RUN_START_REQ') {
      const tabId = req.payload?.tabId || sender.tab?.id || await activeTabId();
      if (!tabId) {
        sendResponse(makeRes(req, { accepted: false, reasonIfDenied: 'NO_TAB' }));
        return;
      }

      if (tabLocks.get(tabId)) {
        sendResponse(makeRes(req, { accepted: false, reasonIfDenied: 'TAB_LOCKED' }));
        return;
      }

      const tab = await chrome.tabs.get(tabId);
      const host = hostOfUrl(tab.url || '');
      const macro = req.payload?.macro || {};
      const allowedDomains = macro.allowedDomains || [];
      if (!isAllowedDomain(host, allowedDomains)) {
        sendResponse(makeRes(req, { accepted: false, reasonIfDenied: 'DOMAIN_NOT_ALLOWED' }));
        return;
      }

      const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      tabLocks.set(tabId, runId);
      runById.set(runId, { tabId, startedAt: Date.now() });

      const runReq = {
        ...req,
        source: 'BG',
        target: 'CS',
        payload: {
          ...clone(req.payload),
          tabId,
          runId
        }
      };

      const csRes = await sendToTab(tabId, runReq);
      if (!csRes?.payload?.accepted) {
        tabLocks.delete(tabId);
        runById.delete(runId);
        sendResponse(makeRes(req, { accepted: false, reasonIfDenied: csRes?.payload?.reasonIfDenied || 'CS_REJECTED' }));
        return;
      }

      sendResponse(makeRes(req, { accepted: true, runId }));
      return;
    }

    if (req.type === 'RUN_PAUSE_REQ' || req.type === 'RUN_RESUME_REQ' || req.type === 'RUN_STOP_REQ') {
      const runId = req.payload?.runId;
      const info = runById.get(runId);
      if (!info) {
        sendResponse(makeRes(req, { ok: false, reason: 'RUN_NOT_FOUND' }));
        return;
      }

      const res = await sendToTab(info.tabId, { ...req, source: 'BG', target: 'CS' });
      if (req.type === 'RUN_STOP_REQ') {
        tabLocks.delete(info.tabId);
        runById.delete(runId);
      }
      sendResponse(makeRes(req, { ok: !!res?.payload?.ok }));
      return;
    }

    if (req.type === 'SCREENREC_START_REQ') {
      const sessionId = `screen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      sendResponse(makeRes(req, { started: true, sessionId }));
      return;
    }

    if (req.type === 'SCREENREC_STOP_REQ') {
      sendResponse(makeRes(req, { stopped: true, sessionId: req.payload?.sessionId, recordingRef: `local:${req.payload?.sessionId || 'unknown'}` }));
      return;
    }

    sendResponse(makeRes(req, { error: 'UNKNOWN_REQ' }));
  })().catch((error) => {
    sendResponse({
      type: msg.type.replace('_REQ', '_RES'),
      requestId: msg.requestId,
      source: 'BG',
      target: msg.source || 'WEBAPP',
      timestamp: Date.now(),
      payload: { error: error.message }
    });
  });

  return true;
});
