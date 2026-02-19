const $ = (sel) => document.querySelector(sel);

const i18n = {
  en: {
    title: "Macro Program",
    language: "Language",
    "status.ready": "Ready",
    "status.recording": "Recording... Click Record or press shortcut to stop",
    "status.recording_stopped": "Recording stopped",
    "status.run_disabled": "Run disabled (Off/Edit)",
    "status.edit_on": "Edit mode is on. Turn it off to run.",
    "status.no_events": "No recorded events to run",
    "status.running": "Running macro...",
    "status.run_complete": "Run complete",
    "status.run_stopped": "Run stopped",
    "status.run_wait_on": "Run wait enabled",
    "status.run_wait_off": "Run wait disabled",
    "status.run_wait_armed": "Run wait armed. Press Run again to execute.",
    "status.fullscreen_on": "Fullscreen enabled",
    "status.fullscreen_off": "Fullscreen disabled",
    "status.fullscreen_failed": "Fullscreen request denied",
    "status.coord_on": "Coord mode on",
    "status.coord_off": "Coord mode off",
    "status.no_macro": "No macro selected",
    "status.invalid_pos": "Invalid position",
    "status.event_added": "Manual event added",
    "status.edit_on_short": "Edit mode on",
    "status.edit_off_short": "Edit mode off",
    "status.run_enabled": "Run enabled",
    "status.run_disabled_edit": "Run disabled + edit mode",
    "status.shortcut_assign": "Press a key to assign shortcut",
    "status.shortcut_assigned": "Shortcut assigned",
    "status.macro_loaded": "Macro loaded",
    "status.macro_load_failed": "Failed to load macro file",
    "status.ini_loaded": "Settings loaded from INI",
    "status.ini_load_failed": "Failed to load INI",
    "btn.on": "On",
    "btn.off_edit": "Off / Edit",
    "btn.edit": "Edit",
    "btn.record": "Record",
    "btn.run": "Run",
    "btn.run_stop": "Stop",
    "btn.add_macro": "Add Macro",
    "btn.delete_macro": "Delete Macro",
    "btn.save_m": "Save .m",
    "btn.load_m": "Load .m",
    "btn.save_ini": "Save key_macro.ini",
    "btn.load_ini": "Load key_macro.ini",
    "btn.fullscreen": "Enable Fullscreen",
    "btn.coord_mode": "Coord Mode",
    "btn.add_event": "Add Event",
    "btn.log_mode": "Log Mode",
    "btn.log_clear": "Clear Log",
    "section.macros": "Macros",
    "section.recording": "Recording",
    "section.shortcuts": "Shortcuts",
    "section.files": "Files",
    "section.actions": "Macro Actions",
    "section.manual": "Manual Macro",
    "section.log": "Log Mode",
    "label.record": "[Record]",
    "label.events": "Events",
    "label.run_time": "Run Time",
    "label.repeat_count": "Repeat Count",
    "label.run_wait": "Run Wait",
    "label.edit_mode": "Edit Mode",
    "label.run_enabled": "Run Enabled",
    "label.fullscreen": "Fullscreen",
    "label.pos_x_manual": "X (Manual)",
    "label.pos_y_manual": "Y (Manual)",
    "label.pos_x_coord": "X (Coord)",
    "label.pos_y_coord": "Y (Coord)",
    "label.coord_mode": "Coord Mode",
    "label.action": "Action",
    "label.log_mode": "Log Mode",
    "hint.recording": "Recording captures keyboard and mouse events while this page is focused.",
    "hint.shortcuts": "Click a shortcut and press a key to assign.",
    "hint.repeat": "Set 0 for infinite repeat until stopped.",
    "hint.manual": "Enable Coord Mode to keep updating the position, then add a mouse action.",
    "hint.log": "Logs mouse clicks/movement and keyboard keys while enabled.",
    "action.mousedown": "Mouse Down",
    "action.mouseup": "Mouse Up",
    "action.click": "Click",
    "shortcut.record": "Record Toggle",
    "shortcut.run": "Run",
    "shortcut.run_wait": "Run Wait Toggle",
    "shortcut.edit": "Edit Toggle",
    "shortcut.onoff": "On/Off Toggle",
    "shortcut.set": "Set",
    "shortcut.press_key": "Press a key...",
    "state.on": "On",
    "state.off": "Off",
    "state.recording": "Recording",
    "state.idle": "Idle",
    "state.running": "Running",
    "state.unassigned": "Unassigned",
    "macro.label": "Macro",
  },
  ko: {
    title: "매크로 프로그램",
    language: "언어",
    "status.ready": "대기 중",
    "status.recording": "기록 중... Record를 다시 누르거나 단축키로 중지",
    "status.recording_stopped": "기록 중지됨",
    "status.run_disabled": "실행 비활성화됨 (Off/Edit)",
    "status.edit_on": "편집 모드가 켜져 있습니다. 실행하려면 끄세요.",
    "status.no_events": "실행할 기록이 없습니다",
    "status.running": "매크로 실행 중...",
    "status.run_complete": "실행 완료",
    "status.run_stopped": "실행 중지됨",
    "status.run_wait_on": "실행 대기 켜짐",
    "status.run_wait_off": "실행 대기 꺼짐",
    "status.run_wait_armed": "실행 대기 준비됨. 다시 실행을 누르면 시작합니다.",
    "status.fullscreen_on": "전체 화면이 활성화되었습니다",
    "status.fullscreen_off": "전체 화면이 해제되었습니다",
    "status.fullscreen_failed": "전체 화면 권한이 거부되었습니다",
    "status.coord_on": "좌표 모드 켜짐",
    "status.coord_off": "좌표 모드 꺼짐",
    "status.no_macro": "선택된 매크로가 없습니다",
    "status.invalid_pos": "좌표가 올바르지 않습니다",
    "status.event_added": "수동 이벤트가 추가되었습니다",
    "status.edit_on_short": "편집 모드 켜짐",
    "status.edit_off_short": "편집 모드 꺼짐",
    "status.run_enabled": "실행 활성화됨",
    "status.run_disabled_edit": "실행 비활성화 + 편집 모드",
    "status.shortcut_assign": "단축키를 지정할 키를 누르세요",
    "status.shortcut_assigned": "단축키가 지정되었습니다",
    "status.macro_loaded": "매크로를 불러왔습니다",
    "status.macro_load_failed": "매크로 파일 불러오기 실패",
    "status.ini_loaded": "INI 설정을 불러왔습니다",
    "status.ini_load_failed": "INI 불러오기 실패",
    "btn.on": "On",
    "btn.off_edit": "Off / 편집",
    "btn.edit": "편집",
    "btn.record": "기록",
    "btn.run": "실행",
    "btn.run_stop": "중지",
    "btn.add_macro": "매크로 추가",
    "btn.delete_macro": "매크로 삭제",
    "btn.save_m": ".m 저장",
    "btn.load_m": ".m 불러오기",
    "btn.save_ini": "key_macro.ini 저장",
    "btn.load_ini": "key_macro.ini 불러오기",
    "btn.fullscreen": "전체 화면 활성화",
    "btn.coord_mode": "좌표 모드",
    "btn.add_event": "이벤트 추가",
    "btn.log_mode": "로그 모드",
    "btn.log_clear": "로그 지우기",
    "section.macros": "매크로",
    "section.recording": "기록",
    "section.shortcuts": "단축키",
    "section.files": "파일",
    "section.actions": "매크로 동작",
    "section.manual": "수동 매크로",
    "section.log": "로그 모드",
    "label.record": "[기록]",
    "label.events": "이벤트",
    "label.run_time": "실행 시간",
    "label.repeat_count": "반복 횟수",
    "label.run_wait": "실행 대기",
    "label.edit_mode": "편집 모드",
    "label.run_enabled": "실행 가능",
    "label.fullscreen": "전체 화면",
    "label.pos_x_manual": "X (수동)",
    "label.pos_y_manual": "Y (수동)",
    "label.pos_x_coord": "X (좌표)",
    "label.pos_y_coord": "Y (좌표)",
    "label.coord_mode": "좌표 모드",
    "label.action": "동작",
    "label.log_mode": "로그 모드",
    "hint.recording": "이 페이지가 포커스일 때만 키보드/마우스가 기록됩니다.",
    "hint.shortcuts": "단축키를 클릭하고 키를 눌러 지정하세요.",
    "hint.repeat": "0으로 설정하면 해제할 때까지 무한 반복합니다.",
    "hint.manual": "좌표 모드를 켜서 위치를 계속 갱신한 뒤, 이벤트를 추가하세요.",
    "hint.log": "로그 모드를 켜면 마우스/키보드 입력이 기록됩니다.",
    "action.mousedown": "마우스 누름",
    "action.mouseup": "마우스 뗌",
    "action.click": "클릭",
    "shortcut.record": "기록 토글",
    "shortcut.run": "실행",
    "shortcut.run_wait": "실행 대기 토글",
    "shortcut.edit": "편집 토글",
    "shortcut.onoff": "On/Off 토글",
    "shortcut.set": "설정",
    "shortcut.press_key": "키를 누르세요...",
    "state.on": "On",
    "state.off": "Off",
    "state.recording": "기록 중",
    "state.idle": "대기",
    "state.running": "실행 중",
    "state.unassigned": "미지정",
    "macro.label": "매크로",
  },
};

const state = {
  macros: [],
  selectedId: null,
  recording: false,
  running: false,
  runWait: false,
  editMode: false,
  runEnabled: true,
  awaitingShortcut: null,
  recordStart: 0,
  language: "en",
  repeatCount: 1,
  fullScreenEnabled: false,
  runStart: 0,
  runTimerId: null,
  coordMode: false,
  logMode: false,
  logBuffer: [],
  logMax: 200,
  _lastMoveLog: 0,
  shortcuts: {
    recordToggle: "KeyR",
    runToggle: "KeyT",
    runWaitToggle: "KeyW",
    editToggle: "KeyE",
    onOffToggle: "KeyO",
  },
};

const STORAGE_KEY = "macro_state_v1";
const runTimers = [];

function saveState() {
  const payload = {
    macros: state.macros,
    selectedId: state.selectedId,
    runWait: state.runWait,
    editMode: state.editMode,
    runEnabled: state.runEnabled,
    language: state.language,
    repeatCount: state.repeatCount,
    coordMode: state.coordMode,
    logMode: state.logMode,
    shortcuts: state.shortcuts,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.macros = [{ id: crypto.randomUUID(), name: "Macro 1", events: [] }];
    state.selectedId = state.macros[0].id;
    return;
  }
  try {
    const data = JSON.parse(raw);
    state.macros = data.macros || [];
    state.selectedId = data.selectedId || (state.macros[0] && state.macros[0].id) || null;
    state.runWait = !!data.runWait;
    state.editMode = !!data.editMode;
    state.runEnabled = data.runEnabled !== false;
    state.language = data.language || "en";
    state.repeatCount = Number.isFinite(data.repeatCount) ? data.repeatCount : 1;
    state.coordMode = !!data.coordMode;
    state.logMode = !!data.logMode;
    state.shortcuts = { ...state.shortcuts, ...(data.shortcuts || {}) };
  } catch {
    state.macros = [{ id: crypto.randomUUID(), name: "Macro 1", events: [] }];
    state.selectedId = state.macros[0].id;
  }
}

function t(key) {
  return i18n[state.language]?.[key] || i18n.en[key] || key;
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
  const select = $("#lang-select");
  if (select) select.value = state.language;
}

function setStatus(text) {
  $("#status").textContent = text;
}

function macroDefaultName(idx) {
  return `${t("macro.label")} ${idx + 1}`;
}

function getSelectedMacro() {
  return state.macros.find((m) => m.id === state.selectedId) || null;
}

function renderMacros() {
  const list = $("#macro-list");
  list.innerHTML = "";
  state.macros.forEach((macro, idx) => {
    const item = document.createElement("div");
    item.className = "macro-item" + (macro.id === state.selectedId ? " active" : "");
    item.dataset.id = macro.id;

    const name = document.createElement("div");
    name.className = "macro-name";
    if (state.editMode) {
      const input = document.createElement("input");
      input.className = "macro-input";
      input.value = macro.name || macroDefaultName(idx);
      input.addEventListener("change", () => {
        macro.name = input.value.trim() || macroDefaultName(idx);
        saveState();
      });
      name.appendChild(input);
    } else {
      name.textContent = macro.name || macroDefaultName(idx);
    }

    const meta = document.createElement("div");
    meta.textContent = `#${idx + 1}`;

    item.appendChild(name);
    item.appendChild(meta);

    item.addEventListener("click", () => {
      state.selectedId = macro.id;
      saveState();
      render();
    });

    list.appendChild(item);
  });
}

function renderShortcuts() {
  const list = $("#shortcut-list");
  list.innerHTML = "";
  const items = [
    { key: "recordToggle", label: t("shortcut.record") },
    { key: "runToggle", label: t("shortcut.run") },
    { key: "runWaitToggle", label: t("shortcut.run_wait") },
    { key: "editToggle", label: t("shortcut.edit") },
    { key: "onOffToggle", label: t("shortcut.onoff") },
  ];
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "shortcut-item";

    const label = document.createElement("div");
    label.textContent = item.label;

    const key = document.createElement("div");
    key.className = "shortcut-key";
    key.textContent = formatKey(state.shortcuts[item.key]);

    const btn = document.createElement("button");
    btn.textContent =
      state.awaitingShortcut === item.key ? t("shortcut.press_key") : t("shortcut.set");
    btn.addEventListener("click", () => {
      state.awaitingShortcut = item.key;
      setStatus(t("status.shortcut_assign"));
      renderShortcuts();
    });

    row.appendChild(label);
    row.appendChild(key);
    row.appendChild(btn);
    list.appendChild(row);
  });
}

function formatKey(code) {
  if (!code) return t("state.unassigned");
  if (code.startsWith("Key")) return code.replace("Key", "");
  if (code.startsWith("Digit")) return code.replace("Digit", "");
  return code;
}

function renderIndicators() {
  $("#record-state").textContent = state.recording ? t("state.recording") : t("state.idle");
  $("#event-count").textContent = getSelectedMacro()?.events?.length || 0;
  $("#run-wait").textContent = state.runWait ? t("state.on") : t("state.off");
  $("#edit-mode").textContent = state.editMode ? t("state.on") : t("state.off");
  $("#run-enabled").textContent = state.runEnabled ? t("state.on") : t("state.off");
  $("#fullscreen-state").textContent = state.fullScreenEnabled ? t("state.on") : t("state.off");
  $("#coord-mode").textContent = state.coordMode ? t("state.on") : t("state.off");
  $("#log-mode").textContent = state.logMode ? t("state.on") : t("state.off");
  $("#run-time").textContent = formatRunTime();

  const runBtn = $("#btn-run");
  runBtn.textContent = state.running ? t("btn.run_stop") : t("btn.run");
  runBtn.classList.toggle("active", state.running);

  const onOffBtn = $("#btn-onoff");
  onOffBtn.textContent = state.runEnabled ? t("btn.on") : t("btn.off_edit");
  onOffBtn.classList.toggle("active", state.runEnabled);

  $("#btn-edit").classList.toggle("active", state.editMode);
  $("#btn-record").classList.toggle("active", state.recording);

  const repeatInput = $("#repeat-count");
  if (repeatInput && String(repeatInput.value) !== String(state.repeatCount)) {
    repeatInput.value = String(state.repeatCount);
  }
}

function render() {
  applyI18n();
  renderMacros();
  renderShortcuts();
  renderIndicators();
}

function addMacro() {
  const id = crypto.randomUUID();
  const name = macroDefaultName(state.macros.length);
  state.macros.push({ id, name, events: [] });
  state.selectedId = id;
  saveState();
  render();
}

function deleteMacro() {
  if (!state.selectedId) return;
  state.macros = state.macros.filter((m) => m.id !== state.selectedId);
  state.selectedId = state.macros[0]?.id || null;
  saveState();
  render();
}

function startRecording() {
  if (state.recording) return;
  const macro = getSelectedMacro();
  if (!macro) return;
  macro.events = [];
  state.recording = true;
  state.recordStart = performance.now();
  setStatus(t("status.recording"));
  attachRecordListeners();
  renderIndicators();
}

function stopRecording() {
  if (!state.recording) return;
  state.recording = false;
  detachRecordListeners();
  saveState();
  setStatus(t("status.recording_stopped"));
  renderIndicators();
}

const recordHandlers = {
  keydown: null,
  keyup: null,
  mousedown: null,
  mouseup: null,
  mousemove: null,
};

function attachRecordListeners() {
  const macro = getSelectedMacro();
  if (!macro) return;

  recordHandlers.keydown = (e) => {
    if (state.awaitingShortcut) return;
    macro.events.push({
      type: "keydown",
      code: e.code,
      key: e.key,
      ts: performance.now() - state.recordStart,
    });
    renderIndicators();
  };
  recordHandlers.keyup = (e) => {
    if (state.awaitingShortcut) return;
    macro.events.push({
      type: "keyup",
      code: e.code,
      key: e.key,
      ts: performance.now() - state.recordStart,
    });
    renderIndicators();
  };
  recordHandlers.mousedown = (e) => {
    if (state.awaitingShortcut) return;
    macro.events.push({
      type: "mousedown",
      button: e.button,
      x: e.clientX,
      y: e.clientY,
      ts: performance.now() - state.recordStart,
    });
    renderIndicators();
  };
  recordHandlers.mouseup = (e) => {
    if (state.awaitingShortcut) return;
    macro.events.push({
      type: "mouseup",
      button: e.button,
      x: e.clientX,
      y: e.clientY,
      ts: performance.now() - state.recordStart,
    });
    renderIndicators();
  };
  recordHandlers.mousemove = (e) => {
    if (state.awaitingShortcut) return;
    macro.events.push({
      type: "mousemove",
      x: e.clientX,
      y: e.clientY,
      ts: performance.now() - state.recordStart,
    });
    renderIndicators();
  };

  document.addEventListener("keydown", recordHandlers.keydown);
  document.addEventListener("keyup", recordHandlers.keyup);
  document.addEventListener("mousedown", recordHandlers.mousedown);
  document.addEventListener("mouseup", recordHandlers.mouseup);
  document.addEventListener("mousemove", recordHandlers.mousemove);
}

function detachRecordListeners() {
  document.removeEventListener("keydown", recordHandlers.keydown);
  document.removeEventListener("keyup", recordHandlers.keyup);
  document.removeEventListener("mousedown", recordHandlers.mousedown);
  document.removeEventListener("mouseup", recordHandlers.mouseup);
  document.removeEventListener("mousemove", recordHandlers.mousemove);
}

function clearRunTimers() {
  while (runTimers.length) {
    clearTimeout(runTimers.pop());
  }
  if (state.runTimerId) {
    clearInterval(state.runTimerId);
    state.runTimerId = null;
  }
}

function stopRun(reasonKey) {
  if (!state.running) return;
  state.running = false;
  state.runStart = 0;
  clearRunTimers();
  renderIndicators();
  setStatus(t(reasonKey || "status.run_stopped"));
}

function runMacro() {
  if (state.running) {
    stopRun("status.run_stopped");
    return;
  }
  if (!state.runEnabled) {
    setStatus(t("status.run_disabled"));
    return;
  }
  if (state.editMode) {
    setStatus(t("status.edit_on"));
    return;
  }
  const macro = getSelectedMacro();
  if (!macro || !macro.events.length) {
    setStatus(t("status.no_events"));
    return;
  }

  state.running = true;
  state.runStart = performance.now();
  if (!state.runTimerId) {
    state.runTimerId = setInterval(() => {
      if (!state.running) return;
      $("#run-time").textContent = formatRunTime();
    }, 50);
  }
  renderIndicators();
  setStatus(t("status.running"));

  const repeatCount = Number.isFinite(state.repeatCount) ? Math.max(0, state.repeatCount) : 1;

  const runIteration = (iteration) => {
    if (!state.running) return;
    macro.events.forEach((evt) => {
      const timer = setTimeout(() => replayEvent(evt), evt.ts);
      runTimers.push(timer);
    });
    const total = macro.events[macro.events.length - 1].ts;
    const doneTimer = setTimeout(() => {
      if (!state.running) return;
      const shouldContinue = repeatCount === 0 || iteration < repeatCount;
      if (shouldContinue) {
        runIteration(iteration + 1);
      } else {
        state.running = false;
        state.runStart = 0;
        renderIndicators();
        setStatus(t("status.run_complete"));
      }
    }, total + 20);
    runTimers.push(doneTimer);
  };

  runIteration(1);
}

function formatRunTime() {
  if (!state.running || !state.runStart) return "00:00.000";
  const elapsed = performance.now() - state.runStart;
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  const ms = Math.floor(elapsed % 1000);
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const mmm = String(ms).padStart(3, "0");
  return `${mm}:${ss}.${mmm}`;
}

function replayEvent(evt) {
  if (evt.type === "mousedown") {
    showClickEffect(evt.x, evt.y);
  }
  if (evt.type.startsWith("key")) {
    const event = new KeyboardEvent(evt.type, {
      key: evt.key,
      code: evt.code,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }
  if (evt.type.startsWith("mouse")) {
    const event = new MouseEvent(evt.type, {
      button: evt.button,
      clientX: evt.x,
      clientY: evt.y,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }
}

function showClickEffect(x, y) {
  const effect = document.createElement("div");
  effect.className = "click-effect";
  effect.style.left = `${x}px`;
  effect.style.top = `${y}px`;
  document.body.appendChild(effect);
  setTimeout(() => effect.remove(), 400);
}

function toggleRunWait() {
  state.runWait = !state.runWait;
  saveState();
  renderIndicators();
  setStatus(state.runWait ? t("status.run_wait_on") : t("status.run_wait_off"));
}

function toggleEdit() {
  state.editMode = !state.editMode;
  if (state.editMode) {
    state.runEnabled = false;
    stopRun("status.run_stopped");
  }
  saveState();
  render();
  setStatus(state.editMode ? t("status.edit_on_short") : t("status.edit_off_short"));
}

function toggleOnOff() {
  state.runEnabled = !state.runEnabled;
  if (!state.runEnabled) {
    state.editMode = true;
    stopRun("status.run_stopped");
  }
  if (state.runEnabled) {
    state.editMode = false;
  }
  saveState();
  renderIndicators();
  setStatus(state.runEnabled ? t("status.run_enabled") : t("status.run_disabled_edit"));
}

function updateFullscreenState() {
  state.fullScreenEnabled = !!document.fullscreenElement;
  renderIndicators();
}

async function requestFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setStatus(t("status.fullscreen_on"));
    } else {
      await document.exitFullscreen();
      setStatus(t("status.fullscreen_off"));
    }
  } catch {
    setStatus(t("status.fullscreen_failed"));
  }
}

function toggleCoordMode() {
  state.coordMode = !state.coordMode;
  saveState();
  renderIndicators();
  setStatus(state.coordMode ? t("status.coord_on") : t("status.coord_off"));
}

function addManualEvent() {
  const macro = getSelectedMacro();
  if (!macro) {
    setStatus(t("status.no_macro"));
    return;
  }
  const manualX = Number($("#manual-x").value);
  const manualY = Number($("#manual-y").value);
  const coordX = Number($("#coord-x").value);
  const coordY = Number($("#coord-y").value);
  const useCoord = state.coordMode && Number.isFinite(coordX) && Number.isFinite(coordY);
  const x = useCoord ? coordX : manualX;
  const y = useCoord ? coordY : manualY;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    setStatus(t("status.invalid_pos"));
    return;
  }
  const action = $("#manual-action").value;
  const lastTs = macro.events.length ? macro.events[macro.events.length - 1].ts : 0;
  const baseTs = lastTs + 50;
  if (action === "click") {
    macro.events.push(
      { type: "mousedown", button: 0, x, y, ts: baseTs },
      { type: "mouseup", button: 0, x, y, ts: baseTs + 20 }
    );
  } else {
    macro.events.push({ type: action, button: 0, x, y, ts: baseTs });
  }
  saveState();
  renderIndicators();
  setStatus(t("status.event_added"));
}

function handleCoordMove(e) {
  if (!state.coordMode) return;
  $("#coord-x").value = Math.round(e.clientX);
  $("#coord-y").value = Math.round(e.clientY);
}

function toggleLogMode() {
  state.logMode = !state.logMode;
  saveState();
  renderIndicators();
}

function clearLog() {
  state.logBuffer = [];
  renderLog();
}

function renderLog() {
  const out = $("#log-output");
  if (!out) return;
  out.textContent = state.logBuffer.join("\n");
  out.scrollTop = out.scrollHeight;
}

function pushLog(line) {
  state.logBuffer.push(line);
  if (state.logBuffer.length > state.logMax) {
    state.logBuffer.splice(0, state.logBuffer.length - state.logMax);
  }
  renderLog();
}

function logEvent(e, kind, details) {
  if (!state.logMode) return;
  const ts = new Date().toLocaleTimeString();
  pushLog(`[${ts}] ${kind} ${details}`);
}

function handleShortcutAssignment(e) {
  if (!state.awaitingShortcut) return false;
  e.preventDefault();
  state.shortcuts[state.awaitingShortcut] = e.code;
  state.awaitingShortcut = null;
  saveState();
  setStatus(t("status.shortcut_assigned"));
  renderShortcuts();
  return true;
}

function handleGlobalShortcuts(e) {
  if (state.awaitingShortcut) return;
  const { shortcuts } = state;
  if (e.code === shortcuts.recordToggle) {
    e.preventDefault();
    state.recording ? stopRecording() : startRecording();
    return;
  }
  if (e.code === shortcuts.runToggle) {
    e.preventDefault();
    if (state.runWait) {
      setStatus(t("status.run_wait_armed"));
      state.runWait = false;
      saveState();
      renderIndicators();
      return;
    }
    runMacro();
    return;
  }
  if (e.code === shortcuts.runWaitToggle) {
    e.preventDefault();
    toggleRunWait();
    return;
  }
  if (e.code === shortcuts.editToggle) {
    e.preventDefault();
    toggleEdit();
    return;
  }
  if (e.code === shortcuts.onOffToggle) {
    e.preventDefault();
    toggleOnOff();
  }
}

function saveMacroFile() {
  const macro = getSelectedMacro();
  if (!macro) return;
  const payload = {
    version: 1,
    macro,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${macro.name || "macro"}.m`);
}

function loadMacroFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.macro) throw new Error("Invalid macro file");
      const macro = {
        id: crypto.randomUUID(),
        name: data.macro.name || macroDefaultName(state.macros.length),
        events: data.macro.events || [],
      };
      state.macros.push(macro);
      state.selectedId = macro.id;
      saveState();
      render();
      setStatus(t("status.macro_loaded"));
    } catch {
      setStatus(t("status.macro_load_failed"));
    }
  };
  reader.readAsText(file);
}

function saveIniFile() {
  const lines = [
    "[shortcuts]",
    `recordToggle=${state.shortcuts.recordToggle}`,
    `runToggle=${state.shortcuts.runToggle}`,
    `runWaitToggle=${state.shortcuts.runWaitToggle}`,
    `editToggle=${state.shortcuts.editToggle}`,
    `onOffToggle=${state.shortcuts.onOffToggle}`,
    "",
    "[settings]",
    `runWait=${state.runWait}`,
    `editMode=${state.editMode}`,
    `runEnabled=${state.runEnabled}`,
    `repeatCount=${state.repeatCount}`,
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  downloadBlob(blob, "key_macro.ini");
}

function loadIniFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const content = String(reader.result);
      const parsed = parseIni(content);
      if (parsed.shortcuts) {
        state.shortcuts = { ...state.shortcuts, ...parsed.shortcuts };
      }
      if (parsed.settings) {
        if (parsed.settings.runWait !== undefined) state.runWait = parsed.settings.runWait === "true";
        if (parsed.settings.editMode !== undefined) state.editMode = parsed.settings.editMode === "true";
        if (parsed.settings.runEnabled !== undefined) state.runEnabled = parsed.settings.runEnabled === "true";
        if (parsed.settings.repeatCount !== undefined) {
          const parsedRepeat = Number(parsed.settings.repeatCount);
          state.repeatCount = Number.isFinite(parsedRepeat) ? Math.max(0, parsedRepeat) : 1;
        }
      }
      saveState();
      render();
      setStatus(t("status.ini_loaded"));
    } catch {
      setStatus(t("status.ini_load_failed"));
    }
  };
  reader.readAsText(file);
}

function parseIni(text) {
  const result = {};
  let section = null;
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";")) return;
    if (trimmed.startsWith("[")) {
      section = trimmed.replace(/\[|\]/g, "");
      result[section] = result[section] || {};
      return;
    }
    const [key, ...rest] = trimmed.split("=");
    if (!section || !key) return;
    result[section][key] = rest.join("=").trim();
  });
  return result;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function wireEvents() {
  $("#btn-record").addEventListener("click", () => {
    state.recording ? stopRecording() : startRecording();
  });
  $("#btn-run").addEventListener("click", runMacro);
  $("#btn-edit").addEventListener("click", toggleEdit);
  $("#btn-onoff").addEventListener("click", toggleOnOff);
  $("#btn-add").addEventListener("click", addMacro);
  $("#btn-delete").addEventListener("click", deleteMacro);

  $("#btn-save-m").addEventListener("click", saveMacroFile);
  $("#file-m").addEventListener("change", (e) => loadMacroFile(e.target.files[0]));
  $("#btn-save-ini").addEventListener("click", saveIniFile);
  $("#file-ini").addEventListener("change", (e) => loadIniFile(e.target.files[0]));

  $("#repeat-count").addEventListener("change", (e) => {
    const value = Number(e.target.value);
    state.repeatCount = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 1;
    saveState();
    renderIndicators();
  });

  $("#btn-fullscreen").addEventListener("click", requestFullscreen);
  document.addEventListener("fullscreenchange", updateFullscreenState);

  $("#btn-coord-mode").addEventListener("click", toggleCoordMode);
  $("#btn-add-event").addEventListener("click", addManualEvent);

  $("#btn-log-mode").addEventListener("click", toggleLogMode);
  $("#btn-log-clear").addEventListener("click", clearLog);

  document.addEventListener("mousemove", handleCoordMove);

  $("#lang-select").addEventListener("change", (e) => {
    state.language = e.target.value;
    saveState();
    render();
    setStatus(t("status.ready"));
  });

  document.addEventListener("keydown", (e) => {
    if (handleShortcutAssignment(e)) return;
    handleGlobalShortcuts(e);
    logEvent(e, "KeyDown", e.code);
  });

  document.addEventListener("mousedown", (e) => {
    showClickEffect(e.clientX, e.clientY);
    logEvent(e, "MouseDown", `(${Math.round(e.clientX)}, ${Math.round(e.clientY)})`);
  });

  document.addEventListener("mouseup", (e) => {
    logEvent(e, "MouseUp", `(${Math.round(e.clientX)}, ${Math.round(e.clientY)})`);
  });

  document.addEventListener("mousemove", (e) => {
    if (!state.logMode) return;
    if (!state._lastMoveLog || performance.now() - state._lastMoveLog > 80) {
      state._lastMoveLog = performance.now();
      logEvent(e, "MouseMove", `(${Math.round(e.clientX)}, ${Math.round(e.clientY)})`);
    }
  });
}

loadState();
wireEvents();
updateFullscreenState();
render();
setStatus(t("status.ready"));
renderLog();
