const state = {
  running: false,
  stopRequested: false,
  recorderOn: false,
  recorderSteps: [],
  recLastTick: 0,
  recPendingKeyDown: null,
  recPendingMouseDown: null,
  recOptions: {
    EVENT_DELAY: true,
    MERGE_UP_DOWN: true,
    MOUSE_BUTTON_REC: true,
    MOUSE_WHEEL_REC: true,
    MOUSE_POSITION_REC: false,
    KEYBOARD_KEY_REC: false,
    eventDelayThresholdMs: 200,
    mouseDistancePx: 12
  },
  recLastMovePos: null,
  heldKeys: new Set()
};

function uid(prefix = 'step') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeStep(raw) {
  return {
    id: raw.id || uid(),
    type: raw.type || 'CLICK',
    selector: raw.selector || '',
    textTemplate: raw.textTemplate || '',
    clearFirst: raw.clearFirst !== false,
    button: raw.button || 'left',
    doubleClick: !!raw.doubleClick,
    timeoutMs: raw.timeoutMs || 3000,
    retries: raw.retries || 0,
    backoffMs: raw.backoffMs || 300,
    ms: raw.ms || 0,
    pixels: raw.pixels || 0,
    onFail: raw.onFail || { action: 'stop', label: '' },
    enabled: raw.enabled !== false,
    label: raw.label || '',
    condition: raw.condition || { kind: 'exists', selector: '', text: '' },
    trueLabel: raw.trueLabel || '',
    falseLabel: raw.falseLabel || '',
    keyCode: raw.keyCode || 0,
    keyAction: raw.keyAction || 'tap',
    offsetX: raw.offsetX || 0,
    offsetY: raw.offsetY || 0
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function find(selector) {
  if (!selector) return null;
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

async function waitForSelector(selector, timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const node = find(selector);
    if (node) return node;
    await sleep(50);
  }
  return null;
}

function buttonCode(button) {
  if (button === 'right') return 2;
  if (button === 'middle') return 1;
  return 0;
}

function compileLabels(items) {
  const map = new Map();
  items.forEach((step, idx) => {
    if (step.type === 'LABEL' && step.label) map.set(step.label, idx);
  });
  return map;
}

async function execStep(step, labels) {
  if (step.type === 'NONE' || step.enabled === false) return { nextIndex: null };
  if (step.type === 'WAIT') {
    await sleep(step.ms || 0);
    return { nextIndex: null };
  }

  if (step.type === 'LABEL') return { nextIndex: null };

  if (step.type === 'GOTO') {
    const idx = labels.get(step.label);
    if (idx == null) throw new Error(`label not found: ${step.label}`);
    return { nextIndex: idx };
  }

  if (step.type === 'IF') {
    let cond = false;
    if (step.condition.kind === 'exists') {
      cond = Boolean(await waitForSelector(step.condition.selector, step.timeoutMs));
    } else if (step.condition.kind === 'text_includes') {
      const node = await waitForSelector(step.condition.selector, step.timeoutMs);
      cond = (node?.textContent || '').includes(step.condition.text || '');
    }
    const label = cond ? step.trueLabel : step.falseLabel;
    if (!label) return { nextIndex: null };
    const idx = labels.get(label);
    if (idx == null) throw new Error(`if label not found: ${label}`);
    return { nextIndex: idx };
  }

  if (step.type === 'SCROLL') {
    if (step.selector) {
      const node = await waitForSelector(step.selector, step.timeoutMs);
      if (!node) throw new Error(`selector not found: ${step.selector}`);
      node.scrollIntoView({ block: 'center', behavior: 'instant' });
    } else {
      window.scrollBy({ top: Number(step.pixels) || 0, behavior: 'instant' });
    }
    return { nextIndex: null };
  }

  if (step.type === 'ASSERT_EXISTS') {
    const node = await waitForSelector(step.selector, step.timeoutMs);
    if (!node) throw new Error(`assert fail: ${step.selector}`);
    return { nextIndex: null };
  }

  if (step.type === 'MOVE') {
    const node = await waitForSelector(step.selector, step.timeoutMs);
    if (!node) throw new Error(`move fail: ${step.selector}`);
    const rect = node.getBoundingClientRect();
    node.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      clientX: rect.left + rect.width / 2 + (Number(step.offsetX) || 0),
      clientY: rect.top + rect.height / 2 + (Number(step.offsetY) || 0)
    }));
    return { nextIndex: null };
  }

  if (step.type === 'KEY') {
    const target = document.activeElement || document.body;
    const code = Number(step.keyCode) || 0;
    const key = String.fromCharCode(code);

    if (step.keyAction === 'down' || step.keyAction === 'tap') {
      target.dispatchEvent(new KeyboardEvent('keydown', { key, keyCode: code, which: code, bubbles: true }));
      state.heldKeys.add(code);
    }
    if (step.keyAction === 'up' || step.keyAction === 'tap') {
      target.dispatchEvent(new KeyboardEvent('keyup', { key, keyCode: code, which: code, bubbles: true }));
      state.heldKeys.delete(code);
    }
    return { nextIndex: null };
  }

  if (step.type === 'CLICK') {
    const node = await waitForSelector(step.selector, step.timeoutMs);
    if (!node) throw new Error(`click fail: ${step.selector}`);
    const init = { bubbles: true, cancelable: true, button: buttonCode(step.button) };
    node.dispatchEvent(new MouseEvent('mousedown', init));
    node.dispatchEvent(new MouseEvent('mouseup', init));
    node.dispatchEvent(new MouseEvent(step.doubleClick ? 'dblclick' : 'click', init));
    return { nextIndex: null };
  }

  if (step.type === 'TYPE') {
    const node = await waitForSelector(step.selector, step.timeoutMs);
    if (!node) throw new Error(`type fail: ${step.selector}`);
    node.focus();
    if (step.clearFirst) node.value = '';
    node.value = step.textTemplate || '';
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
    return { nextIndex: null };
  }

  return { nextIndex: null };
}

async function execWithRetry(step, labels) {
  const retries = Math.max(0, Number(step.retries) || 0);
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await execStep(step, labels);
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await sleep((Number(step.backoffMs) || 300) * (2 ** attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function cleanupHeld() {
  const target = document.activeElement || document.body;
  for (const code of state.heldKeys.values()) {
    const key = String.fromCharCode(code);
    target.dispatchEvent(new KeyboardEvent('keyup', { key, keyCode: code, which: code, bubbles: true }));
  }
  state.heldKeys.clear();
}

async function runMacro(macro) {
  if (state.running) throw new Error('already running');
  state.running = true;
  state.stopRequested = false;

  const items = (macro.items || []).map(normalizeStep);
  const labels = compileLabels(items);
  let index = 1;
  let runCount = 0;
  const repeatCnt = Math.max(0, Number(macro.repeatCnt) || 0);

  try {
    while (true) {
      if (state.stopRequested) break;

      if (index < 1 || index >= items.length) {
        runCount += 1;
        if (repeatCnt === 0 || runCount < repeatCnt) {
          index = 1;
          continue;
        }
        break;
      }

      const step = items[index];
      try {
        const res = await execWithRetry(step, labels);
        if (Number.isInteger(res.nextIndex)) index = res.nextIndex;
        else index += 1;
      } catch (error) {
        const action = step.onFail?.action || 'stop';
        if (action === 'skip') {
          index += 1;
          continue;
        }
        if (action === 'goto') {
          const next = labels.get(step.onFail?.label || '');
          if (next != null) {
            index = next;
            continue;
          }
        }
        throw error;
      }
    }

    return { ok: true };
  } finally {
    state.running = false;
    state.stopRequested = false;
    await cleanupHeld();
    chrome.runtime.sendMessage({ type: 'BG_RUN_FINISHED', tabId: undefined }).catch(() => {});
  }
}

function toSelector(node) {
  if (!(node instanceof Element)) return '';
  if (node.id) return `#${CSS.escape(node.id)}`;
  if (node.getAttribute('name')) return `[name="${node.getAttribute('name')}"]`;
  return node.tagName.toLowerCase();
}

function shouldMask(target) {
  if (!(target instanceof Element)) return false;
  const type = (target.getAttribute('type') || '').toLowerCase();
  const bag = `${target.id || ''} ${target.getAttribute('name') || ''} ${target.getAttribute('placeholder') || ''}`.toLowerCase();
  return type === 'password' || /(otp|2fa|card|cvv|pin|pass)/.test(bag);
}

function maybeDelay(now) {
  if (!state.recOptions.EVENT_DELAY) {
    state.recLastTick = now;
    return;
  }

  const dt = now - state.recLastTick;
  if (state.recLastTick > 0 && dt >= state.recOptions.eventDelayThresholdMs) {
    state.recorderSteps.push({ id: uid(), type: 'WAIT', ms: dt });
  }
  state.recLastTick = now;
}

function record(step) {
  state.recorderSteps.push(step);
}

function bindRecorder() {
  if (window.__macroRecorderBound) return;
  window.__macroRecorderBound = true;

  document.addEventListener('click', (event) => {
    if (!state.recorderOn || !state.recOptions.MOUSE_BUTTON_REC) return;
    maybeDelay(Date.now());
    record({ id: uid(), type: 'CLICK', selector: toSelector(event.target), button: event.button === 2 ? 'right' : 'left' });
  }, true);

  document.addEventListener('change', (event) => {
    if (!state.recorderOn) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;

    maybeDelay(Date.now());
    record({
      id: uid(),
      type: 'TYPE',
      selector: toSelector(target),
      textTemplate: shouldMask(target) ? '***MASKED***' : String(target.value || ''),
      clearFirst: true
    });
  }, true);

  document.addEventListener('wheel', (event) => {
    if (!state.recorderOn || !state.recOptions.MOUSE_WHEEL_REC) return;
    maybeDelay(Date.now());
    record({ id: uid(), type: 'SCROLL', pixels: Math.round(event.deltaY || 0) });
  }, { capture: true, passive: true });

  document.addEventListener('mousemove', (event) => {
    if (!state.recorderOn || !state.recOptions.MOUSE_POSITION_REC) return;
    const p = { x: event.clientX, y: event.clientY };
    const prev = state.recLastMovePos;
    state.recLastMovePos = p;
    if (!prev) return;

    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < state.recOptions.mouseDistancePx) return;

    maybeDelay(Date.now());
    record({ id: uid(), type: 'MOVE', selector: toSelector(event.target), offsetX: 0, offsetY: 0 });
  }, true);

  document.addEventListener('keydown', (event) => {
    if (!state.recorderOn || !state.recOptions.KEYBOARD_KEY_REC || event.repeat) return;
    maybeDelay(Date.now());

    const step = { id: uid(), type: 'KEY', keyCode: event.keyCode, keyAction: 'down' };
    record(step);
    state.recPendingKeyDown = step;
  }, true);

  document.addEventListener('keyup', (event) => {
    if (!state.recorderOn || !state.recOptions.KEYBOARD_KEY_REC) return;
    maybeDelay(Date.now());

    if (state.recOptions.MERGE_UP_DOWN && state.recPendingKeyDown && state.recPendingKeyDown.keyCode === event.keyCode) {
      state.recPendingKeyDown.keyAction = 'tap';
      state.recPendingKeyDown = null;
      return;
    }

    record({ id: uid(), type: 'KEY', keyCode: event.keyCode, keyAction: 'up' });
  }, true);
}

bindRecorder();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === 'CT_START_RUN') {
      try {
        await runMacro(message.macro || {});
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
      return;
    }

    if (message.type === 'CT_STOP_RUN') {
      state.stopRequested = true;
      sendResponse({ ok: true });
      return;
    }

    if (message.type === 'CT_REC_START') {
      state.recorderOn = true;
      state.recorderSteps = [];
      state.recLastTick = Date.now();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === 'CT_REC_STOP') {
      state.recorderOn = false;
      sendResponse({ ok: true, steps: state.recorderSteps });
      return;
    }

    sendResponse({ ok: false, error: 'unknown message' });
  })();

  return true;
});
