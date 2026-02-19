const statusEl = document.getElementById("status");
const nativeStatusEl = document.getElementById("native-status");
const repeatEl = document.getElementById("repeat");

async function send(command) {
  const response = await chrome.runtime.sendMessage({
    type: "popupCommand",
    payload: { command, repeat: Number(repeatEl.value || 1) }
  });
  if (response) {
    statusEl.textContent = `Recording: ${response.recording}`;
    nativeStatusEl.textContent = response.nativeConnected ? "Connected" : "Disconnected";
  }
}

document.getElementById("btn-record").addEventListener("click", () => send("recordStart"));
document.getElementById("btn-stop").addEventListener("click", () => send("recordStop"));
document.getElementById("btn-run").addEventListener("click", () => send("run"));
document.getElementById("btn-coord").addEventListener("click", () => send("coordToggle"));
document.getElementById("btn-log").addEventListener("click", () => send("logToggle"));

document.getElementById("file-m").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await chrome.runtime.sendMessage({
      type: "popupCommand",
      payload: { command: "loadMacro", macro: data }
    });
    statusEl.textContent = "Macro loaded";
  } catch {
    statusEl.textContent = "Invalid macro file";
  } finally {
    e.target.value = "";
  }
});
