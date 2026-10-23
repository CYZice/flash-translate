"use strict";
const {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  safeStorage,
  screen,
  Tray,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const SelectionHook = require("selection-hook");
const {
  getDismissal,
  getSelectionAnchor,
  placeFloatingWindow,
} = require("./floating-ui.cjs");
const { createSettingsStore } = require("./settings.cjs");
const { streamTranslation } = require("./translate.cjs");
const { resolveTranslationConfig } = require("./translation-options.cjs");

app.setName("Flash Translate");
const dataDirectory = app.isPackaged
  ? path.join(path.dirname(process.execPath), "data")
  : path.join(app.getPath("userData"), "desktop");
try {
  fs.mkdirSync(dataDirectory, { recursive: true });
  app.setPath("userData", dataDirectory);
  app.setPath("sessionData", path.join(dataDirectory, "session"));
} catch {
  dialog.showErrorBox(
    "Flash Translate",
    "无法写入配置目录，请将程序放到可写的文件夹后重试。"
  );
  app.exit(1);
}
const settingsStore = createSettingsStore(
  path.join(dataDirectory, "settings.json"),
  {
    isEncryptionAvailable: () =>
      safeStorage.isEncryptionAvailable() &&
      (process.platform !== "linux" ||
        safeStorage.getSelectedStorageBackend() !== "basic_text"),
    encryptString: (value) => safeStorage.encryptString(value),
    decryptString: (value) => safeStorage.decryptString(value),
  }
);

if (process.platform === "linux") {
  // Let Electron select X11 or Wayland from the current desktop session.
  app.commandLine.appendSwitch("ozone-platform-hint", "auto");
}

const TOOLBAR_WIDTH = 36;
const TOOLBAR_HEIGHT = 36;
const RESULT_WIDTH = 400;
const RESULT_HEIGHT = 172;
const RESULT_MIN_HEIGHT = 172;
const RESULT_MAX_HEIGHT = 480;

let toolbarWindow = null;
let resultWindow = null;
let selectionHook = null;
let currentSelection = null;
let lastTranslationSelection = null;
let currentTranslation = "";
let translationFontSize = 18;
let resultPinned = false;
let settingsWindow = null;
let tray = null;
let activeTranslation = null;
let connectionTest = null;
let monitorWarning = "";

function hideSelectionButton() {
  toolbarWindow?.hide();
  currentSelection = null;
}

function nativePointToDip(point) {
  return process.platform === "win32" ? screen.screenToDipPoint(point) : point;
}

function dismissFloatingWindows(input) {
  const dismissal = getDismissal({
    ...input,
    toolbar: toolbarWindow?.isVisible() ? toolbarWindow.getBounds() : null,
    result: resultWindow?.isVisible() ? resultWindow.getBounds() : null,
    resultPinned,
    resultFocused: resultWindow?.isFocused(),
  });
  if (dismissal.toolbar) {
    hideSelectionButton();
  }
  if (dismissal.result) {
    resultWindow?.hide();
  }
}

function publicSettings() {
  const { config, warning, keyUnavailable } = settingsStore.read();
  return {
    ...config,
    canClearApiKey: Boolean(config.apiKey) || Boolean(keyUnavailable),
    warning: [warning, monitorWarning].filter(Boolean).join(" "),
  };
}

function openSettings() {
  hideSelectionButton();
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    title: "Flash Translate · 设置",
    width: 440,
    height: 620,
    minWidth: 380,
    minHeight: 560,
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "settings-preload.cjs"),
    },
  });
  settingsWindow.once("ready-to-show", () => {
    if (!settingsWindow || settingsWindow.isDestroyed()) {
      return;
    }
    settingsWindow.show();
    // Windows may apply the launcher's maximized startup state on first show.
    if (settingsWindow.isMaximized()) {
      settingsWindow.unmaximize();
    }
  });
  settingsWindow.on("closed", () => {
    connectionTest?.abort();
    settingsWindow = null;
  });
  settingsWindow.loadFile(path.join(__dirname, "settings.html"));
}

function createTray() {
  tray = new Tray(path.join(__dirname, "assets", "icon.png"));
  tray.setToolTip("Flash Translate · 划词翻译");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "设置…", click: openSettings },
      { type: "separator" },
      { label: "退出 Flash Translate", click: () => app.quit() },
    ])
  );
  tray.on("double-click", openSettings);
}

function isSettingsSender(event) {
  return Boolean(settingsWindow && event.sender === settingsWindow.webContents);
}

ipcMain.on("settings-open", openSettings);
ipcMain.handle("settings-read", (event) => {
  if (!isSettingsSender(event)) {
    return null;
  }
  return publicSettings();
});
ipcMain.handle("settings-save", (event, input) => {
  if (!isSettingsSender(event)) {
    return { ok: false, error: "无效的设置窗口。" };
  }
  try {
    settingsStore.save(input);
    const settings = publicSettings();
    translationFontSize = settings.translationFontSize;
    resultWindow?.webContents.send("result-preferences", {
      translationFontSize,
    });
    resizeResultForText(currentTranslation);
    return { ok: true, settings };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
ipcMain.handle("settings-test", async (event, input) => {
  if (!isSettingsSender(event)) {
    return { ok: false, error: "无效的设置窗口。" };
  }
  connectionTest?.abort();
  const controller = new AbortController();
  connectionTest = controller;
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const config = resolveTranslationConfig(
      "Hello, world!",
      settingsStore.resolve(input)
    );
    let output = "";
    for await (const delta of streamTranslation(
      "Hello, world!",
      controller.signal,
      config
    )) {
      output += delta;
    }
    return { ok: true, translation: output };
  } catch (error) {
    return {
      ok: false,
      error: controller.signal.aborted
        ? "测试已取消或超时，请检查接口后重试。"
        : error.message,
    };
  } finally {
    clearTimeout(timeout);
    if (connectionTest === controller) {
      connectionTest = null;
    }
  }
});

function createToolbarWindow() {
  toolbarWindow = new BrowserWindow({
    width: TOOLBAR_WIDTH,
    height: TOOLBAR_HEIGHT,
    frame: false,
    transparent: true,
    hasShadow: false,
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
  toolbarWindow.on("blur", hideSelectionButton);
}

function createResultWindow() {
  resultWindow = new BrowserWindow({
    width: RESULT_WIDTH,
    height: RESULT_HEIGHT,
    frame: false,
    transparent: true,
    resizable: true,
    minWidth: 280,
    minHeight: RESULT_MIN_HEIGHT,
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
    if (!resultPinned) {
      resultWindow?.hide();
    }
  });
}

function moveToolbar(x, y) {
  if (!toolbarWindow || toolbarWindow.isDestroyed()) {
    return;
  }

  const display = screen.getDisplayNearestPoint({ x, y });
  const position = placeFloatingWindow(
    { x, y },
    { width: TOOLBAR_WIDTH, height: TOOLBAR_HEIGHT },
    display.workArea
  );
  toolbarWindow.setPosition(position.x, position.y, false);
  toolbarWindow.showInactive();
}

function showResult(text, x, y) {
  if (!resultWindow || resultWindow.isDestroyed()) {
    return;
  }

  const display = screen.getDisplayNearestPoint({ x, y });
  const [currentWidth, currentHeight] = resultWindow.getSize();
  const position = placeFloatingWindow(
    { x, y },
    { width: currentWidth, height: currentHeight },
    display.workArea
  );

  if (!resultPinned) {
    resultWindow.setPosition(position.x, position.y, false);
  }
  resultWindow.show();
  resultWindow.webContents.send("selection-result", text);
}

function resizeResultForText(text) {
  if (!resultWindow || resultWindow.isDestroyed()) {
    return;
  }
  const [width, currentHeight] = resultWindow.getSize();
  const lineCount = text
    .split("\n")
    .reduce(
      (total, line) =>
        total +
        Math.max(
          1,
          Math.ceil(
            line.length /
              Math.max(12, Math.floor((width - 48) / translationFontSize))
          )
        ),
      0
    );
  const display = screen.getDisplayMatching(resultWindow.getBounds());
  const nextHeight = Math.min(
    RESULT_MAX_HEIGHT,
    display.workArea.height - 16,
    Math.max(
      RESULT_MIN_HEIGHT,
      Math.ceil(108 + lineCount * translationFontSize * 1.6)
    )
  );
  if (nextHeight !== currentHeight) {
    // setSize clamps to stale fixed-size constraints on transparent Windows windows.
    resultWindow.setBounds({ width, height: nextHeight });
    const bounds = resultWindow.getBounds();
    const bottom = display.workArea.y + display.workArea.height - 8;
    if (bounds.y + nextHeight > bottom) {
      resultWindow.setPosition(
        bounds.x,
        Math.max(display.workArea.y + 8, bottom - nextHeight)
      );
    }
  }
}

function startSelectionMonitoring() {
  selectionHook = new SelectionHook();
  selectionHook.on("text-selection", (selection) => {
    if (
      (settingsWindow &&
        !settingsWindow.isDestroyed() &&
        settingsWindow.isFocused()) ||
      (resultWindow && !resultWindow.isDestroyed() && resultWindow.isFocused())
    ) {
      return;
    }
    const anchor = getSelectionAnchor(selection);
    if (!anchor) {
      hideSelectionButton();
      return;
    }
    const point = nativePointToDip(anchor);
    currentSelection = { text: selection.text.trim(), point };
    if (settingsStore.read().config.autoTranslate) {
      startTranslation(currentSelection);
    } else {
      moveToolbar(point.x, point.y);
    }
  });

  selectionHook.on("mouse-down", (event) =>
    dismissFloatingWindows({ type: "pointer", point: nativePointToDip(event) })
  );
  selectionHook.on("mouse-wheel", (event) =>
    dismissFloatingWindows({ type: "wheel", point: nativePointToDip(event) })
  );
  selectionHook.on("key-down", (event) =>
    dismissFloatingWindows({ type: "key", key: event.uniKey })
  );

  selectionHook.on("error", (error) => {
    console.error("[selection-hook]", error);
  });

  const selectionStarted = selectionHook.start({
    debug: false,
    enableClipboard: true,
  });

  if (!selectionStarted) {
    throw new Error("Unable to start selection-hook");
  }

  if (
    process.platform === "linux" &&
    process.env.XDG_SESSION_TYPE === "wayland"
  ) {
    console.warn(
      "[selection-hook] Wayland mode is supported with compositor-dependent limitations; X11 provides the most reliable selection coordinates."
    );
  }
}

function translationError(error, aborted) {
  if (aborted) {
    return "翻译超时，请重试。";
  }
  return `翻译失败：${error instanceof Error ? error.message : String(error)}`;
}

function startTranslation(selection) {
  if (!(selection?.text && resultWindow)) {
    return false;
  }
  const saved = settingsStore.read();
  if (
    saved.needsSetup ||
    !(saved.config.baseUrl && saved.config.model) ||
    saved.warning
  ) {
    openSettings();
    return false;
  }
  activeTranslation?.abort();
  const { text, point } = selection;
  const config = resolveTranslationConfig(text, saved.config);
  translationFontSize = config.translationFontSize;
  lastTranslationSelection = selection;
  hideSelectionButton();
  currentTranslation = "";
  resizeResultForText("");
  showResult("", point.x, point.y);
  resultWindow?.webContents.send("result-languages", {
    source: config.sourceLanguage,
    target: config.targetLanguage,
    autoTranslate: config.autoTranslate,
  });
  resultWindow.webContents.send("result-preferences", { translationFontSize });
  const controller = new AbortController();
  const contents = resultWindow.webContents;
  activeTranslation = controller;
  const timeout = setTimeout(() => controller.abort(), 120_000);
  resultWindow?.webContents.send("selection-translation-state", "loading");

  (async () => {
    let output = "";
    try {
      for await (const delta of streamTranslation(
        text,
        controller.signal,
        config
      )) {
        if (activeTranslation !== controller) {
          return;
        }
        output += delta;
        currentTranslation = output;
        resizeResultForText(output);
        contents.send("selection-result", output);
      }
      if (activeTranslation === controller) {
        contents.send("selection-translation-state", "done");
      }
    } catch (error) {
      if (activeTranslation !== controller) {
        return;
      }
      contents.send(
        "selection-result",
        translationError(error, controller.signal.aborted)
      );
      contents.send("selection-translation-state", "error");
    } finally {
      clearTimeout(timeout);
      if (activeTranslation === controller) {
        activeTranslation = null;
      }
    }
  })();
  return true;
}

ipcMain.handle("selection-translate", () => startTranslation(currentSelection));
ipcMain.handle("result-retry", () =>
  startTranslation(lastTranslationSelection)
);
ipcMain.handle("result-auto-toggle", () => {
  try {
    const { config } = settingsStore.read();
    const enabled = !config.autoTranslate;
    settingsStore.save({ ...config, autoTranslate: enabled });
    resultWindow?.webContents.send("result-auto-state", enabled);
    return { ok: true, enabled };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.on("selection-hide", hideSelectionButton);
ipcMain.on("result-hide", () => resultWindow?.hide());
ipcMain.handle("result-copy", () => {
  if (!currentTranslation) {
    return false;
  }
  clipboard.writeText(currentTranslation);
  return true;
});
ipcMain.handle("result-pin-toggle", () => {
  resultPinned = !resultPinned;
  resultWindow?.webContents.send("result-pin-state", resultPinned);
  return resultPinned;
});

app.whenReady().then(() => {
  if (process.platform !== "win32" && process.platform !== "linux") {
    console.warn(
      `[flash-translate] Unsupported desktop platform: ${process.platform}`
    );
  }
  createToolbarWindow();
  createResultWindow();
  resultWindow.on("hide", () => {
    const controller = activeTranslation;
    activeTranslation = null;
    controller?.abort();
  });
  createTray();
  try {
    startSelectionMonitoring();
  } catch (error) {
    monitorWarning = `全局划词未启动：${error.message}`;
  }
  const saved = settingsStore.read();
  if (
    saved.needsSetup ||
    !(saved.config.baseUrl && saved.config.model) ||
    saved.warning ||
    monitorWarning
  ) {
    openSettings();
  }
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", openSettings);
}

app.on("window-all-closed", () => {
  // Keep the tray and global selection monitor alive after settings is closed.
});

app.on("before-quit", () => {
  activeTranslation?.abort();
  connectionTest?.abort();
  tray?.destroy();
  selectionHook?.stop();
  selectionHook?.cleanup();
});
