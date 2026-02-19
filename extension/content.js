let recording = false;
let startTime = 0;
let events = [];
let coordMode = false;
let logMode = false;

function now() {
  return performance.now();
}

function record(evt) {
  if (!recording) return;
  events.push(evt);
}

function onKeyDown(e) {
  if (logMode) log("KeyDown", e.code);
  record({ type: "keydown", code: e.code, key: e.key, ts: now() - startTime });
}

function onKeyUp(e) {
  if (logMode) log("KeyUp", e.code);
  record({ type: "keyup", code: e.code, key: e.key, ts: now() - startTime });
}

function onMouseDown(e) {
  if (logMode) log("MouseDown", `${Math.round(e.clientX)},${Math.round(e.clientY)}`);
  record({ type: "mousedown", button: e.button, x: e.clientX, y: e.clientY, ts: now() - startTime });
}

function onMouseUp(e) {
  if (logMode) log("MouseUp", `${Math.round(e.clientX)},${Math.round(e.clientY)}`);
  record({ type: "mouseup", button: e.button, x: e.clientX, y: e.clientY, ts: now() - startTime });
}

function onMouseMove(e) {
  if (coordMode) {
    document.documentElement.style.setProperty("--wep-coord", `(${Math.round(e.clientX)}, ${Math.round(e.clientY)})`);
  }
  if (logMode) log("MouseMove", `${Math.round(e.clientX)},${Math.round(e.clientY)}`);
  record({ type: "mousemove", x: e.clientX, y: e.clientY, ts: now() - startTime });
}

function onWheel(e) {
  if (logMode) log("Wheel", `${Math.round(e.deltaY)}`);
  record({ type: "wheel", x: e.clientX, y: e.clientY, deltaX: e.deltaX, deltaY: e.deltaY, ts: now() - startTime });
}

function log(kind, details) {
  chrome.runtime.sendMessage({ type: "logEvent", payload: { kind, details } });
}

function attach() {
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("wheel", onWheel, { passive: true });
}

function detach() {
  document.removeEventListener("keydown", onKeyDown);
  document.removeEventListener("keyup", onKeyUp);
  document.removeEventListener("mousedown", onMouseDown);
  document.removeEventListener("mouseup", onMouseUp);
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("wheel", onWheel);
}

function startRecording() {
  events = [];
  recording = true;
  startTime = now();
  attach();
}

function stopRecording() {
  recording = false;
  detach();
  chrome.runtime.sendMessage({
    type: "macroRecorded",
    payload: { version: 1, macro: { name: "Macro 1", events } }
  });
}

function runMacro(repeat = 1) {
  const payload = { type: "runMacro", repeat };
  chrome.runtime.sendMessage({ type: "runMacro", payload });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "recordStart") startRecording();
  if (msg.type === "recordStop") stopRecording();
  if (msg.type === "coordToggle") coordMode = !!msg.value;
  if (msg.type === "logToggle") logMode = !!msg.value;
  if (msg.type === "run") runMacro(msg.repeat);
});

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const msg = event.data;
  if (!msg || msg.source !== "wep-macro") return;
  if (msg.type === "launchApp") {
    chrome.runtime.sendMessage({ type: "launchApp" });
  }
});
