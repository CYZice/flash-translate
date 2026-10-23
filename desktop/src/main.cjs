const { app, BrowserWindow, clipboard, ipcMain, screen } = require("electron");
const path = require("node:path");
const SelectionHook = require("selection-hook");
const { streamTranslation } = require("./translate.cjs");

const TOOLBAR_WIDTH = 124;
const TOOLBAR_HEIGHT = 44;
const RESULT_WIDTH = 460;
const RESULT_HEIGHT = 320;

let toolbarWindow = null;
let resultWindow = null;
let selectionHook = null;
let currentSelection = null;
let currentTranslation = "";
let resultPinned = false;

function createToolbarWindow() {
  toolbarWindow = new BrowserWindow({
    width: TOOLBAR_WIDTH,
    height: TOOLBAR_HEIGHT,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  toolbarWindow.loadFile(path.join(__dirname, "toolbar.html"));
  toolbarWindow.on("blur", () => toolbarWindow?.hide());
}

function createResultWindow() {
  resultWindow = new BrowserWindow({
    width: RESULT_WIDTH,
    height: RESULT_HEIGHT,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  resultWindow.loadFile(path.join(__dirname, "result.html"));
  resultWindow.on("blur", () => {
    if (!resultPinned) resultWindow?.hide();
  });
}

function moveToolbar(x, y) {
  if (!toolbarWindow || toolbarWindow.isDestroyed()) return;

  const display = screen.getDisplayNearestPoint({ x, y });
  const bounds = display.workArea;
  const left = Math.min(
    Math.max(bounds.x + 8, Math.round(x - TOOLBAR_WIDTH / 2)),
    bounds.x + bounds.width - TOOLBAR_WIDTH - 8,
  );
  const top = Math.min(
    Math.max(bounds.y + 8, Math.round(y + 12)),
    bounds.y + bounds.height - TOOLBAR_HEIGHT - 8,
  );

  toolbarWindow.setPosition(left, top, false);
  toolbarWindow.showInactive();
}

function showResult(text, x, y) {
  if (!resultWindow || resultWindow.isDestroyed()) return;

  const display = screen.getDisplayNearestPoint({ x, y });
  const bounds = display.workArea;
  const left = Math.min(
    Math.max(bounds.x + 8, Math.round(x - RESULT_WIDTH / 2)),
    bounds.x + bounds.width - RESULT_WIDTH - 8,
  );
  const top = Math.min(
    Math.max(bounds.y + 8, Math.round(y + 20)),
    bounds.y + bounds.height - RESULT_HEIGHT - 8,
  );

  resultWindow.setPosition(left, top, false);
  resultWindow.show();
  resultWindow.webContents.send("selection-result", text);
}

function startSelectionMonitoring() {
  selectionHook = new SelectionHook();
  selectionHook.on("text-selection", (selection) => {
    const text = typeof selection.text === "string" ? selection.text.trim() : "";
    if (!text) return;

    currentSelection = selection;
    const point = selection.mousePosEnd || selection.endBottom;
    if (!point || point.x < 0 || point.y < 0) return;

    moveToolbar(point.x, point.y);
    toolbarWindow?.webContents.send("selection-changed", {
      text,
      programName: selection.programName || "",
    });
  });

  selectionHook.on("error", (error) => {
    console.error("[selection-hook]", error);
  });

  if (!selectionHook.start({ debug: false })) {
    throw new Error("Unable to start selection-hook");
  }
}

ipcMain.handle("selection-copy", () => {
  if (!currentSelection?.text) return false;
  clipboard.writeText(currentSelection.text);
  toolbarWindow?.hide();
  return true;
});

ipcMain.handle("selection-translate", () => {
  if (!currentSelection?.text) return false;
  const point = currentSelection.mousePosEnd || currentSelection.endBottom;
  toolbarWindow?.hide();
  const text = currentSelection.text;
  currentTranslation = "";
  showResult("Translating…", point?.x || 0, point?.y || 0);
  const controller = new AbortController();
  resultWindow?.webContents.send("selection-translation-state", "loading");

  void (async () => {
    let output = "";
    try {
      for await (const delta of streamTranslation(text, controller.signal)) {
        output += delta;
        currentTranslation = output;
        resultWindow?.webContents.send("selection-result", output);
      }
      resultWindow?.webContents.send("selection-translation-state", "done");
    } catch (error) {
      resultWindow?.webContents.send(
        "selection-result",
        `Translation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      resultWindow?.webContents.send("selection-translation-state", "error");
    }
  })();
  return true;
});

ipcMain.on("selection-hide", () => toolbarWindow?.hide());
ipcMain.on("result-hide", () => resultWindow?.hide());
ipcMain.handle("result-copy", () => {
  if (!currentTranslation) return false;
  clipboard.writeText(currentTranslation);
  return true;
});
ipcMain.handle("result-pin-toggle", () => {
  resultPinned = !resultPinned;
  resultWindow?.setAlwaysOnTop(resultPinned, "floating");
  resultWindow?.webContents.send("result-pin-state", resultPinned);
  return resultPinned;
});

app.whenReady().then(() => {
  createToolbarWindow();
  createResultWindow();
  startSelectionMonitoring();
});

app.on("before-quit", () => {
  selectionHook?.stop();
  selectionHook?.cleanup();
});
