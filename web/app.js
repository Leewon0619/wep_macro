const CHANNEL_WEB_TO_EXT = 'WEP_WEBAPP_TO_EXT';
const CHANNEL_EXT_TO_WEB = 'WEP_EXT_TO_WEBAPP';
const STORAGE_KEY = 'wep-macro-studio-state-v1';

const $ = (id) => document.getElementById(id);

const el = {
  addMacro: $('addMacro'),
  macroList: $('macroList'),
  macroName: $('macroName'),
  allowedDomains: $('allowedDomains'),
  repeatCount: $('repeatCount'),
  defaultStepTimeoutMs: $('defaultStepTimeoutMs'),
  defaultRetryCount: $('defaultRetryCount'),
  backoffMs: $('backoffMs'),
  maxDurationMs: $('maxDurationMs'),
  maxTotalSteps: $('maxTotalSteps'),
  maxRepeatsHardLimit: $('maxRepeatsHardLimit'),
  maxActionsPerSecond: $('maxActionsPerSecond'),
  blockSensitiveInputs: $('blockSensitiveInputs'),
  maskLogs: $('maskLogs'),
  saveMacro: $('saveMacro'),
  deleteMacro: $('deleteMacro'),
  exportMacro: $('exportMacro'),
  importFile: $('importFile'),
  stepTable: $('stepTable'),
  recordClick: $('recordClick'),
  recordInput: $('recordInput'),
  recordScroll: $('recordScroll'),
  insertWait: $('insertWait'),
  waitThresholdMs: $('waitThresholdMs'),
  inputDebounceMs: $('inputDebounceMs'),
  dedupeClicks: $('dedupeClicks'),
  ignoreWhileRunning: $('ignoreWhileRunning'),
  recStart: $('recStart'),
  recStop: $('recStop'),
  runRepeatCount: $('runRepeatCount'),
  runMaxDurationMs: $('runMaxDurationMs'),
  runMaxTotalSteps: $('runMaxTotalSteps'),
  stepDelayJitterMs: $('stepDelayJitterMs'),
  dryRun: $('dryRun'),
  ssOnFail: $('ssOnFail'),
  ssOnEachStep: $('ssOnEachStep'),
  runStart: $('runStart'),
  runPause: $('runPause'),
  runResume: $('runResume'),
  runStop: $('runStop'),
  screenRecStart: $('screenRecStart'),
  screenRecStop: $('screenRecStop'),
  screenAudio: $('screenAudio'),
  screenFrameRate: $('screenFrameRate'),
  screenSavePolicy: $('screenSavePolicy'),
  screenDownload: $('screenDownload'),
  screenInfo: $('screenInfo'),
  status: $('status'),
  logBody: $('logBody'),
  playground: $('playground')
};

const state = {
  macros: [],
  selectedMacroId: null,
  logs: [],
  run: {
    status: 'IDLE',
    runId: null,
    repeatIndex: 0,
    cursor: 0,
    startedAt: 0,
    elapsedMs: 0,
    stopRequested: false,
    pauseRequested: false
  },
  pendingReq: new Map(),
  extensionConnected: false,
  recorder: {
    active: false,
    handlersBound: false,
    lastTs: 0,
    steps: [],
    lastClickSig: '',
    inputTimers: new Map()
  },
  screenRec: {
    active: false,
    sessionId: null,
    stream: null,
    recorder: null,
    chunks: [],
    markers: []
  }
};

function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function defaultPolicies() {
  return {
    timeouts: { defaultStepTimeoutMs: 8000 },
    retries: { defaultRetryCount: 1, backoffMs: 500 },
    guards: { maxDurationMs: 1800000, maxTotalSteps: 20000, maxRepeatsHardLimit: 10000 },
    rateLimit: { maxActionsPerSecond: 8 },
    privacy: { blockSensitiveInputs: true, maskLogs: true },
    concurrency: { tabLock: 'EXCLUSIVE' }
  };
}

function defaultMacro() {
  return {
    schemaVersion: 1,
    id: uid('macro'),
    name: '새 매크로',
    allowedDomains: ['localhost', '127.0.0.1'],
    repeatCount: 1,
    variables: [],
    steps: [
      { id: uid('step'), type: 'LABEL', label: 'START' },
      {
        id: uid('step'),
        type: 'CLICK',
        target: {
          selector: {
            selectors: [{ kind: 'CSS', value: '#open', weight: 1 }],
            verify: [{ kind: 'VISIBLE', value: true }]
          }
        },
        button: 'LEFT',
        clickCount: 1,
        scrollIntoView: true,
        timeoutMs: 8000,
        retry: { count: 1, backoffMs: 500 },
        onFail: { action: 'STOP' }
      }
    ],
    policies: defaultPolicies(),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}

function sanitizeMacro(raw) {
  const base = defaultMacro();
  const macro = {
    ...base,
    ...raw,
    schemaVersion: 1,
    id: raw.id || base.id,
    name: raw.name || base.name,
    allowedDomains: Array.isArray(raw.allowedDomains) ? raw.allowedDomains : base.allowedDomains,
    repeatCount: Number.isInteger(raw.repeatCount) ? Math.max(0, raw.repeatCount) : base.repeatCount,
    variables: Array.isArray(raw.variables) ? raw.variables : [],
    steps: Array.isArray(raw.steps) && raw.steps.length ? raw.steps : base.steps,
    policies: {
      ...base.policies,
      ...(raw.policies || {}),
      timeouts: { ...base.policies.timeouts, ...((raw.policies || {}).timeouts || {}) },
      retries: { ...base.policies.retries, ...((raw.policies || {}).retries || {}) },
      guards: { ...base.policies.guards, ...((raw.policies || {}).guards || {}) },
      rateLimit: { ...base.policies.rateLimit, ...((raw.policies || {}).rateLimit || {}) },
      privacy: { ...base.policies.privacy, ...((raw.policies || {}).privacy || {}) },
      concurrency: { ...base.policies.concurrency, ...((raw.policies || {}).concurrency || {}) }
    },
    createdAt: raw.createdAt || nowIso(),
    updatedAt: nowIso()
  };

  macro.steps = macro.steps.map((step) => normalizeStep(step));
  return macro;
}

function normalizeStep(step) {
  const s = { ...step };
  if (!s.id) s.id = uid('step');
  if (!s.onFail) s.onFail = { action: 'STOP' };
  if (!s.retry) s.retry = { count: 0 };
  if (!s.timeoutMs) s.timeoutMs = 8000;
  return s;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ macros: state.macros }));
}

function loadState() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (Array.isArray(data.macros) && data.macros.length) {
      state.macros = data.macros.map(sanitizeMacro);
    }
  } catch {
    state.macros = [];
  }

  if (!state.macros.length) {
    state.macros = [defaultMacro()];
  }

  state.selectedMacroId = state.macros[0].id;
}

function selectedMacro() {
  return state.macros.find((m) => m.id === state.selectedMacroId) || null;
}

function addLog(type, phase, message, stepId = '-') {
  state.logs.unshift({ time: new Date().toLocaleTimeString('ko-KR', { hour12: false }), type, phase, stepId, message });
  state.logs = state.logs.slice(0, 500);
  renderLogs();
}

function renderLogs() {
  el.logBody.innerHTML = '';
  if (!state.logs.length) {
    el.logBody.innerHTML = '<tr><td colspan="5">로그 없음</td></tr>';
    return;
  }

  state.logs.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.time}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.phase)}</td><td>${escapeHtml(row.stepId)}</td><td>${escapeHtml(row.message)}</td>`;
    el.logBody.appendChild(tr);
  });
}

function escapeHtml(v) {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function updateStatus(extra = '') {
  const r = state.run;
  el.status.textContent = `status=${r.status} runId=${r.runId || '-'} cursor=${r.cursor} repeat=${r.repeatIndex} elapsed=${r.elapsedMs} ${extra}`;
}

function renderMacroList() {
  el.macroList.innerHTML = '';
  state.macros.forEach((m) => {
    const li = document.createElement('li');
    if (m.id === state.selectedMacroId) li.classList.add('active');
    li.textContent = `${m.name} (steps:${m.steps.length}, repeat:${m.repeatCount})`;
    li.addEventListener('click', () => {
      state.selectedMacroId = m.id;
      syncMacroForm();
      renderMacroList();
      renderStepTable();
    });
    el.macroList.appendChild(li);
  });
}

function syncMacroForm() {
  const m = selectedMacro();
  if (!m) return;

  el.macroName.value = m.name;
  el.allowedDomains.value = m.allowedDomains.join(', ');
  el.repeatCount.value = m.repeatCount;
  el.defaultStepTimeoutMs.value = m.policies.timeouts.defaultStepTimeoutMs;
  el.defaultRetryCount.value = m.policies.retries.defaultRetryCount;
  el.backoffMs.value = m.policies.retries.backoffMs;
  el.maxDurationMs.value = m.policies.guards.maxDurationMs;
  el.maxTotalSteps.value = m.policies.guards.maxTotalSteps;
  el.maxRepeatsHardLimit.value = m.policies.guards.maxRepeatsHardLimit;
  el.maxActionsPerSecond.value = m.policies.rateLimit.maxActionsPerSecond;
  el.blockSensitiveInputs.checked = m.policies.privacy.blockSensitiveInputs;
  el.maskLogs.checked = m.policies.privacy.maskLogs;
}

function saveMacroFromForm() {
  const m = selectedMacro();
  if (!m) return;

  m.name = el.macroName.value.trim() || '이름 없는 매크로';
  m.allowedDomains = el.allowedDomains.value.split(',').map((x) => x.trim()).filter(Boolean);
  m.repeatCount = Math.max(0, Number(el.repeatCount.value) || 0);
  m.policies.timeouts.defaultStepTimeoutMs = Math.max(100, Number(el.defaultStepTimeoutMs.value) || 8000);
  m.policies.retries.defaultRetryCount = Math.max(0, Number(el.defaultRetryCount.value) || 0);
  m.policies.retries.backoffMs = Math.max(0, Number(el.backoffMs.value) || 0);
  m.policies.guards.maxDurationMs = Math.max(1000, Number(el.maxDurationMs.value) || 1800000);
  m.policies.guards.maxTotalSteps = Math.max(1, Number(el.maxTotalSteps.value) || 20000);
  m.policies.guards.maxRepeatsHardLimit = Math.max(1, Number(el.maxRepeatsHardLimit.value) || 10000);
  m.policies.rateLimit.maxActionsPerSecond = Math.max(1, Number(el.maxActionsPerSecond.value) || 8);
  m.policies.privacy.blockSensitiveInputs = el.blockSensitiveInputs.checked;
  m.policies.privacy.maskLogs = el.maskLogs.checked;
  m.updatedAt = nowIso();

  saveState();
  renderMacroList();
  addLog('UI', 'SAVE', '매크로 저장');
}

function makeStep(type) {
  const base = {
    id: uid('step'),
    type,
    timeoutMs: 8000,
    retry: { count: 0, backoffMs: 500 },
    onFail: { action: 'STOP' }
  };

  if (type === 'CLICK') {
    return {
      ...base,
      target: { selector: { selectors: [{ kind: 'CSS', value: '' }], verify: [] } },
      button: 'LEFT',
      clickCount: 1,
      scrollIntoView: true,
      postWaitMs: 0
    };
  }

  if (type === 'TYPE') {
    return {
      ...base,
      target: { selector: { selectors: [{ kind: 'CSS', value: '' }], verify: [] } },
      textTemplate: '',
      clearFirst: true,
      pressEnter: false,
      perCharDelayMs: 0
    };
  }

  if (type === 'WAIT') return { ...base, ms: 500 };
  if (type === 'SCROLL') return { ...base, mode: 'PIXEL', deltaY: 300, postWaitMs: 0 };
  if (type === 'ASSERT') return { ...base, target: { selector: { selectors: [{ kind: 'CSS', value: '' }], verify: [] } }, expect: 'EXISTS', value: '' };
  if (type === 'SET_VAR') return { ...base, name: 'VAR', source: 'CONST', constValue: '' };
  if (type === 'IF') {
    return {
      ...base,
      condition: { kind: 'EXISTS', target: { selector: { selectors: [{ kind: 'CSS', value: '' }] } }, value: '' },
      then: [],
      else: []
    };
  }
  if (type === 'LABEL') return { ...base, label: 'L1' };
  if (type === 'GOTO') return { ...base, targetLabel: 'L1' };
  return base;
}

function renderStepTable() {
  const m = selectedMacro();
  el.stepTable.innerHTML = '';
  if (!m) return;

  m.steps.forEach((step, idx) => {
    const tr = document.createElement('tr');

    const typeSel = document.createElement('select');
    ['CLICK', 'TYPE', 'WAIT', 'SCROLL', 'ASSERT', 'SET_VAR', 'IF', 'LABEL', 'GOTO'].forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      if (step.type === t) opt.selected = true;
      typeSel.appendChild(opt);
    });
    typeSel.addEventListener('change', () => {
      m.steps[idx] = makeStep(typeSel.value);
      saveState();
      renderStepTable();
    });

    const cfg = document.createElement('textarea');
    cfg.value = JSON.stringify(step, null, 2);
    cfg.rows = 8;
    cfg.addEventListener('change', () => {
      try {
        m.steps[idx] = normalizeStep(JSON.parse(cfg.value));
        saveState();
        renderStepTable();
        addLog('UI', 'STEP_SAVE', `step ${step.id} 저장`);
      } catch (error) {
        addLog('UI', 'ERROR', `step json 파싱 실패: ${error.message}`);
      }
    });

    const retry = document.createElement('div');
    retry.textContent = `retry=${step.retry?.count ?? 0}, onFail=${step.onFail?.action || 'STOP'}`;

    const del = document.createElement('button');
    del.textContent = 'del';
    del.addEventListener('click', () => {
      m.steps.splice(idx, 1);
      if (!m.steps.length) m.steps.push(makeStep('WAIT'));
      saveState();
      renderStepTable();
    });

    tr.innerHTML = `<td>${idx + 1}</td><td></td><td></td><td></td><td></td>`;
    tr.children[1].appendChild(typeSel);
    tr.children[2].appendChild(cfg);
    tr.children[3].appendChild(retry);
    tr.children[4].appendChild(del);
    el.stepTable.appendChild(tr);
  });
}

function recorderOptions() {
  return {
    recordClick: el.recordClick.checked,
    recordInput: el.recordInput.checked,
    recordScroll: el.recordScroll.checked,
    insertWait: el.insertWait.checked,
    waitThresholdMs: Number(el.waitThresholdMs.value) || 250,
    inputDebounceMs: Number(el.inputDebounceMs.value) || 300,
    dedupeClicks: el.dedupeClicks.checked,
    ignoreWhileRunning: el.ignoreWhileRunning.checked
  };
}

function runOptions() {
  return {
    repeatCount: el.runRepeatCount.value ? Number(el.runRepeatCount.value) : undefined,
    maxDurationMs: el.runMaxDurationMs.value ? Number(el.runMaxDurationMs.value) : undefined,
    maxTotalSteps: el.runMaxTotalSteps.value ? Number(el.runMaxTotalSteps.value) : undefined,
    stepDelayJitterMs: Math.max(0, Number(el.stepDelayJitterMs.value) || 0),
    dryRun: el.dryRun.checked,
    screenshots: {
      onFail: el.ssOnFail.checked,
      onEachStep: el.ssOnEachStep.checked
    }
  };
}

function envelope(type, target, payload) {
  return {
    type,
    requestId: uid('req'),
    source: 'WEBAPP',
    target,
    timestamp: Date.now(),
    payload
  };
}

function sendToExtension(type, target, payload, timeoutMs = 12000) {
  const env = envelope(type, target, payload);

  return new Promise((resolve) => {
    state.pendingReq.set(env.requestId, { resolve, createdAt: Date.now() });
    window.postMessage({ channel: CHANNEL_WEB_TO_EXT, envelope: env }, '*');

    setTimeout(() => {
      const pending = state.pendingReq.get(env.requestId);
      if (!pending) return;
      state.pendingReq.delete(env.requestId);
      resolve({ timeout: true, payload: { error: 'EXT_TIMEOUT' } });
    }, timeoutMs);
  });
}

window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.channel !== CHANNEL_EXT_TO_WEB || !data.envelope) return;

  const env = data.envelope;

  if (env.type.endsWith('_EVT')) {
    handleEventEnvelope(env);
    return;
  }

  const pending = state.pendingReq.get(env.requestId);
  if (!pending) return;
  state.pendingReq.delete(env.requestId);
  pending.resolve({ timeout: false, payload: env.payload, envelope: env });
});

function handleEventEnvelope(env) {
  state.extensionConnected = true;

  if (env.type === 'RUN_STATUS_EVT') {
    const p = env.payload;
    state.run.status = p.status;
    state.run.cursor = p.cursor;
    state.run.repeatIndex = p.repeatIndex;
    state.run.elapsedMs = p.elapsedMs;
    updateStatus();
    return;
  }

  if (env.type === 'RUN_LOG_EVT') {
    const p = env.payload;
    addLog('RUN', p.phase, `${p.message || ''} ${p.errorCode || ''}`, p.stepId || '-');
    if (state.screenRec.active && state.screenRec.sessionId && p.phase === 'START') {
      markScreenRec(p.runId, p.stepId);
    }
    return;
  }

  if (env.type === 'RUN_END_EVT') {
    const p = env.payload;
    state.run.status = p.status;
    updateStatus();
    addLog('RUN', 'END', `${p.status} duration=${p.summary?.durationMs || 0}`);
    return;
  }

  if (env.type === 'REC_EVENT_EVT') {
    addLog('REC', 'EVENT', '실시간 녹화 이벤트 수신');
  }
}

function inMaskPolicy() {
  const m = selectedMacro();
  return Boolean(m?.policies?.privacy?.maskLogs);
}

function maskIfNeeded(text) {
  return inMaskPolicy() ? String(text).replace(/(password|otp|cvv|pin|secret)/gi, '***') : text;
}

async function extPing() {
  const res = await sendToExtension('EXT_PING_REQ', 'BG', {});
  if (!res.timeout && res.payload?.version) {
    state.extensionConnected = true;
    addLog('EXT', 'PING', `version=${res.payload.version}`);
    return true;
  }
  state.extensionConnected = false;
  addLog('EXT', 'PING', '확장 응답 없음 - 로컬 fallback');
  return false;
}

async function startRec() {
  saveMacroFromForm();
  const m = selectedMacro();
  if (!m) return;

  const payload = {
    macroId: m.id,
    tabId: null,
    options: recorderOptions()
  };

  const ok = await extPing();
  if (ok) {
    const res = await sendToExtension('REC_START_REQ', 'BG', payload);
    if (!res.timeout && res.payload?.started) {
      addLog('REC', 'START', '확장 녹화 시작');
      return;
    }
  }

  startLocalRecorder(payload.options);
}

async function stopRec() {
  const m = selectedMacro();
  if (!m) return;

  const ok = await extPing();
  if (ok) {
    const res = await sendToExtension('REC_STOP_REQ', 'BG', { macroId: m.id });
    if (!res.timeout && res.payload?.stopped) {
      const steps = res.payload.steps || [];
      m.steps.push(...steps.map(normalizeStep));
      m.updatedAt = nowIso();
      saveState();
      renderStepTable();
      addLog('REC', 'STOP', `확장 녹화 종료 steps=${steps.length}`);
      return;
    }
  }

  stopLocalRecorder();
}

function isSensitiveElement(node) {
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
  const txt = (node.textContent || '').trim();
  if (txt && txt.length <= 40) list.push({ kind: 'TEXT', value: txt, weight: 0.7 });
  if (!list.length) list.push({ kind: 'CSS', value: node.tagName.toLowerCase(), weight: 0.2 });
  return list.slice(0, 5);
}

function startLocalRecorder(options) {
  const frameDoc = el.playground.contentDocument;
  if (!frameDoc) {
    addLog('REC', 'ERROR', 'iframe not ready');
    return;
  }

  state.recorder.active = true;
  state.recorder.steps = [];
  state.recorder.lastTs = Date.now();
  state.recorder.lastClickSig = '';

  if (state.recorder.handlersBound) {
    addLog('REC', 'START', '로컬 녹화 시작');
    return;
  }

  const addWaitIfNeeded = () => {
    if (!options.insertWait) return;
    const now = Date.now();
    const dt = now - state.recorder.lastTs;
    if (dt >= options.waitThresholdMs) {
      state.recorder.steps.push({ id: uid('step'), type: 'WAIT', ms: dt, timeoutMs: 8000, retry: { count: 0 }, onFail: { action: 'STOP' } });
    }
    state.recorder.lastTs = now;
  };

  frameDoc.addEventListener('click', (event) => {
    if (!state.recorder.active || !options.recordClick) return;
    addWaitIfNeeded();

    const sig = `${event.target?.id || ''}:${event.button}`;
    if (options.dedupeClicks && sig === state.recorder.lastClickSig) return;
    state.recorder.lastClickSig = sig;

    const candidates = selectorCandidates(event.target);
    state.recorder.steps.push(normalizeStep({
      id: uid('step'),
      type: 'CLICK',
      target: { selector: { selectors: candidates, verify: [{ kind: 'VISIBLE', value: true }] } },
      button: event.button === 2 ? 'RIGHT' : 'LEFT',
      clickCount: event.detail >= 2 ? 2 : 1,
      scrollIntoView: true,
      timeoutMs: 8000,
      retry: { count: 1, backoffMs: 500 },
      onFail: { action: 'STOP' }
    }));
  }, true);

  frameDoc.addEventListener('input', (event) => {
    if (!state.recorder.active || !options.recordInput) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;

    const key = target;
    clearTimeout(state.recorder.inputTimers.get(key));
    const timer = setTimeout(() => {
      addWaitIfNeeded();
      const m = selectedMacro();
      const blocked = m?.policies?.privacy?.blockSensitiveInputs && isSensitiveElement(target);
      if (blocked) {
        addLog('REC', 'MASK', '민감 입력은 기록하지 않음');
        return;
      }
      state.recorder.steps.push(normalizeStep({
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
      }));
    }, options.inputDebounceMs);
    state.recorder.inputTimers.set(key, timer);
  }, true);

  frameDoc.addEventListener('wheel', (event) => {
    if (!state.recorder.active || !options.recordScroll) return;
    addWaitIfNeeded();
    state.recorder.steps.push(normalizeStep({
      id: uid('step'),
      type: 'SCROLL',
      mode: 'PIXEL',
      deltaY: Math.round(event.deltaY || 0),
      timeoutMs: 8000,
      retry: { count: 0 },
      onFail: { action: 'STOP' }
    }));
  }, { capture: true, passive: true });

  state.recorder.handlersBound = true;
  addLog('REC', 'START', '로컬 녹화 시작');
}

function stopLocalRecorder() {
  const m = selectedMacro();
  if (!m) return;
  state.recorder.active = false;
  m.steps.push(...state.recorder.steps);
  m.updatedAt = nowIso();
  saveState();
  renderStepTable();
  addLog('REC', 'STOP', `로컬 녹화 종료 steps=${state.recorder.steps.length}`);
}

async function runStart() {
  saveMacroFromForm();
  const m = selectedMacro();
  if (!m) return;

  const payload = {
    macro: m,
    tabId: null,
    runOptions: runOptions(),
    screenshots: runOptions().screenshots
  };

  const ok = await extPing();
  if (ok) {
    const res = await sendToExtension('RUN_START_REQ', 'BG', payload);
    if (!res.timeout && res.payload?.accepted) {
      state.run.status = 'RUNNING';
      state.run.runId = res.payload.runId;
      updateStatus('확장 실행 시작');
      return;
    }
    addLog('RUN', 'DENY', `확장 실행 거부: ${res.payload?.reasonIfDenied || 'unknown'}`);
  }

  await runLocal(m, runOptions());
}

async function runPause() {
  if (state.extensionConnected && state.run.runId) {
    await sendToExtension('RUN_PAUSE_REQ', 'BG', { runId: state.run.runId });
  }
  state.run.pauseRequested = true;
  state.run.status = 'PAUSED';
  updateStatus();
}

async function runResume() {
  if (state.extensionConnected && state.run.runId) {
    await sendToExtension('RUN_RESUME_REQ', 'BG', { runId: state.run.runId });
  }
  state.run.pauseRequested = false;
  state.run.status = 'RUNNING';
  updateStatus();
}

async function runStop() {
  if (state.extensionConnected && state.run.runId) {
    await sendToExtension('RUN_STOP_REQ', 'BG', { runId: state.run.runId, reason: 'USER' });
  }
  state.run.stopRequested = true;
  state.run.status = 'STOPPED';
  updateStatus();
}

function resolveCandidate(doc, c) {
  try {
    if (c.kind === 'CSS' || c.kind === 'DATA_ATTR') return doc.querySelector(c.value);
    if (c.kind === 'TEXT') {
      return Array.from(doc.querySelectorAll('button,a,div,span,label,p')).find((n) => (n.textContent || '').includes(c.value)) || null;
    }
    if (c.kind === 'ARIA') {
      return doc.querySelector(`[aria-label="${c.value.replace(/"/g, '\\"')}"]`);
    }
    if (c.kind === 'XPATH') {
      const r = doc.evaluate(c.value, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return r.singleNodeValue;
    }
    return null;
  } catch {
    return null;
  }
}

function verifyNode(node, verify) {
  if (!verify || !verify.length) return true;
  for (const rule of verify) {
    if (rule.kind === 'VISIBLE') {
      const rect = node.getBoundingClientRect();
      if (Boolean(rule.value) && (rect.width <= 0 || rect.height <= 0)) return false;
    }
    if (rule.kind === 'TEXT_CONTAINS') {
      if (!(node.textContent || '').includes(String(rule.value || ''))) return false;
    }
    if (rule.kind === 'ATTRIBUTE_EQUALS') {
      if (String(node.getAttribute(rule.attr || '') || '') !== String(rule.value || '')) return false;
    }
  }
  return true;
}

async function resolveTarget(doc, selectorSpec, timeoutMs) {
  const end = Date.now() + timeoutMs;
  const cands = selectorSpec?.selectors || [];
  while (Date.now() < end) {
    for (const c of cands) {
      const n = resolveCandidate(doc, c);
      if (!n) continue;
      if (!verifyNode(n, selectorSpec.verify)) continue;
      return n;
    }
    await sleep(80);
  }
  return null;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function applyTemplate(text, vars = {}) {
  let out = String(text || '');
  out = out.replace(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (_, key) => String(vars[key] ?? ''));
  out = out.replace(/\{\{\s*UUID\s*\}\}/g, crypto.randomUUID());
  out = out.replace(/\{\{\s*RAND_INT:(-?\d+):(-?\d+)\s*\}\}/g, (_, a, b) => String(randInt(Number(a), Number(b))));
  out = out.replace(/\{\{\s*RAND_STR:(\d+)\s*\}\}/g, (_, l) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < Number(l); i += 1) s += chars[randInt(0, chars.length - 1)];
    return s;
  });
  return out;
}

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

async function runLocal(macro, options) {
  const doc = el.playground.contentDocument;
  const win = el.playground.contentWindow;
  if (!doc || !win) {
    addLog('RUN', 'FAIL', 'E_TIMEOUT playground not loaded');
    return;
  }

  const host = new URL(win.location.href).hostname;
  if (!macro.allowedDomains.includes(host)) {
    addLog('RUN', 'FAIL', `E_DOMAIN_NOT_ALLOWED host=${host}`);
    return;
  }

  const runId = uid('run');
  state.run = {
    ...state.run,
    status: 'RUNNING',
    runId,
    cursor: 0,
    repeatIndex: 0,
    startedAt: Date.now(),
    elapsedMs: 0,
    stopRequested: false,
    pauseRequested: false
  };
  updateStatus('local run');

  const vars = {};
  const labels = new Map();
  macro.steps.forEach((s, i) => { if (s.type === 'LABEL' && s.label) labels.set(s.label, i); });

  const repeat = options.repeatCount ?? macro.repeatCount;
  const maxDurationMs = options.maxDurationMs ?? macro.policies.guards.maxDurationMs;
  const maxTotalSteps = options.maxTotalSteps ?? macro.policies.guards.maxTotalSteps;
  const maxRepeatHard = macro.policies.guards.maxRepeatsHardLimit;

  const minGap = 1000 / Math.max(1, macro.policies.rateLimit.maxActionsPerSecond);
  let lastActionAt = 0;
  let totalSteps = 0;
  let cursor = 0;
  let loop = 0;

  const runStep = async (step) => {
    addLog('RUN', 'START', `step ${step.type}`, step.id);
    if (state.screenRec.active) markScreenRec(runId, step.id);

    const timeoutMs = step.timeoutMs || macro.policies.timeouts.defaultStepTimeoutMs;

    if (step.type === 'WAIT') {
      await sleep(step.ms || 0);
      return { ok: true };
    }

    if (step.type === 'LABEL') return { ok: true };

    if (step.type === 'GOTO') {
      const idx = labels.get(step.targetLabel);
      if (idx == null) throw fail('E_VERIFY_FAILED', `label not found: ${step.targetLabel}`);
      return { ok: true, nextCursor: idx };
    }

    if (step.type === 'IF') {
      const cond = step.condition || {};
      let ok = false;
      if (cond.kind === 'URL_MATCH') ok = new RegExp(cond.value || '').test(win.location.href);
      if (cond.kind === 'VAR_EQUALS') ok = String(vars[cond.varName] ?? '') === String(cond.value ?? '');
      if (cond.kind === 'EXISTS' || cond.kind === 'NOT_EXISTS' || cond.kind === 'TEXT_CONTAINS') {
        const node = await resolveTarget(doc, cond.target?.selector, timeoutMs);
        if (cond.kind === 'EXISTS') ok = Boolean(node);
        if (cond.kind === 'NOT_EXISTS') ok = !node;
        if (cond.kind === 'TEXT_CONTAINS') ok = Boolean(node && (node.textContent || '').includes(cond.value || ''));
      }

      const block = ok ? (step.then || []) : (step.else || []);
      for (const nested of block) {
        await runStep(nested);
      }
      return { ok: true };
    }

    if (step.type === 'SET_VAR') {
      if (step.source === 'CONST') vars[step.name] = step.constValue;
      if (step.source === 'RANDOM') {
        if (step.random?.kind === 'UUID') vars[step.name] = crypto.randomUUID();
        if (step.random?.kind === 'RAND_INT') vars[step.name] = randInt(step.random?.min ?? 0, step.random?.max ?? 100);
        if (step.random?.kind === 'RAND_STR') vars[step.name] = applyTemplate(`{{RAND_STR:${step.random?.length ?? 8}}}`);
      }
      if (step.source === 'PAGE_TEXT') {
        const node = await resolveTarget(doc, step.from?.selector, timeoutMs);
        if (!node) throw fail('E_SELECTOR_NOT_FOUND', 'SET_VAR source selector not found');
        vars[step.name] = (node.textContent || '').trim();
      }
      return { ok: true };
    }

    if (['CLICK', 'TYPE', 'ASSERT'].includes(step.type)) {
      const node = await resolveTarget(doc, step.target?.selector, timeoutMs);
      if (!node) throw fail('E_SELECTOR_NOT_FOUND', 'selector not found');

      if (step.type === 'ASSERT') {
        const expect = step.expect || 'EXISTS';
        if (expect === 'EXISTS' && !node) throw fail('E_VERIFY_FAILED', 'assert exists failed');
        if (expect === 'TEXT_CONTAINS' && !(node.textContent || '').includes(step.value || '')) throw fail('E_VERIFY_FAILED', 'assert text failed');
        if (expect === 'URL_MATCH' && !new RegExp(step.value || '').test(win.location.href)) throw fail('E_VERIFY_FAILED', 'assert url failed');
        return { ok: true };
      }

      if (step.type === 'CLICK') {
        if (!(node instanceof HTMLElement) || node.hasAttribute('disabled')) throw fail('E_NOT_INTERACTABLE', 'node disabled/not interactable');
        if (step.scrollIntoView !== false) node.scrollIntoView({ block: 'center', behavior: 'instant' });
        if (!options.dryRun) {
          const btn = step.button === 'RIGHT' ? 2 : 0;
          node.dispatchEvent(new MouseEvent('click', { bubbles: true, button: btn }));
          if (step.clickCount === 2) node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, button: btn }));
        }
      }

      if (step.type === 'TYPE') {
        if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement)) {
          throw fail('E_NOT_INTERACTABLE', 'type target not input');
        }
        if (macro.policies.privacy.blockSensitiveInputs && isSensitiveElement(node)) {
          throw fail('E_POLICY_RATE_LIMIT', 'sensitive input blocked');
        }
        const text = applyTemplate(step.textTemplate || '', vars);
        if (!options.dryRun) {
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
      }

      if (step.postWaitMs) await sleep(step.postWaitMs);
      return { ok: true };
    }

    if (step.type === 'SCROLL') {
      if (step.mode === 'ELEMENT') {
        const node = await resolveTarget(doc, step.target?.selector, timeoutMs);
        if (!node) throw fail('E_SELECTOR_NOT_FOUND', 'scroll element not found');
        if (!options.dryRun) node.scrollIntoView({ block: 'center', behavior: 'instant' });
      } else {
        if (!options.dryRun) win.scrollBy({ top: Number(step.deltaY) || 0, behavior: 'instant' });
      }
      if (step.postWaitMs) await sleep(step.postWaitMs);
      return { ok: true };
    }

    throw fail('E_VERIFY_FAILED', `unknown step type ${step.type}`);
  };

  const execWithRetry = async (step) => {
    const retryCount = step.retry?.count ?? macro.policies.retries.defaultRetryCount;
    const backoffMs = step.retry?.backoffMs ?? macro.policies.retries.backoffMs;
    let lastErr = null;
    for (let a = 0; a <= retryCount; a += 1) {
      try {
        return await runStep(step);
      } catch (e) {
        lastErr = e;
        if (a >= retryCount) break;
        addLog('RUN', 'RETRY', `attempt=${a + 1}/${retryCount} reason=${maskIfNeeded(e.code || e.message)}`, step.id);
        await sleep(backoffMs * (a + 1));
      }
    }
    throw lastErr;
  };

  try {
    while (true) {
      if (state.run.stopRequested) throw fail('E_USER_STOP', 'stopped by user');
      while (state.run.pauseRequested) await sleep(60);

      const elapsed = Date.now() - state.run.startedAt;
      state.run.elapsedMs = elapsed;
      if (elapsed > maxDurationMs) throw fail('E_GUARD_MAX_DURATION', 'maxDuration exceeded');
      if (totalSteps > maxTotalSteps) throw fail('E_GUARD_MAX_STEPS', 'maxTotalSteps exceeded');

      if (cursor >= macro.steps.length) {
        loop += 1;
        state.run.repeatIndex = loop;
        if (repeat === 0) {
          if (loop > maxRepeatHard) throw fail('E_GUARD_MAX_STEPS', 'maxRepeatsHardLimit exceeded');
          cursor = 0;
          continue;
        }
        if (loop >= repeat) break;
        cursor = 0;
        continue;
      }

      const step = normalizeStep(macro.steps[cursor]);
      state.run.cursor = cursor;
      updateStatus();

      const now = Date.now();
      const gap = now - lastActionAt;
      if (gap < minGap) await sleep(minGap - gap);

      try {
        const result = await execWithRetry(step);
        lastActionAt = Date.now();
        totalSteps += 1;
        addLog('RUN', 'SUCCESS', `ok ${step.type}`, step.id);

        if (Number.isInteger(result.nextCursor)) {
          cursor = result.nextCursor;
        } else {
          cursor += 1;
        }
      } catch (e) {
        const code = e.code || 'E_TIMEOUT';
        addLog('RUN', 'FAIL', `${code} ${maskIfNeeded(e.message)}`, step.id);

        const onFail = step.onFail?.action || 'STOP';
        if (onFail === 'SKIP') {
          addLog('RUN', 'SKIP', 'onFail=SKIP', step.id);
          cursor += 1;
          continue;
        }
        if (onFail === 'GOTO') {
          const t = step.onFail?.targetLabel;
          const goto = macro.steps.findIndex((s) => s.type === 'LABEL' && s.label === t);
          if (goto >= 0) {
            cursor = goto;
            continue;
          }
          addLog('RUN', 'FAIL', 'E_VERIFY_FAILED onFail target label missing', step.id);
        }
        throw e;
      }

      const jitter = Math.max(0, Number(options.stepDelayJitterMs) || 0);
      if (jitter > 0) await sleep(Math.floor(Math.random() * (jitter + 1)));
    }

    state.run.status = 'SUCCESS';
    updateStatus();
    addLog('RUN', 'END', `SUCCESS totalSteps=${totalSteps}`);
  } catch (e) {
    const code = e.code || 'E_TIMEOUT';
    state.run.status = code === 'E_USER_STOP' ? 'STOPPED' : 'FAILED';
    updateStatus();
    addLog('RUN', 'END', `${state.run.status} ${code} ${maskIfNeeded(e.message)}`);
  }
}

async function startScreenRec() {
  if (state.screenRec.active) return;

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: Math.max(1, Number(el.screenFrameRate.value) || 15)
      },
      audio: el.screenAudio.checked
    });

    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
    state.screenRec.active = true;
    state.screenRec.sessionId = uid('screen');
    state.screenRec.stream = stream;
    state.screenRec.recorder = recorder;
    state.screenRec.chunks = [];
    state.screenRec.markers = [];

    recorder.addEventListener('dataavailable', (e) => {
      if (e.data && e.data.size > 0) state.screenRec.chunks.push(e.data);
    });

    recorder.addEventListener('stop', () => {
      const blob = new Blob(state.screenRec.chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      el.screenDownload.href = url;
      el.screenInfo.textContent = `session=${state.screenRec.sessionId} size=${blob.size} markers=${state.screenRec.markers.length}`;
    });

    recorder.start(1000);
    el.screenInfo.textContent = `recording... session=${state.screenRec.sessionId}`;
    addLog('SCREENREC', 'START', `session=${state.screenRec.sessionId}`);
  } catch (error) {
    addLog('SCREENREC', 'FAIL', error.message);
  }
}

function markScreenRec(runId, stepId) {
  if (!state.screenRec.active) return;
  const mark = { sessionId: state.screenRec.sessionId, runId, stepId, ts: Date.now() };
  state.screenRec.markers.push(mark);
  addLog('SCREENREC_MARK_EVT', 'MARK', `step=${stepId}`);
}

function stopScreenRec() {
  if (!state.screenRec.active) return;

  state.screenRec.active = false;
  const rec = state.screenRec.recorder;
  if (rec && rec.state !== 'inactive') rec.stop();
  state.screenRec.stream?.getTracks().forEach((t) => t.stop());

  addLog('SCREENREC', 'STOP', `session=${state.screenRec.sessionId}`);
}

function bindUi() {
  el.addMacro.addEventListener('click', () => {
    const m = defaultMacro();
    state.macros.push(m);
    state.selectedMacroId = m.id;
    saveState();
    renderMacroList();
    syncMacroForm();
    renderStepTable();
  });

  el.saveMacro.addEventListener('click', saveMacroFromForm);
  el.deleteMacro.addEventListener('click', () => {
    if (state.macros.length <= 1) return;
    state.macros = state.macros.filter((m) => m.id !== state.selectedMacroId);
    state.selectedMacroId = state.macros[0].id;
    saveState();
    renderMacroList();
    syncMacroForm();
    renderStepTable();
  });

  document.querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const m = selectedMacro();
      if (!m) return;
      m.steps.push(makeStep(btn.dataset.add));
      m.updatedAt = nowIso();
      saveState();
      renderStepTable();
    });
  });

  el.exportMacro.addEventListener('click', () => {
    const m = selectedMacro();
    if (!m) return;
    const blob = new Blob([JSON.stringify(m, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${m.name.replace(/\s+/g, '_')}.json`;
    a.click();
  });

  el.importFile.addEventListener('change', async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const m = sanitizeMacro(JSON.parse(text));
      state.macros.push(m);
      state.selectedMacroId = m.id;
      saveState();
      renderMacroList();
      syncMacroForm();
      renderStepTable();
      addLog('UI', 'IMPORT', `macro import: ${m.name}`);
    } catch (e) {
      addLog('UI', 'ERROR', `import fail: ${e.message}`);
    }
  });

  el.recStart.addEventListener('click', startRec);
  el.recStop.addEventListener('click', stopRec);
  el.runStart.addEventListener('click', runStart);
  el.runPause.addEventListener('click', runPause);
  el.runResume.addEventListener('click', runResume);
  el.runStop.addEventListener('click', runStop);
  el.screenRecStart.addEventListener('click', startScreenRec);
  el.screenRecStop.addEventListener('click', stopScreenRec);
}

function init() {
  loadState();
  renderMacroList();
  syncMacroForm();
  renderStepTable();
  renderLogs();
  bindUi();
  updateStatus('ready');
  void extPing();
}

init();
