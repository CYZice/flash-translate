"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("selectionDesktop", {
  openSettings() {
    ipcRenderer.send("settings-open");
  },
  onResultLanguages(callback) {
    ipcRenderer.on("result-languages", (_event, data) => callback(data));
  },
  onResultPreferences(callback) {
    ipcRenderer.on("result-preferences", (_event, data) => callback(data));
  },
  onSelectionResult(callback) {
    ipcRenderer.on("selection-result", (_event, text) => callback(text));
  },
  onTranslationState(callback) {
    ipcRenderer.on("selection-translation-state", (_event, state) =>
      callback(state)
    );
  },
  translate() {
    return ipcRenderer.invoke("selection-translate");
  },
  retry() {
    return ipcRenderer.invoke("result-retry");
  },
  toggleAutoTranslate() {
    return ipcRenderer.invoke("result-auto-toggle");
  },
  onAutoTranslateState(callback) {
    ipcRenderer.on("result-auto-state", (_event, enabled) => callback(enabled));
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
  resizeResult(width, height) {
    ipcRenderer.send("result-resize", { width, height });
  },
  onResultPinState(callback) {
    ipcRenderer.on("result-pin-state", (_event, pinned) => callback(pinned));
  },
});
