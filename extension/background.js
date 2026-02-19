const HOST_NAME = "com.wep_macro.host";

let recording = false;
let lastMacro = null;
let logMode = false;
let coordMode = false;
let nativeConnected = false;

async function sendToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, message);
}

function sendToNative(message) {
  try {
    chrome.runtime.sendNativeMessage(HOST_NAME, message, (response) => {
      if (chrome.runtime.lastError) {
        nativeConnected = false;
        return;
      }
      nativeConnected = true;
    });
  } catch {
    nativeConnected = false;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "macroRecorded") {
    lastMacro = msg.payload;
    chrome.storage.local.set({ lastMacro });
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === "logEvent") {
    sendToNative({ type: "logEvent", payload: msg.payload });
  }
  sendResponse({ ok: true });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "popupCommand") return;
  const { command, repeat, macro } = msg.payload;

  if (command === "recordStart") {
    recording = true;
    sendToActiveTab({ type: "recordStart" });
    sendToNative({ type: "recordStart" });
  }
  if (command === "recordStop") {
    recording = false;
    sendToActiveTab({ type: "recordStop" });
    sendToNative({ type: "recordStop" });
  }
  if (command === "run") {
    sendToActiveTab({ type: "run", repeat });
    sendToNative({ type: "run", repeat, macro: lastMacro });
  }
  if (command === "loadMacro") {
    if (macro?.macro) {
      lastMacro = macro;
      chrome.storage.local.set({ lastMacro });
      sendToNative({ type: "macroSet", macro });
    }
  }
  if (command === "coordToggle") {
    coordMode = !coordMode;
    sendToActiveTab({ type: "coordToggle", value: coordMode });
    sendToNative({ type: "coordToggle", value: coordMode });
  }
  if (command === "logToggle") {
    logMode = !logMode;
    sendToActiveTab({ type: "logToggle", value: logMode });
    sendToNative({ type: "logToggle", value: logMode });
  }
  sendResponse({ ok: true, recording, coordMode, logMode, nativeConnected });
});
