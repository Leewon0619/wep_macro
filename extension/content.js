const CHANNEL_WEB_TO_EXT = 'WEP_WEBAPP_TO_EXT';
const CHANNEL_EXT_TO_WEB = 'WEP_EXT_TO_WEBAPP';

const state = {
  run: {
    running: false,
    paused: false,
    stopRequested: false,
    runId: null,
    cursor: 0,
    repeatIndex: 0,
    startedAt: 0,
    totalSteps: 0,
    actionsInSecond: [],
    vars: {}
  },
  recorder: {
    active: false,
    options: null,
    rawEventCount: 0,
    startedAt: 0,
    lastTs: 0,
    steps: [],
    lastClickSig: '',
    inputTimers: new Map()
  },
  bridgeInstalled: false
};

function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeRes(req, payload) {
  return {
    type: req.type.replace('_REQ', '_RES'),
    requestId: req.requestId,
    source: 'CS',
    target: req.source,
    timestamp: Date.now(),
    payload
  };
}

function emitEvt(type, requestId, payload) {
  const env = {
    type,
    requestId,
    source: 'CS',
    target: 'WEBAPP',
    timestamp: Date.now(),
    payload
  };

  window.postMessage({ channel: CHANNEL_EXT_TO_WEB, envelope: env }, '*');
  chrome.runtime.sendMessage(env).catch(() => {});
}

function maskText(text) {
  return String(text).replace(/(password|otp|cvv|pin|secret)/gi, '***');
}

function hostAllowed(allowedDomains) {
  if (!Array.isArray(allowedDomains) || !allowedDomains.length) return false;
  const host = location.hostname.toLowerCase();
  return allowedDomains.includes(host) || allowedDomains.some((d) => d.startsWith('*.') && host.endsWith(d.slice(1)));
}

function resolveCandidate(c) {
  try {
    if (c.kind === 'CSS' || c.kind === 'DATA_ATTR') return document.querySelector(c.value);
    if (c.kind === 'ARIA') return document.querySelector(`[aria-label="${c.value.replace(/"/g, '\\"')}"]`);
    if (c.kind === 'TEXT') return Array.from(document.querySelectorAll('button,a,label,span,div,p')).find((n) => (n.textContent || '').includes(c.value)) || null;
    if (c.kind === 'XPATH') return document.evaluate(c.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    return null;
  } catch {
    return null;
  }
}

function verifyNode(node, verify) {
  if (!verify || !verify.length) return true;
  for (const rule of verify) {
    if (rule.kind === 'VISIBLE') {
      const r = node.getBoundingClientRect();
      if (rule.value && (r.width <= 0 || r.height <= 0)) return false;
    }
    if (rule.kind === 'TEXT_CONTAINS') {
      if (!(node.textContent || '').includes(rule.value || '')) return false;
    }
    if (rule.kind === 'ATTRIBUTE_EQUALS') {
      if (String(node.getAttribute(rule.attr || '') || '') !== String(rule.value || '')) return false;
    }
  }
  return true;
}

async function resolveTarget(selectorSpec, timeoutMs) {
  const end = Date.now() + timeoutMs;
  const cands = selectorSpec?.selectors || [];
  while (Date.now() < end) {
    for (const c of cands) {
      const node = resolveCandidate(c);
      if (!node) continue;
      if (!verifyNode(node, selectorSpec.verify)) continue;
      return node;
    }
    await sleep(50);
  }
  return null;
}

function classifySensitive(node) {
  if (!(node instanceof Element)) return false;
  const type = (node.getAttribute('type') || '').toLowerCase();
  const bag = `${node.id || ''} ${node.getAttribute('name') || ''} ${node.getAttribute('placeholder') || ''}`.toLowerCase();
  return type === 'password' || /(otp|2fa|card|cvv|pin|pass)/.test(bag);
}

function selectorCandidates(node) {
  const list = [];
  if (node.id) list.push({ kind: 'CSS', value: `#${CSS.escape(node.id)}`, weight: 1 });
  ['data-testid', 'data-qa', 'data-test'].forEach((attr) => {
    const v = node.getAttribute(attr);
    if (v) list.push({ kind: 'DATA_ATTR', value: `[${attr}="${v}"]`, weight: 0.95 });
  });
  const aria = node.getAttribute('aria-label');
  if (aria) list.push({ kind: 'ARIA', value: aria, weight: 0.9 });
  const text = (node.textContent || '').trim();
  if (text && text.length <= 40) list.push({ kind: 'TEXT', value: text, weight: 0.7 });
  if (!list.length) list.push({ kind: 'CSS', value: node.tagName.toLowerCase(), weight: 0.2 });
  return list.slice(0, 5);
}

function recordWaitIfNeeded(ts) {
  if (!state.recorder.options?.insertWait) {
    state.recorder.lastTs = ts;
    return;
  }
  const dt = ts - state.recorder.lastTs;
  if (state.recorder.lastTs > 0 && dt >= state.recorder.options.waitThresholdMs) {
    state.recorder.steps.push({
      id: uid('step'),
      type: 'WAIT',
      ms: dt,
      timeoutMs: 8000,
      retry: { count: 0 },
      onFail: { action: 'STOP' }
    });
  }
  state.recorder.lastTs = ts;
}

function pushRecordedStep(step, reqId) {
  state.recorder.steps.push(step);
  emitEvt('REC_EVENT_EVT', reqId, { macroId: 'unknown', rawEvent: {}, proposedStep: step });
}

function bindRecorderListeners(reqId) {
  if (state.recorder.bound) return;
  state.recorder.bound = true;

  document.addEventListener('click', (event) => {
    if (!state.recorder.active || !state.recorder.options.recordClick) return;
    state.recorder.rawEventCount += 1;
    const ts = Date.now();
    recordWaitIfNeeded(ts);

    const sig = `${event.target?.id || ''}:${event.button}`;
    if (state.recorder.options.dedupeClicks && sig === state.recorder.lastClickSig) return;
    state.recorder.lastClickSig = sig;

    pushRecordedStep({
      id: uid('step'),
      type: 'CLICK',
      target: { selector: { selectors: selectorCandidates(event.target), verify: [{ kind: 'VISIBLE', value: true }] } },
      button: event.button === 2 ? 'RIGHT' : 'LEFT',
      clickCount: event.detail >= 2 ? 2 : 1,
      scrollIntoView: true,
      timeoutMs: 8000,
      retry: { count: 1, backoffMs: 500 },
      onFail: { action: 'STOP' }
    }, reqId);
  }, true);

  document.addEventListener('input', (event) => {
    if (!state.recorder.active || !state.recorder.options.recordInput) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;

    state.recorder.rawEventCount += 1;

    clearTimeout(state.recorder.inputTimers.get(target));
    const timer = setTimeout(() => {
      const ts = Date.now();
      recordWaitIfNeeded(ts);
      if (classifySensitive(target)) return;

      pushRecordedStep({
        id: uid('step'),
        type: 'TYPE',
        target: { selector: { selectors: selectorCandidates(target), verify: [] } },
        textTemplate: String(target.value || ''),
        clearFirst: true,
        pressEnter: false,
        perCharDelayMs: 0,
        timeoutMs: 8000,
        retry: { count: 1, backoffMs: 500 },
        onFail: { action: 'STOP' }
      }, reqId);
    }, state.recorder.options.inputDebounceMs);
    state.recorder.inputTimers.set(target, timer);
  }, true);

  document.addEventListener('wheel', (event) => {
    if (!state.recorder.active || !state.recorder.options.recordScroll) return;
    state.recorder.rawEventCount += 1;

    const ts = Date.now();
    recordWaitIfNeeded(ts);
    pushRecordedStep({
      id: uid('step'),
      type: 'SCROLL',
      mode: 'PIXEL',
      deltaY: Math.round(event.deltaY || 0),
      timeoutMs: 8000,
      retry: { count: 0 },
      onFail: { action: 'STOP' }
    }, reqId);
  }, { capture: true, passive: true });
}

function limitActionsPerSecond(maxPerSec) {
  const now = Date.now();
  state.run.actionsInSecond = state.run.actionsInSecond.filter((t) => now - t < 1000);
  if (state.run.actionsInSecond.length >= maxPerSec) return false;
  state.run.actionsInSecond.push(now);
  return true;
}

function fail(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

function applyTemplate(text, vars) {
  let out = String(text || '');
  out = out.replace(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (_, key) => String(vars[key] ?? ''));
  out = out.replace(/\{\{\s*UUID\s*\}\}/g, crypto.randomUUID());
  out = out.replace(/\{\{\s*RAND_INT:(-?\d+):(-?\d+)\s*\}\}/g, (_, a, b) => String(Math.floor(Math.random() * (Number(b) - Number(a) + 1)) + Number(a)));
  out = out.replace(/\{\{\s*RAND_STR:(\d+)\s*\}\}/g, (_, l) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < Number(l); i += 1) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  });
  return out;
}

function compileLabelIndex(steps) {
  const map = new Map();
  steps.forEach((s, i) => {
    if (s.type === 'LABEL' && s.label) map.set(s.label, i);
  });
  return map;
}

async function executeStep(step, labels, vars, policy, runId, requestId, runOptions) {
  emitEvt('RUN_LOG_EVT', requestId, { runId, stepId: step.id, phase: 'START', message: step.type });
  const timeoutMs = step.timeoutMs || policy.timeouts.defaultStepTimeoutMs;

  if (step.type === 'WAIT') {
    await sleep(step.ms || 0);
    return {};
  }

  if (step.type === 'LABEL') return {};

  if (step.type === 'GOTO') {
    const idx = labels.get(step.targetLabel);
    if (idx == null) throw fail('E_VERIFY_FAILED', `target label missing: ${step.targetLabel}`);
    return { next: idx };
  }

  if (step.type === 'IF') {
    const cond = step.condition || {};
    let ok = false;
    if (cond.kind === 'URL_MATCH') ok = new RegExp(cond.value || '').test(location.href);
    if (cond.kind === 'VAR_EQUALS') ok = String(vars[cond.varName] ?? '') === String(cond.value ?? '');
    if (['EXISTS', 'NOT_EXISTS', 'TEXT_CONTAINS'].includes(cond.kind)) {
      const node = await resolveTarget(cond.target?.selector, timeoutMs);
      if (cond.kind === 'EXISTS') ok = Boolean(node);
      if (cond.kind === 'NOT_EXISTS') ok = !node;
      if (cond.kind === 'TEXT_CONTAINS') ok = Boolean(node && (node.textContent || '').includes(cond.value || ''));
    }

    const block = ok ? (step.then || []) : (step.else || []);
    for (const nested of block) await executeStep(nested, labels, vars, policy, runId, requestId, runOptions);
    return {};
  }

  if (step.type === 'SET_VAR') {
    if (step.source === 'CONST') vars[step.name] = step.constValue;
    if (step.source === 'RANDOM') {
      const r = step.random || {};
      if (r.kind === 'UUID') vars[step.name] = crypto.randomUUID();
      if (r.kind === 'RAND_INT') vars[step.name] = Math.floor(Math.random() * ((r.max ?? 100) - (r.min ?? 0) + 1)) + (r.min ?? 0);
      if (r.kind === 'RAND_STR') vars[step.name] = applyTemplate(`{{RAND_STR:${r.length ?? 8}}}`, vars);
    }
    if (step.source === 'PAGE_TEXT') {
      const node = await resolveTarget(step.from?.selector, timeoutMs);
      if (!node) throw fail('E_SELECTOR_NOT_FOUND', 'SET_VAR PAGE_TEXT source not found');
      vars[step.name] = (node.textContent || '').trim();
    }
    return {};
  }

  if (step.type === 'SCROLL') {
    if (!limitActionsPerSecond(policy.rateLimit.maxActionsPerSecond)) throw fail('E_POLICY_RATE_LIMIT', 'rate limit exceeded');
    if (step.mode === 'ELEMENT') {
      const node = await resolveTarget(step.target?.selector, timeoutMs);
      if (!node) throw fail('E_SELECTOR_NOT_FOUND', 'scroll target not found');
      if (!runOptions?.dryRun) node.scrollIntoView({ block: 'center', behavior: 'instant' });
    } else {
      if (!runOptions?.dryRun) window.scrollBy({ top: Number(step.deltaY) || 0, behavior: 'instant' });
    }
    if (step.postWaitMs) await sleep(step.postWaitMs);
    return {};
  }

  if (step.type === 'ASSERT') {
    const node = await resolveTarget(step.target?.selector, timeoutMs);
    const expect = step.expect || 'EXISTS';
    if (expect === 'EXISTS' && !node) throw fail('E_SELECTOR_NOT_FOUND', 'assert exists fail');
    if (expect === 'NOT_EXISTS' && node) throw fail('E_VERIFY_FAILED', 'assert not exists fail');
    if (expect === 'TEXT_CONTAINS' && !(node?.textContent || '').includes(step.value || '')) throw fail('E_VERIFY_FAILED', 'assert text fail');
    if (expect === 'URL_MATCH' && !new RegExp(step.value || '').test(location.href)) throw fail('E_VERIFY_FAILED', 'assert url fail');
    return {};
  }

  const node = await resolveTarget(step.target?.selector, timeoutMs);
  if (!node) throw fail('E_SELECTOR_NOT_FOUND', 'selector not found');

  if (step.type === 'CLICK') {
    if (!limitActionsPerSecond(policy.rateLimit.maxActionsPerSecond)) throw fail('E_POLICY_RATE_LIMIT', 'rate limit exceeded');
    if (!(node instanceof HTMLElement) || node.hasAttribute('disabled')) throw fail('E_NOT_INTERACTABLE', 'click target not interactable');

    if (step.scrollIntoView !== false) node.scrollIntoView({ block: 'center', behavior: 'instant' });
    if (!runOptions?.dryRun) {
      const button = step.button === 'RIGHT' ? 2 : 0;
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, button }));
      if (step.clickCount === 2) node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, button }));
    }
    if (step.postWaitMs) await sleep(step.postWaitMs);
    return {};
  }

  if (step.type === 'TYPE') {
    if (!limitActionsPerSecond(policy.rateLimit.maxActionsPerSecond)) throw fail('E_POLICY_RATE_LIMIT', 'rate limit exceeded');
    if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement)) throw fail('E_NOT_INTERACTABLE', 'type target not input');
    if (policy.privacy.blockSensitiveInputs && classifySensitive(node)) throw fail('E_POLICY_RATE_LIMIT', 'sensitive input blocked');

    const text = applyTemplate(step.textTemplate || '', vars);
    if (!runOptions?.dryRun) {
      node.focus();
      if (step.clearFirst) node.value = '';
      if (step.perCharDelayMs > 0) {
        for (const ch of text) {
          node.value += ch;
          node.dispatchEvent(new Event('input', { bubbles: true }));
          await sleep(step.perCharDelayMs);
        }
      } else {
        node.value = text;
        node.dispatchEvent(new Event('input', { bubbles: true }));
      }
      node.dispatchEvent(new Event('change', { bubbles: true }));
      if (step.pressEnter) node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
    return {};
  }

  throw fail('E_VERIFY_FAILED', `unknown step type ${step.type}`);
}

async function executeWithRetry(step, labels, vars, policy, runId, requestId, runOptions) {
  const retryCount = step.retry?.count ?? policy.retries.defaultRetryCount;
  const backoffMs = step.retry?.backoffMs ?? policy.retries.backoffMs;
  let lastErr = null;
  for (let i = 0; i <= retryCount; i += 1) {
    try {
      return await executeStep(step, labels, vars, policy, runId, requestId, runOptions);
    } catch (e) {
      lastErr = e;
      if (i >= retryCount) break;
      emitEvt('RUN_LOG_EVT', requestId, {
        runId,
        stepId: step.id,
        phase: 'RETRY',
        message: maskText(e.message),
        data: { attempt: i + 1, max: retryCount, reason: e.code || 'ERR' }
      });
      await sleep(backoffMs * (i + 1));
    }
  }
  throw lastErr;
}

async function runMacro(req) {
  if (state.run.running) return { accepted: false, reasonIfDenied: 'TAB_LOCKED' };

  const macro = req.payload?.macro;
  if (!macro) return { accepted: false, reasonIfDenied: 'NO_MACRO' };
  if (!hostAllowed(macro.allowedDomains)) return { accepted: false, reasonIfDenied: 'DOMAIN_NOT_ALLOWED' };

  const runId = req.payload.runId || uid('run');
  const runOptions = req.payload?.runOptions || {};
  const policy = macro.policies;
  const steps = macro.steps || [];

  state.run.running = true;
  state.run.paused = false;
  state.run.stopRequested = false;
  state.run.runId = runId;
  state.run.cursor = 0;
  state.run.repeatIndex = 0;
  state.run.startedAt = Date.now();
  state.run.totalSteps = 0;
  state.run.actionsInSecond = [];
  state.run.vars = {};

  const labels = compileLabelIndex(steps);
  const repeatCount = Number.isInteger(runOptions.repeatCount) ? runOptions.repeatCount : macro.repeatCount;
  const maxDurationMs = runOptions.maxDurationMs || policy.guards.maxDurationMs;
  const maxTotalSteps = runOptions.maxTotalSteps || policy.guards.maxTotalSteps;

  emitEvt('RUN_STATUS_EVT', req.requestId, {
    runId,
    status: 'RUNNING',
    cursor: 0,
    repeatIndex: 0,
    startedAt: state.run.startedAt,
    elapsedMs: 0
  });

  let cursor = 0;
  let repeatIndex = 0;

  try {
    while (true) {
      if (state.run.stopRequested) throw fail('E_USER_STOP', 'user stop');
      while (state.run.paused) await sleep(60);

      const elapsed = Date.now() - state.run.startedAt;
      if (elapsed > maxDurationMs) throw fail('E_GUARD_MAX_DURATION', 'maxDuration exceeded');
      if (state.run.totalSteps > maxTotalSteps) throw fail('E_GUARD_MAX_STEPS', 'maxTotalSteps exceeded');

      if (cursor >= steps.length) {
        repeatIndex += 1;
        if (repeatCount === 0) {
          if (repeatIndex > policy.guards.maxRepeatsHardLimit) throw fail('E_GUARD_MAX_STEPS', 'maxRepeatsHardLimit exceeded');
          cursor = 0;
          continue;
        }
        if (repeatIndex >= repeatCount) break;
        cursor = 0;
        continue;
      }

      const step = steps[cursor];
      if (!step) {
        cursor += 1;
        continue;
      }

      try {
        const result = await executeWithRetry(step, labels, state.run.vars, policy, runId, req.requestId, runOptions);
        emitEvt('RUN_LOG_EVT', req.requestId, {
          runId,
          stepId: step.id,
          phase: 'SUCCESS',
          message: `${step.type} ok`
        });

        if (Number.isInteger(result.next)) cursor = result.next;
        else cursor += 1;
        state.run.totalSteps += 1;
      } catch (e) {
        emitEvt('RUN_LOG_EVT', req.requestId, {
          runId,
          stepId: step.id,
          phase: 'FAIL',
          message: maskText(e.message),
          errorCode: e.code || 'E_TIMEOUT',
          data: { url: location.href, stepSummary: step.type }
        });

        const onFail = step.onFail?.action || 'STOP';
        if (onFail === 'SKIP') {
          emitEvt('RUN_LOG_EVT', req.requestId, { runId, stepId: step.id, phase: 'SKIP', message: 'onFail=SKIP' });
          cursor += 1;
          continue;
        }
        if (onFail === 'GOTO') {
          const idx = labels.get(step.onFail?.targetLabel);
          if (idx != null) {
            cursor = idx;
            continue;
          }
        }
        throw e;
      }

      emitEvt('RUN_STATUS_EVT', req.requestId, {
        runId,
        status: state.run.paused ? 'PAUSED' : 'RUNNING',
        cursor,
        repeatIndex,
        currentStepId: steps[Math.max(0, cursor - 1)]?.id,
        startedAt: state.run.startedAt,
        elapsedMs: Date.now() - state.run.startedAt
      });

      if (runOptions.stepDelayJitterMs) {
        await sleep(Math.floor(Math.random() * (runOptions.stepDelayJitterMs + 1)));
      }
    }

    emitEvt('RUN_END_EVT', req.requestId, {
      runId,
      status: 'SUCCESS',
      summary: {
        totalSteps: state.run.totalSteps,
        successSteps: state.run.totalSteps,
        durationMs: Date.now() - state.run.startedAt
      }
    });
    return { accepted: true, runId };
  } catch (e) {
    const status = e.code === 'E_USER_STOP' ? 'STOPPED' : 'FAILED';
    emitEvt('RUN_END_EVT', req.requestId, {
      runId,
      status,
      summary: {
        totalSteps: state.run.totalSteps,
        successSteps: Math.max(0, state.run.totalSteps - 1),
        failedStepId: steps[cursor]?.id,
        errorCode: e.code || 'E_TIMEOUT',
        durationMs: Date.now() - state.run.startedAt
      }
    });
    return { accepted: true, runId };
  } finally {
    state.run.running = false;
    state.run.paused = false;
    state.run.stopRequested = false;
  }
}

function installBridge() {
  if (state.bridgeInstalled) return;
  state.bridgeInstalled = true;

  window.addEventListener('message', async (event) => {
    const data = event.data;
    if (!data || data.channel !== CHANNEL_WEB_TO_EXT || !data.envelope) return;

    const req = data.envelope;
    if (!req.type?.endsWith('_REQ')) return;

    try {
      const bgRes = await chrome.runtime.sendMessage(req);
      if (bgRes) {
        window.postMessage({ channel: CHANNEL_EXT_TO_WEB, envelope: bgRes }, '*');
      }
    } catch (error) {
      window.postMessage({
        channel: CHANNEL_EXT_TO_WEB,
        envelope: {
          type: req.type.replace('_REQ', '_RES'),
          requestId: req.requestId,
          source: 'CS',
          target: req.source,
          timestamp: Date.now(),
          payload: { error: error.message }
        }
      }, '*');
    }
  });
}

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  (async () => {
    if (!req?.type?.endsWith('_REQ')) {
      sendResponse({ ok: false });
      return;
    }

    if (req.type === 'REC_START_REQ') {
      state.recorder.active = true;
      state.recorder.options = req.payload?.options || {};
      state.recorder.rawEventCount = 0;
      state.recorder.lastTs = Date.now();
      state.recorder.steps = [];
      state.recorder.startedAt = Date.now();
      bindRecorderListeners(req.requestId);
      sendResponse(makeRes(req, { started: true, tabId: req.payload?.tabId }));
      return;
    }

    if (req.type === 'REC_STOP_REQ') {
      state.recorder.active = false;
      sendResponse(makeRes(req, {
        stopped: true,
        steps: state.recorder.steps,
        stats: {
          rawEventCount: state.recorder.rawEventCount,
          stepCount: state.recorder.steps.length,
          durationMs: Date.now() - state.recorder.startedAt
        }
      }));
      return;
    }

    if (req.type === 'RUN_START_REQ') {
      const out = await runMacro(req);
      sendResponse(makeRes(req, out));
      return;
    }

    if (req.type === 'RUN_PAUSE_REQ') {
      state.run.paused = true;
      sendResponse(makeRes(req, { ok: true }));
      return;
    }

    if (req.type === 'RUN_RESUME_REQ') {
      state.run.paused = false;
      sendResponse(makeRes(req, { ok: true }));
      return;
    }

    if (req.type === 'RUN_STOP_REQ') {
      state.run.stopRequested = true;
      sendResponse(makeRes(req, { ok: true }));
      return;
    }

    sendResponse(makeRes(req, { error: 'unknown req at CS' }));
  })().catch((error) => {
    sendResponse(makeRes(req, { error: error.message }));
  });

  return true;
});

installBridge();
