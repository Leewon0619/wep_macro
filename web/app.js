const VK_KEY_UP = 0x00010000;
const STORAGE_KEY = 'web-macro-studio-v1';

const $ = (id) => document.getElementById(id);

const el = {
  addMacro: $('addMacro'),
  macroList: $('macroList'),
  macroName: $('macroName'),
  startKey: $('startKey'),
  stopKey: $('stopKey'),
  repeatCnt: $('repeatCnt'),
  startOnKeyUp: $('startOnKeyUp'),
  stopOnKeyUp: $('stopOnKeyUp'),
  saveMacro: $('saveMacro'),
  deleteMacro: $('deleteMacro'),
  stepBody: $('stepBody'),
  recKey: $('recKey'),
  recMouseButton: $('recMouseButton'),
  recMouseMove: $('recMouseMove'),
  recMouseWheel: $('recMouseWheel'),
  recDelay: $('recDelay'),
  recMerge: $('recMerge'),
  recDistance: $('recDistance'),
  recDelayThreshold: $('recDelayThreshold'),
  allowlist: $('allowlist'),
  minActionInterval: $('minActionInterval'),
  maxRunMs: $('maxRunMs'),
  maxLoopWhenInfinite: $('maxLoopWhenInfinite'),
  startRun: $('startRun'),
  pauseRun: $('pauseRun'),
  resumeRun: $('resumeRun'),
  stopRun: $('stopRun'),
  startRec: $('startRec'),
  stopRec: $('stopRec'),
  clearLogs: $('clearLogs'),
  status: $('status'),
  logBody: $('logBody'),
  playground: $('playground')
};

const state = {
  macros: [],
  selectedMacroId: null,
  run: {
    status: 'idle',
    macroId: null,
    index: -1,
    runCount: 0,
    stopRequested: false,
    pauseRequested: false,
    cumulativeMs: 0,
    startedAt: 0,
    heldInputs: new Map(),
    lastActionAt: 0,
    mutexKey: null,
    labelIndex: new Map()
  },
  recorder: {
    active: false,
    frameBound: false,
    lastTick: 0,
    lastMovePos: null,
    pendingMouseDown: null,
    pendingKeyDown: null
  },
  approvals: {
    hosts: new Set()
  },
  logs: []
};

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultStep(type) {
  return {
    id: uid('step'),
    type,
    enabled: true,
    timeoutMs: 3000,
    retries: 0,
    backoffMs: 300,
    onFail: { action: 'stop', label: '' },
    selector: '',
    button: 'left',
    doubleClick: false,
    textTemplate: '',
    clearFirst: true,
    ms: 300,
    pixels: 300,
    label: '',
    condition: { kind: 'exists', selector: '', text: '' },
    trueLabel: '',
    falseLabel: '',
    keyCode: 13,
    keyAction: 'tap',
    offsetX: 0,
    offsetY: 0
  };
}

function defaultMacro() {
  return {
    id: uid('macro'),
    name: '새 매크로',
    startKey: 113,
    stopKey: 114,
    repeatCnt: 1,
    items: [{ id: uid('step'), type: 'NONE', enabled: true }],
    options: {
      allowlist: ['localhost', '127.0.0.1'],
      minActionIntervalMs: 80,
      maxRunMs: 600000,
      maxLoopCountWhenInfinite: 1000,
      recorder: {
        KEYBOARD_KEY_REC: false,
        MOUSE_BUTTON_REC: true,
        MOUSE_POSITION_REC: false,
        MOUSE_WHEEL_REC: true,
        EVENT_DELAY: true,
        MERGE_UP_DOWN: true,
        mouseDistancePx: 12,
        eventDelayThresholdMs: 200
      }
    }
  };
}

function normalizeStep(raw) {
  const step = { ...defaultStep(raw.type || 'CLICK'), ...raw };
  if (!step.id) step.id = uid('step');
  if (!step.onFail) step.onFail = { action: 'stop', label: '' };
  if (!step.condition) step.condition = { kind: 'exists', selector: '', text: '' };
  return step;
}

function normalizeMacro(raw) {
  const macro = { ...defaultMacro(), ...raw };
  macro.items = Array.isArray(raw.items) && raw.items.length
    ? raw.items.map(normalizeStep)
    : [{ id: uid('step'), type: 'NONE', enabled: true }];
  macro.options = {
    ...defaultMacro().options,
    ...(raw.options || {}),
    recorder: {
      ...defaultMacro().options.recorder,
      ...((raw.options && raw.options.recorder) || {})
    }
  };
  return macro;
}

function saveStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ macros: state.macros }));
}

function loadStore() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (Array.isArray(data.macros) && data.macros.length) {
      state.macros = data.macros.map(normalizeMacro);
    } else {
      const macro = defaultMacro();
      macro.name = 'Demo Macro';
      macro.items.push(
        { ...defaultStep('CLICK'), selector: '#btn-open' },
        { ...defaultStep('TYPE'), selector: '#input-text', textTemplate: '{{RAND_STR:6}}' },
        { ...defaultStep('CLICK'), selector: '#btn-add' },
        { ...defaultStep('WAIT'), ms: 500 }
      );
      state.macros = [macro];
    }
  } catch {
    state.macros = [defaultMacro()];
  }

  state.selectedMacroId = state.macros[0]?.id || null;
}

function selectedMacro() {
  return state.macros.find((m) => m.id === state.selectedMacroId) || null;
}

function updateStatus(extra = '') {
  const run = state.run;
  const msg = [
    `상태: ${run.status}`,
    `macro: ${run.macroId || '-'}`,
    `index: ${run.index}`,
    `runCount: ${run.runCount}`,
    `누적(ms): ${run.cumulativeMs}`,
    extra
  ].filter(Boolean).join(' | ');
  el.status.textContent = msg;
}

function pushLog(level, message, stepId = '-', durationMs = 0) {
  const ts = new Date();
  state.logs.unshift({
    id: uid('log'),
    timestamp: ts.toLocaleTimeString('ko-KR', { hour12: false }),
    level,
    stepId,
    durationMs,
    cumulativeMs: state.run.cumulativeMs,
    message
  });
  state.logs = state.logs.slice(0, 300);
  renderLogs();
}

function renderLogs() {
  el.logBody.innerHTML = '';
  if (!state.logs.length) {
    el.logBody.innerHTML = '<tr><td colspan="6">로그 없음</td></tr>';
    return;
  }

  state.logs.forEach((log) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${log.timestamp}</td><td>${log.level}</td><td>${log.stepId}</td><td>${log.durationMs}</td><td>${log.cumulativeMs}</td><td>${escapeHtml(log.message)}</td>`;
    el.logBody.appendChild(tr);
  });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderMacroList() {
  el.macroList.innerHTML = '';
  state.macros.forEach((macro) => {
    const li = document.createElement('li');
    if (macro.id === state.selectedMacroId) li.classList.add('active');
    li.innerHTML = `<div>${escapeHtml(macro.name)}</div><small>start:${macro.startKey} stop:${macro.stopKey} repeat:${macro.repeatCnt}</small>`;
    li.addEventListener('click', () => {
      state.selectedMacroId = macro.id;
      syncMacroForm();
      renderMacroList();
      renderStepTable();
    });
    el.macroList.appendChild(li);
  });
}

function syncMacroForm() {
  const macro = selectedMacro();
  if (!macro) return;

  el.macroName.value = macro.name;
  el.startOnKeyUp.checked = Boolean(macro.startKey & VK_KEY_UP);
  el.stopOnKeyUp.checked = Boolean(macro.stopKey & VK_KEY_UP);
  el.startKey.value = macro.startKey & 0xFF;
  el.stopKey.value = macro.stopKey & 0xFF;
  el.repeatCnt.value = macro.repeatCnt;

  const rec = macro.options.recorder;
  el.recKey.checked = rec.KEYBOARD_KEY_REC;
  el.recMouseButton.checked = rec.MOUSE_BUTTON_REC;
  el.recMouseMove.checked = rec.MOUSE_POSITION_REC;
  el.recMouseWheel.checked = rec.MOUSE_WHEEL_REC;
  el.recDelay.checked = rec.EVENT_DELAY;
  el.recMerge.checked = rec.MERGE_UP_DOWN;
  el.recDistance.value = rec.mouseDistancePx;
  el.recDelayThreshold.value = rec.eventDelayThresholdMs;

  el.allowlist.value = macro.options.allowlist.join(', ');
  el.minActionInterval.value = macro.options.minActionIntervalMs;
  el.maxRunMs.value = macro.options.maxRunMs;
  el.maxLoopWhenInfinite.value = macro.options.maxLoopCountWhenInfinite;
}

function saveMacroForm() {
  const macro = selectedMacro();
  if (!macro) return;

  const startVk = Number(el.startKey.value) || 0;
  const stopVk = Number(el.stopKey.value) || 0;

  macro.name = el.macroName.value.trim() || '이름 없는 매크로';
  macro.startKey = (startVk & 0xFF) | (el.startOnKeyUp.checked ? VK_KEY_UP : 0);
  macro.stopKey = (stopVk & 0xFF) | (el.stopOnKeyUp.checked ? VK_KEY_UP : 0);
  macro.repeatCnt = Math.max(0, Number(el.repeatCnt.value) || 0);

  macro.options.allowlist = el.allowlist.value
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  macro.options.minActionIntervalMs = Math.max(0, Number(el.minActionInterval.value) || 0);
  macro.options.maxRunMs = Math.max(1000, Number(el.maxRunMs.value) || 600000);
  macro.options.maxLoopCountWhenInfinite = Math.max(1, Number(el.maxLoopWhenInfinite.value) || 1000);

  macro.options.recorder = {
    KEYBOARD_KEY_REC: el.recKey.checked,
    MOUSE_BUTTON_REC: el.recMouseButton.checked,
    MOUSE_POSITION_REC: el.recMouseMove.checked,
    MOUSE_WHEEL_REC: el.recMouseWheel.checked,
    EVENT_DELAY: el.recDelay.checked,
    MERGE_UP_DOWN: el.recMerge.checked,
    mouseDistancePx: Math.max(0, Number(el.recDistance.value) || 0),
    eventDelayThresholdMs: Math.max(0, Number(el.recDelayThreshold.value) || 0)
  };

  saveStore();
  renderMacroList();
  pushLog('info', '매크로 저장 완료');
}

function stepMainSummary(step) {
  switch (step.type) {
    case 'CLICK':
      return `${step.selector || '(selector 없음)'} / ${step.button}${step.doubleClick ? ' dbl' : ''}`;
    case 'TYPE':
      return `${step.selector || '(selector 없음)'} / ${step.textTemplate || ''}`;
    case 'WAIT':
      return `${step.ms}ms`;
    case 'SCROLL':
      return `pixels:${step.pixels} selector:${step.selector || '-'}`;
    case 'ASSERT_EXISTS':
      return `${step.selector || '(selector 없음)'} / timeout:${step.timeoutMs}`;
    case 'LABEL':
      return `label:${step.label}`;
    case 'GOTO':
      return `goto:${step.label}`;
    case 'IF':
      return `${step.condition.kind} -> ${step.trueLabel}/${step.falseLabel}`;
    case 'KEY':
      return `key:${step.keyCode} ${step.keyAction}`;
    case 'MOVE':
      return `${step.selector || '(selector 없음)'} (${step.offsetX},${step.offsetY})`;
    case 'NONE':
      return '더미';
    default:
      return '-';
  }
}

function buildStepConfigCell(step, macro) {
  const wrap = document.createElement('div');
  wrap.className = 'cell-grid';

  const type = document.createElement('select');
  ['NONE', 'CLICK', 'TYPE', 'WAIT', 'SCROLL', 'ASSERT_EXISTS', 'IF', 'GOTO', 'LABEL', 'KEY', 'MOVE'].forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    if (step.type === t) opt.selected = true;
    type.appendChild(opt);
  });
  type.addEventListener('change', () => {
    step.type = type.value;
    Object.assign(step, defaultStep(step.type));
    step.type = type.value;
    saveStore();
    renderStepTable();
  });
  wrap.appendChild(type);

  const setInput = (label, value, onChange, typeInput = 'text') => {
    const l = document.createElement('label');
    l.textContent = label;
    const input = document.createElement('input');
    input.type = typeInput;
    input.value = value ?? '';
    input.addEventListener('input', () => onChange(input.value));
    l.appendChild(input);
    wrap.appendChild(l);
  };

  const setCheck = (label, checked, onChange) => {
    const l = document.createElement('label');
    l.className = 'inline';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));
    l.appendChild(input);
    l.append(label);
    wrap.appendChild(l);
  };

  if (step.type === 'CLICK') {
    setInput('selector', step.selector, (v) => { step.selector = v; saveStore(); });
    const btn = document.createElement('select');
    ['left', 'right', 'middle'].forEach((b) => {
      const opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      if (step.button === b) opt.selected = true;
      btn.appendChild(opt);
    });
    btn.addEventListener('change', () => { step.button = btn.value; saveStore(); });
    wrap.appendChild(btn);
    setCheck('doubleClick', step.doubleClick, (v) => { step.doubleClick = v; saveStore(); });
  }

  if (step.type === 'TYPE') {
    setInput('selector', step.selector, (v) => { step.selector = v; saveStore(); });
    setInput('textTemplate', step.textTemplate, (v) => { step.textTemplate = v; saveStore(); });
    setCheck('clearFirst', step.clearFirst, (v) => { step.clearFirst = v; saveStore(); });
  }

  if (step.type === 'WAIT') {
    setInput('ms', step.ms, (v) => { step.ms = Number(v) || 0; saveStore(); }, 'number');
  }

  if (step.type === 'SCROLL') {
    setInput('pixels', step.pixels, (v) => { step.pixels = Number(v) || 0; saveStore(); }, 'number');
    setInput('selector(optional)', step.selector, (v) => { step.selector = v; saveStore(); });
  }

  if (step.type === 'ASSERT_EXISTS') {
    setInput('selector', step.selector, (v) => { step.selector = v; saveStore(); });
    setInput('timeoutMs', step.timeoutMs, (v) => { step.timeoutMs = Number(v) || 3000; saveStore(); }, 'number');
  }

  if (step.type === 'LABEL') {
    setInput('label', step.label, (v) => { step.label = v; saveStore(); });
  }

  if (step.type === 'GOTO') {
    setInput('label', step.label, (v) => { step.label = v; saveStore(); });
  }

  if (step.type === 'IF') {
    const kind = document.createElement('select');
    ['exists', 'text_includes'].forEach((k) => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = k;
      if (step.condition.kind === k) opt.selected = true;
      kind.appendChild(opt);
    });
    kind.addEventListener('change', () => {
      step.condition.kind = kind.value;
      saveStore();
    });
    wrap.appendChild(kind);
    setInput('condition.selector', step.condition.selector, (v) => { step.condition.selector = v; saveStore(); });
    setInput('condition.text', step.condition.text, (v) => { step.condition.text = v; saveStore(); });
    setInput('trueLabel', step.trueLabel, (v) => { step.trueLabel = v; saveStore(); });
    setInput('falseLabel', step.falseLabel, (v) => { step.falseLabel = v; saveStore(); });
  }

  if (step.type === 'KEY') {
    setInput('keyCode', step.keyCode, (v) => { step.keyCode = Number(v) || 0; saveStore(); }, 'number');
    const action = document.createElement('select');
    ['down', 'up', 'tap'].forEach((k) => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = k;
      if (step.keyAction === k) opt.selected = true;
      action.appendChild(opt);
    });
    action.addEventListener('change', () => { step.keyAction = action.value; saveStore(); });
    wrap.appendChild(action);
  }

  if (step.type === 'MOVE') {
    setInput('selector', step.selector, (v) => { step.selector = v; saveStore(); });
    setInput('offsetX', step.offsetX, (v) => { step.offsetX = Number(v) || 0; saveStore(); }, 'number');
    setInput('offsetY', step.offsetY, (v) => { step.offsetY = Number(v) || 0; saveStore(); }, 'number');
  }

  const retry = document.createElement('input');
  retry.type = 'number';
  retry.value = step.retries;
  retry.title = 'retries';
  retry.addEventListener('input', () => { step.retries = Math.max(0, Number(retry.value) || 0); saveStore(); });

  const timeout = document.createElement('input');
  timeout.type = 'number';
  timeout.value = step.timeoutMs;
  timeout.title = 'timeoutMs';
  timeout.addEventListener('input', () => { step.timeoutMs = Math.max(0, Number(timeout.value) || 0); saveStore(); });

  const onFail = document.createElement('select');
  ['stop', 'skip', 'goto'].forEach((f) => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    if (step.onFail.action === f) opt.selected = true;
    onFail.appendChild(opt);
  });
  onFail.addEventListener('change', () => { step.onFail.action = onFail.value; saveStore(); renderStepTable(); });

  const failWrap = document.createElement('div');
  failWrap.className = 'cell-grid';
  failWrap.append('retries', retry, 'timeout', timeout, 'onFail', onFail);
  if (step.onFail.action === 'goto') {
    const input = document.createElement('input');
    input.value = step.onFail.label || '';
    input.placeholder = 'fail label';
    input.addEventListener('input', () => { step.onFail.label = input.value; saveStore(); });
    failWrap.appendChild(input);
  }
  wrap.appendChild(failWrap);

  return wrap;
}

function renderStepTable() {
  const macro = selectedMacro();
  el.stepBody.innerHTML = '';
  if (!macro) return;

  macro.items.forEach((step, idx) => {
    const tr = document.createElement('tr');

    const tdIdx = document.createElement('td');
    tdIdx.textContent = String(idx);

    const tdType = document.createElement('td');
    tdType.textContent = step.type;

    const tdSummary = document.createElement('td');
    tdSummary.textContent = stepMainSummary(step);

    const tdOptions = document.createElement('td');
    tdOptions.appendChild(buildStepConfigCell(step, macro));

    const tdDel = document.createElement('td');
    if (idx > 0) {
      const del = document.createElement('button');
      del.textContent = '삭제';
      del.addEventListener('click', () => {
        macro.items.splice(idx, 1);
        saveStore();
        renderStepTable();
      });
      tdDel.appendChild(del);
    }

    tr.append(tdIdx, tdType, tdSummary, tdOptions, tdDel);
    el.stepBody.appendChild(tr);
  });
}

function addStep(type) {
  const macro = selectedMacro();
  if (!macro) return;
  macro.items.push(defaultStep(type));
  saveStore();
  renderStepTable();
}

function getFrameDoc() {
  return el.playground.contentDocument;
}

function getFrameWin() {
  return el.playground.contentWindow;
}

function currentHost() {
  try {
    const url = new URL(getFrameWin().location.href);
    return url.hostname.toLowerCase();
  } catch {
    return '';
  }
}

function checkAllowlist(macro) {
  const host = currentHost();
  if (!host) return true;
  if (!macro.options.allowlist.length) return true;
  if (macro.options.allowlist.includes(host)) return true;

  if (state.approvals.hosts.has(host)) return true;
  const ok = window.confirm(`허용되지 않은 도메인(${host})입니다. 1회 실행 승인할까요?`);
  if (ok) state.approvals.hosts.add(host);
  return ok;
}

function evaluateShortcut(vkCode, pressed) {
  const eventCode = pressed ? vkCode : (vkCode | VK_KEY_UP);

  for (const macro of state.macros) {
    if (state.run.status !== 'running' && macro.startKey === eventCode) {
      void startRun(macro.id);
      return;
    }

    if (state.run.status === 'running' && state.run.macroId === macro.id && macro.stopKey === eventCode) {
      requestStop();
      return;
    }
  }
}

function compileLabels(items) {
  const map = new Map();
  items.forEach((step, idx) => {
    if (step.type === 'LABEL' && step.label) {
      map.set(step.label, idx);
    }
  });
  return map;
}

function applyTemplate(text) {
  if (!text) return '';
  let out = text;

  out = out.replace(/\{\{\s*UUID\s*\}\}/g, crypto.randomUUID());
  out = out.replace(/\{\{\s*RAND_INT:(\d+):(\d+)\s*\}\}/g, (_, a, b) => {
    const min = Number(a);
    const max = Number(b);
    const n = Math.floor(Math.random() * (max - min + 1)) + min;
    return String(n);
  });
  out = out.replace(/\{\{\s*RAND_STR:(\d+)\s*\}\}/g, (_, lenStr) => {
    const len = Number(lenStr);
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < len; i += 1) {
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
  });

  return out;
}

function isSensitiveElement(node) {
  if (!(node instanceof Element)) return false;
  const type = String(node.getAttribute('type') || '').toLowerCase();
  const bag = `${node.id || ''} ${node.getAttribute('name') || ''} ${node.getAttribute('placeholder') || ''}`.toLowerCase();
  if (type === 'password') return true;
  return /(otp|2fa|card|cvv|pin|pass)/.test(bag);
}

function findBySelector(doc, selector) {
  if (!selector) return null;
  try {
    return doc.querySelector(selector);
  } catch {
    return null;
  }
}

async function waitForSelector(doc, selector, timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const node = findBySelector(doc, selector);
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

async function executeStep(macro, step) {
  const doc = getFrameDoc();
  const win = getFrameWin();
  if (!doc || !win) throw new Error('playground 미로드');

  const stepStart = performance.now();
  const timeoutMs = step.timeoutMs || 3000;

  if (!step.enabled) {
    return { nextIndex: null, durationMs: 0, message: 'disabled skip' };
  }

  if (step.type === 'NONE') {
    return { nextIndex: null, durationMs: 0, message: 'none skip' };
  }

  if (step.type === 'WAIT') {
    await sleep(step.ms || 0);
    return { nextIndex: null, durationMs: Math.round(performance.now() - stepStart), message: `wait ${step.ms}ms` };
  }

  if (step.type === 'LABEL') {
    return { nextIndex: null, durationMs: Math.round(performance.now() - stepStart), message: `label:${step.label}` };
  }

  if (step.type === 'GOTO') {
    const next = state.run.labelIndex.get(step.label);
    if (next == null) throw new Error(`GOTO 실패: label(${step.label}) 없음`);
    return { nextIndex: next, durationMs: Math.round(performance.now() - stepStart), message: `goto:${step.label}` };
  }

  if (step.type === 'IF') {
    let cond = false;
    if (step.condition.kind === 'exists') {
      cond = Boolean(await waitForSelector(doc, step.condition.selector, timeoutMs));
    } else if (step.condition.kind === 'text_includes') {
      const node = await waitForSelector(doc, step.condition.selector, timeoutMs);
      const text = (node?.textContent || '').trim();
      cond = text.includes(step.condition.text || '');
    }

    const label = cond ? step.trueLabel : step.falseLabel;
    if (!label) {
      return { nextIndex: null, durationMs: Math.round(performance.now() - stepStart), message: `if=${cond}` };
    }

    const next = state.run.labelIndex.get(label);
    if (next == null) throw new Error(`IF 분기 실패: label(${label}) 없음`);
    return { nextIndex: next, durationMs: Math.round(performance.now() - stepStart), message: `if=${cond} -> ${label}` };
  }

  if (step.type === 'ASSERT_EXISTS') {
    const node = await waitForSelector(doc, step.selector, timeoutMs);
    if (!node) throw new Error(`ASSERT 실패: ${step.selector}`);
    return { nextIndex: null, durationMs: Math.round(performance.now() - stepStart), message: 'assert ok' };
  }

  if (step.type === 'SCROLL') {
    if (step.selector) {
      const node = await waitForSelector(doc, step.selector, timeoutMs);
      if (!node) throw new Error(`SCROLL 실패: ${step.selector}`);
      node.scrollIntoView({ block: 'center', behavior: 'instant' });
    } else {
      win.scrollBy({ top: Number(step.pixels) || 0, behavior: 'instant' });
    }
    return { nextIndex: null, durationMs: Math.round(performance.now() - stepStart), message: 'scroll done' };
  }

  if (step.type === 'MOVE') {
    const node = await waitForSelector(doc, step.selector, timeoutMs);
    if (!node) throw new Error(`MOVE 실패: ${step.selector}`);
    const rect = node.getBoundingClientRect();
    const x = rect.left + rect.width / 2 + (Number(step.offsetX) || 0);
    const y = rect.top + rect.height / 2 + (Number(step.offsetY) || 0);
    node.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }));
    return { nextIndex: null, durationMs: Math.round(performance.now() - stepStart), message: 'move done' };
  }

  if (step.type === 'KEY') {
    const target = doc.activeElement || doc.body;
    const code = Number(step.keyCode) || 0;
    const key = String.fromCharCode(code);

    if (step.keyAction === 'down' || step.keyAction === 'tap') {
      target.dispatchEvent(new KeyboardEvent('keydown', { key, keyCode: code, which: code, bubbles: true }));
      state.run.heldInputs.set(code, true);
    }

    if (step.keyAction === 'up' || step.keyAction === 'tap') {
      target.dispatchEvent(new KeyboardEvent('keyup', { key, keyCode: code, which: code, bubbles: true }));
      state.run.heldInputs.delete(code);
    }

    return { nextIndex: null, durationMs: Math.round(performance.now() - stepStart), message: `key ${step.keyAction}` };
  }

  if (step.type === 'CLICK') {
    const node = await waitForSelector(doc, step.selector, timeoutMs);
    if (!node) throw new Error(`CLICK 실패: ${step.selector}`);

    const eventInit = { bubbles: true, cancelable: true, button: buttonCode(step.button) };
    node.dispatchEvent(new MouseEvent('mousedown', eventInit));
    node.dispatchEvent(new MouseEvent('mouseup', eventInit));
    node.dispatchEvent(new MouseEvent(step.doubleClick ? 'dblclick' : 'click', eventInit));
    return { nextIndex: null, durationMs: Math.round(performance.now() - stepStart), message: 'click done' };
  }

  if (step.type === 'TYPE') {
    const node = await waitForSelector(doc, step.selector, timeoutMs);
    if (!node) throw new Error(`TYPE 실패: ${step.selector}`);

    const text = applyTemplate(step.textTemplate || '');
    const target = node;
    target.focus();
    if (step.clearFirst) target.value = '';
    target.value = text;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    return { nextIndex: null, durationMs: Math.round(performance.now() - stepStart), message: 'type done' };
  }

  throw new Error(`미지원 step type: ${step.type}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeWithRetry(macro, step) {
  const retries = Math.max(0, Number(step.retries) || 0);
  const backoff = Math.max(0, Number(step.backoffMs) || 300);
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await executeStep(macro, step);
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await sleep(backoff * (2 ** attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function cleanupHeldInputs() {
  const doc = getFrameDoc();
  if (!doc) return;
  const target = doc.activeElement || doc.body;
  for (const [code] of state.run.heldInputs.entries()) {
    const key = String.fromCharCode(code);
    target.dispatchEvent(new KeyboardEvent('keyup', { key, keyCode: code, which: code, bubbles: true }));
  }
  state.run.heldInputs.clear();
}

async function handleStepFailure(step, errorMessage) {
  const action = step.onFail?.action || 'stop';
  if (action === 'skip') {
    pushLog('warn', `step 실패 skip: ${errorMessage}`, step.id);
    return { handled: true, nextIndex: null, stopped: false };
  }

  if (action === 'goto') {
    const idx = state.run.labelIndex.get(step.onFail?.label || '');
    if (idx == null) {
      return { handled: false, nextIndex: null, stopped: true, reason: `onFail goto 실패(${step.onFail?.label})` };
    }
    pushLog('warn', `step 실패 goto:${step.onFail.label}`, step.id);
    return { handled: true, nextIndex: idx, stopped: false };
  }

  return { handled: false, nextIndex: null, stopped: true, reason: errorMessage };
}

function acquireMutex(macroId) {
  if (state.run.mutexKey) return false;
  state.run.mutexKey = `macro-lock:${macroId}`;
  return true;
}

function releaseMutex() {
  state.run.mutexKey = null;
}

function requestStop() {
  state.run.stopRequested = true;
  updateStatus('정지 요청');
}

function pauseRun() {
  if (state.run.status !== 'running') return;
  state.run.pauseRequested = true;
  state.run.status = 'paused';
  updateStatus('일시정지');
}

function resumeRun() {
  if (state.run.status !== 'paused') return;
  state.run.pauseRequested = false;
  state.run.status = 'running';
  updateStatus('재개');
}

async function startRun(macroId = state.selectedMacroId) {
  const macro = state.macros.find((m) => m.id === macroId);
  if (!macro) return;

  if (state.run.status === 'running' || state.run.status === 'paused') {
    pushLog('warn', '이미 실행 중');
    return;
  }

  if (!checkAllowlist(macro)) {
    pushLog('error', 'allowlist 차단');
    return;
  }

  if (!acquireMutex(macro.id)) {
    pushLog('error', 'mutex lock 실패');
    return;
  }

  state.run.status = 'running';
  state.run.macroId = macro.id;
  state.run.index = 1;
  state.run.runCount = 0;
  state.run.stopRequested = false;
  state.run.pauseRequested = false;
  state.run.cumulativeMs = 0;
  state.run.startedAt = Date.now();
  state.run.lastActionAt = 0;
  state.run.labelIndex = compileLabels(macro.items);
  state.run.heldInputs.clear();
  updateStatus('시작');
  pushLog('info', `run start: ${macro.name}`);

  try {
    while (true) {
      if (state.run.stopRequested) {
        state.run.status = 'stopped';
        pushLog('warn', '사용자 정지');
        break;
      }

      while (state.run.status === 'paused') {
        await sleep(40);
        if (state.run.stopRequested) break;
      }

      if (state.run.stopRequested) {
        state.run.status = 'stopped';
        break;
      }

      if (state.run.index < 1 || state.run.index >= macro.items.length) {
        state.run.runCount += 1;

        if (macro.repeatCnt === 0) {
          const elapsed = Date.now() - state.run.startedAt;
          if (elapsed > macro.options.maxRunMs) {
            throw new Error(`무한 반복 안전중지(maxRunMs=${macro.options.maxRunMs})`);
          }
          if (state.run.runCount > macro.options.maxLoopCountWhenInfinite) {
            throw new Error(`무한 반복 안전중지(maxLoop=${macro.options.maxLoopCountWhenInfinite})`);
          }
          state.run.index = 1;
          continue;
        }

        if (state.run.runCount < macro.repeatCnt) {
          state.run.index = 1;
          continue;
        }

        state.run.status = 'success';
        pushLog('info', `run success: loops=${state.run.runCount}`);
        break;
      }

      const step = macro.items[state.run.index];
      if (!step) {
        state.run.index += 1;
        continue;
      }

      const now = Date.now();
      const elapsedSinceLast = now - state.run.lastActionAt;
      if (state.run.lastActionAt && elapsedSinceLast < macro.options.minActionIntervalMs) {
        await sleep(macro.options.minActionIntervalMs - elapsedSinceLast);
      }

      try {
        const result = await executeWithRetry(macro, step);
        state.run.cumulativeMs += result.durationMs || 0;
        state.run.lastActionAt = Date.now();
        pushLog('info', result.message || 'step ok', step.id, result.durationMs || 0);

        if (Number.isInteger(result.nextIndex)) {
          state.run.index = result.nextIndex;
        } else {
          state.run.index += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        pushLog('error', message, step.id);
        const fail = await handleStepFailure(step, message);
        if (fail.handled) {
          if (Number.isInteger(fail.nextIndex)) {
            state.run.index = fail.nextIndex;
          } else {
            state.run.index += 1;
          }
          continue;
        }

        state.run.status = 'fail';
        throw new Error(fail.reason || message);
      }

      updateStatus();
      await sleep(0);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    pushLog('error', `run fail: ${msg}`);
    state.run.status = state.run.status === 'stopped' ? 'stopped' : 'fail';
  } finally {
    await cleanupHeldInputs();
    releaseMutex();
    updateStatus('종료');
  }
}

function makeSelector(node) {
  if (!(node instanceof Element)) return '';
  if (node.id) return `#${CSS.escape(node.id)}`;

  const dataTestId = node.getAttribute('data-testid');
  if (dataTestId) return `[data-testid="${dataTestId}"]`;

  const name = node.getAttribute('name');
  if (name) return `[name="${name}"]`;

  const aria = node.getAttribute('aria-label');
  if (aria) return `[aria-label="${aria}"]`;

  const parts = [];
  let cur = node;
  while (cur && cur.tagName && cur.tagName.toLowerCase() !== 'html') {
    const tag = cur.tagName.toLowerCase();
    const parent = cur.parentElement;
    if (!parent) break;
    const same = Array.from(parent.children).filter((x) => x.tagName === cur.tagName);
    const idx = same.indexOf(cur) + 1;
    parts.unshift(`${tag}:nth-of-type(${idx})`);
    cur = parent;
    if (parts.length > 5) break;
  }
  return parts.join(' > ');
}

function maybeInsertDelay(macro, currentTick) {
  const rec = macro.options.recorder;
  if (!rec.EVENT_DELAY) {
    state.recorder.lastTick = currentTick;
    return;
  }

  const delta = currentTick - state.recorder.lastTick;
  if (state.recorder.lastTick > 0 && delta >= rec.eventDelayThresholdMs) {
    const wait = defaultStep('WAIT');
    wait.ms = delta;
    macro.items.push(wait);
  }
  state.recorder.lastTick = currentTick;
}

function recordStep(step) {
  const macro = selectedMacro();
  if (!macro) return;
  macro.items.push(step);
  saveStore();
  renderStepTable();
}

function bindRecorderEvents() {
  if (state.recorder.frameBound) return;
  const doc = getFrameDoc();
  const win = getFrameWin();
  if (!doc || !win) return;

  const onClick = (event) => {
    if (!state.recorder.active) return;
    const macro = selectedMacro();
    if (!macro || !macro.options.recorder.MOUSE_BUTTON_REC) return;

    maybeInsertDelay(macro, Date.now());
    const step = defaultStep('CLICK');
    step.selector = makeSelector(event.target);
    step.button = event.button === 2 ? 'right' : event.button === 1 ? 'middle' : 'left';
    recordStep(step);
  };

  const onInput = (event) => {
    if (!state.recorder.active) return;
    const macro = selectedMacro();
    if (!macro) return;

    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;

    maybeInsertDelay(macro, Date.now());
    const step = defaultStep('TYPE');
    step.selector = makeSelector(target);

    if (isSensitiveElement(target)) {
      step.textTemplate = '***MASKED***';
      pushLog('warn', '민감 입력 감지: 값 마스킹 저장');
    } else {
      step.textTemplate = String(target.value || '');
    }

    recordStep(step);
  };

  const onWheel = (event) => {
    if (!state.recorder.active) return;
    const macro = selectedMacro();
    if (!macro || !macro.options.recorder.MOUSE_WHEEL_REC) return;

    maybeInsertDelay(macro, Date.now());
    const step = defaultStep('SCROLL');
    step.pixels = Math.round(event.deltaY || 0);
    recordStep(step);
  };

  const onMouseMove = (event) => {
    if (!state.recorder.active) return;
    const macro = selectedMacro();
    const rec = macro?.options.recorder;
    if (!macro || !rec || !rec.MOUSE_POSITION_REC) return;

    const current = { x: event.clientX, y: event.clientY };
    const prev = state.recorder.lastMovePos;
    state.recorder.lastMovePos = current;
    if (!prev) return;

    const dx = current.x - prev.x;
    const dy = current.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < rec.mouseDistancePx) return;

    maybeInsertDelay(macro, Date.now());
    const step = defaultStep('MOVE');
    step.selector = makeSelector(event.target);
    step.offsetX = 0;
    step.offsetY = 0;
    recordStep(step);
  };

  const onKeyDown = (event) => {
    if (!state.recorder.active) return;
    const macro = selectedMacro();
    if (!macro || !macro.options.recorder.KEYBOARD_KEY_REC) return;

    if (event.repeat) return;
    maybeInsertDelay(macro, Date.now());

    const step = defaultStep('KEY');
    step.keyCode = event.keyCode;
    step.keyAction = 'down';
    recordStep(step);

    state.recorder.pendingKeyDown = { keyCode: event.keyCode, stepId: step.id, time: Date.now() };
  };

  const onKeyUp = (event) => {
    if (!state.recorder.active) return;
    const macro = selectedMacro();
    if (!macro || !macro.options.recorder.KEYBOARD_KEY_REC) return;

    maybeInsertDelay(macro, Date.now());

    const pending = state.recorder.pendingKeyDown;
    if (macro.options.recorder.MERGE_UP_DOWN && pending && pending.keyCode === event.keyCode) {
      const last = macro.items.find((x) => x.id === pending.stepId);
      if (last && last.type === 'KEY' && last.keyAction === 'down') {
        last.keyAction = 'tap';
        saveStore();
        renderStepTable();
        state.recorder.pendingKeyDown = null;
        return;
      }
    }

    const step = defaultStep('KEY');
    step.keyCode = event.keyCode;
    step.keyAction = 'up';
    recordStep(step);
  };

  doc.addEventListener('click', onClick, true);
  doc.addEventListener('change', onInput, true);
  doc.addEventListener('wheel', onWheel, true);
  doc.addEventListener('mousemove', onMouseMove, true);
  doc.addEventListener('keydown', onKeyDown, true);
  doc.addEventListener('keyup', onKeyUp, true);

  win.addEventListener('scroll', () => {
    if (!state.recorder.active) return;
    const macro = selectedMacro();
    if (!macro || !macro.options.recorder.MOUSE_WHEEL_REC) return;

    maybeInsertDelay(macro, Date.now());
    const step = defaultStep('SCROLL');
    step.pixels = Math.round(win.scrollY || 0);
    recordStep(step);
  }, true);

  state.recorder.frameBound = true;
}

function startRecorder() {
  const macro = selectedMacro();
  if (!macro) return;
  saveMacroForm();
  state.recorder.active = true;
  state.recorder.lastTick = Date.now();
  state.recorder.lastMovePos = null;
  state.recorder.pendingMouseDown = null;
  state.recorder.pendingKeyDown = null;
  updateStatus('레코더 활성');
  pushLog('info', 'recorder start');
}

function stopRecorder() {
  state.recorder.active = false;
  state.recorder.lastMovePos = null;
  state.recorder.pendingMouseDown = null;
  state.recorder.pendingKeyDown = null;
  updateStatus('레코더 비활성');
  pushLog('info', 'recorder stop');
}

function updateActionButtons() {
  const running = state.run.status === 'running' || state.run.status === 'paused';
  el.startRun.disabled = running;
  el.pauseRun.disabled = state.run.status !== 'running';
  el.resumeRun.disabled = state.run.status !== 'paused';
  el.stopRun.disabled = !running;
}

function bindEvents() {
  el.addMacro.addEventListener('click', () => {
    const m = defaultMacro();
    m.name = `Macro ${state.macros.length + 1}`;
    state.macros.push(m);
    state.selectedMacroId = m.id;
    saveStore();
    renderMacroList();
    syncMacroForm();
    renderStepTable();
  });

  el.saveMacro.addEventListener('click', saveMacroForm);

  el.deleteMacro.addEventListener('click', () => {
    if (!selectedMacro()) return;
    if (state.macros.length <= 1) {
      pushLog('warn', '최소 1개 매크로는 유지됩니다.');
      return;
    }
    state.macros = state.macros.filter((m) => m.id !== state.selectedMacroId);
    state.selectedMacroId = state.macros[0].id;
    saveStore();
    renderMacroList();
    syncMacroForm();
    renderStepTable();
  });

  document.querySelectorAll('[data-add-step]').forEach((btn) => {
    btn.addEventListener('click', () => addStep(btn.dataset.addStep));
  });

  el.startRun.addEventListener('click', async () => {
    saveMacroForm();
    updateActionButtons();
    await startRun();
    updateActionButtons();
  });
  el.pauseRun.addEventListener('click', () => {
    pauseRun();
    updateActionButtons();
  });
  el.resumeRun.addEventListener('click', () => {
    resumeRun();
    updateActionButtons();
  });
  el.stopRun.addEventListener('click', () => {
    requestStop();
    updateActionButtons();
  });

  el.startRec.addEventListener('click', startRecorder);
  el.stopRec.addEventListener('click', stopRecorder);

  el.clearLogs.addEventListener('click', () => {
    state.logs = [];
    renderLogs();
  });

  el.playground.addEventListener('load', () => {
    state.recorder.frameBound = false;
    bindRecorderEvents();
  });

  document.addEventListener('keydown', (event) => {
    evaluateShortcut(event.keyCode || event.which || 0, true);
  }, true);
  document.addEventListener('keyup', (event) => {
    evaluateShortcut(event.keyCode || event.which || 0, false);
  }, true);
}

function init() {
  loadStore();
  renderMacroList();
  syncMacroForm();
  renderStepTable();
  renderLogs();
  bindEvents();
  bindRecorderEvents();
  updateActionButtons();
  updateStatus('준비됨');
}

init();
