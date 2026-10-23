"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopSettings", {
  read: () => ipcRenderer.invoke("settings-read"),
  save: (input) => ipcRenderer.invoke("settings-save", input),
  test: (input) => ipcRenderer.invoke("settings-test", input),
});
