const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("selectionDesktop", {
  onSelectionChanged(callback) {
    ipcRenderer.on("selection-changed", (_event, data) => callback(data));
  },
  onSelectionResult(callback) {
    ipcRenderer.on("selection-result", (_event, text) => callback(text));
  },
  onTranslationState(callback) {
    ipcRenderer.on("selection-translation-state", (_event, state) => callback(state));
  },
  copy() {
    return ipcRenderer.invoke("selection-copy");
  },
  translate() {
    return ipcRenderer.invoke("selection-translate");
  },
  hideToolbar() {
    ipcRenderer.send("selection-hide");
  },
  hideResult() {
    ipcRenderer.send("result-hide");
  },
  copyResult() {
    return ipcRenderer.invoke("result-copy");
  },
  toggleResultPin() {
    return ipcRenderer.invoke("result-pin-toggle");
  },
  onResultPinState(callback) {
    ipcRenderer.on("result-pin-state", (_event, pinned) => callback(pinned));
  },
});
