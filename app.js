const $ = (sel) => document.querySelector(sel);

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
  shortcuts: {
    recordToggle: "KeyR",
    runToggle: "KeyT",
    runWaitToggle: "KeyW",
    editToggle: "KeyE",
    onOffToggle: "KeyO",
  },
};

const STORAGE_KEY = "macro_state_v1";

function saveState() {
  const payload = {
    macros: state.macros,
    selectedId: state.selectedId,
    runWait: state.runWait,
    editMode: state.editMode,
    runEnabled: state.runEnabled,
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
    state.shortcuts = { ...state.shortcuts, ...(data.shortcuts || {}) };
  } catch {
    state.macros = [{ id: crypto.randomUUID(), name: "Macro 1", events: [] }];
    state.selectedId = state.macros[0].id;
  }
}

function setStatus(text) {
  $("#status").textContent = text;
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
      input.value = macro.name || `Macro ${idx + 1}`;
      input.addEventListener("change", () => {
        macro.name = input.value.trim() || `Macro ${idx + 1}`;
        saveState();
      });
      name.appendChild(input);
    } else {
      name.textContent = macro.name || `Macro ${idx + 1}`;
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
    { key: "recordToggle", label: "Record Toggle" },
    { key: "runToggle", label: "Run" },
    { key: "runWaitToggle", label: "Run Wait Toggle" },
    { key: "editToggle", label: "Edit Toggle" },
    { key: "onOffToggle", label: "On/Off Toggle" },
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
    btn.textContent = state.awaitingShortcut === item.key ? "Press a key..." : "Set";
    btn.addEventListener("click", () => {
      state.awaitingShortcut = item.key;
      setStatus("Press a key to assign shortcut");
      renderShortcuts();
    });

    row.appendChild(label);
    row.appendChild(key);
    row.appendChild(btn);
    list.appendChild(row);
  });
}

function formatKey(code) {
  if (!code) return "Unassigned";
  if (code.startsWith("Key")) return code.replace("Key", "");
  if (code.startsWith("Digit")) return code.replace("Digit", "");
  return code;
}

function renderIndicators() {
  $("#record-state").textContent = state.recording ? "Recording" : "Idle";
  $("#event-count").textContent = getSelectedMacro()?.events?.length || 0;
  $("#run-wait").textContent = state.runWait ? "On" : "Off";
  $("#edit-mode").textContent = state.editMode ? "On" : "Off";
  $("#run-enabled").textContent = state.runEnabled ? "On" : "Off";

  const onOffBtn = $("#btn-onoff");
  onOffBtn.textContent = state.runEnabled ? "On" : "Off / Edit";
  onOffBtn.classList.toggle("active", state.runEnabled);

  $("#btn-edit").classList.toggle("active", state.editMode);
  $("#btn-record").classList.toggle("active", state.recording);
}

function render() {
  renderMacros();
  renderShortcuts();
  renderIndicators();
}

function addMacro() {
  const id = crypto.randomUUID();
  const name = `Macro ${state.macros.length + 1}`;
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
  setStatus("Recording... Click Record or press shortcut to stop");
  attachRecordListeners();
  renderIndicators();
}

function stopRecording() {
  if (!state.recording) return;
  state.recording = false;
  detachRecordListeners();
  saveState();
  setStatus("Recording stopped");
  renderIndicators();
}

const recordHandlers = {
  keydown: null,
  keyup: null,
  mousedown: null,
  mouseup: null,
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

  document.addEventListener("keydown", recordHandlers.keydown);
  document.addEventListener("keyup", recordHandlers.keyup);
  document.addEventListener("mousedown", recordHandlers.mousedown);
  document.addEventListener("mouseup", recordHandlers.mouseup);
}

function detachRecordListeners() {
  document.removeEventListener("keydown", recordHandlers.keydown);
  document.removeEventListener("keyup", recordHandlers.keyup);
  document.removeEventListener("mousedown", recordHandlers.mousedown);
  document.removeEventListener("mouseup", recordHandlers.mouseup);
}

function runMacro() {
  if (!state.runEnabled) {
    setStatus("Run disabled (Off/Edit)");
    return;
  }
  if (state.editMode) {
    setStatus("Edit mode is on. Turn it off to run.");
    return;
  }
  const macro = getSelectedMacro();
  if (!macro || !macro.events.length) {
    setStatus("No recorded events to run");
    return;
  }

  state.running = true;
  setStatus("Running macro...");

  macro.events.forEach((evt) => {
    setTimeout(() => replayEvent(evt), evt.ts);
  });

  const total = macro.events[macro.events.length - 1].ts;
  setTimeout(() => {
    state.running = false;
    setStatus("Run complete");
  }, total + 20);
}

function replayEvent(evt) {
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

function toggleRunWait() {
  state.runWait = !state.runWait;
  saveState();
  renderIndicators();
  setStatus(`Run wait ${state.runWait ? "enabled" : "disabled"}`);
}

function toggleEdit() {
  state.editMode = !state.editMode;
  if (state.editMode) {
    state.runEnabled = false;
  }
  saveState();
  render();
  setStatus(`Edit mode ${state.editMode ? "on" : "off"}`);
}

function toggleOnOff() {
  state.runEnabled = !state.runEnabled;
  if (!state.runEnabled) {
    state.editMode = true;
  }
  if (state.runEnabled) {
    state.editMode = false;
  }
  saveState();
  renderIndicators();
  setStatus(state.runEnabled ? "Run enabled" : "Run disabled + edit mode");
}

function handleShortcutAssignment(e) {
  if (!state.awaitingShortcut) return false;
  e.preventDefault();
  state.shortcuts[state.awaitingShortcut] = e.code;
  state.awaitingShortcut = null;
  saveState();
  setStatus("Shortcut assigned");
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
      setStatus("Run wait armed. Press Run again to execute.");
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
        name: data.macro.name || `Macro ${state.macros.length + 1}`,
        events: data.macro.events || [],
      };
      state.macros.push(macro);
      state.selectedId = macro.id;
      saveState();
      render();
      setStatus("Macro loaded");
    } catch {
      setStatus("Failed to load macro file");
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
      }
      saveState();
      render();
      setStatus("Settings loaded from INI");
    } catch {
      setStatus("Failed to load INI");
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

  document.addEventListener("keydown", (e) => {
    if (handleShortcutAssignment(e)) return;
    handleGlobalShortcuts(e);
  });
}

loadState();
wireEvents();
render();
