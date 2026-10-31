# Desktop Pin, Startup, and Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore independent toolbar/result windows, add OS-synchronized startup, and clear translation data when a result card closes.

**Architecture:** Restore the previous two-window design: a non-focusable selection toolbar and a resizable result window with independent geometry and pin state. Extend the existing strict settings store and settings form with `startOnLogin` and `clearOnClose`; apply the startup preference through Electron after readiness and after saves.

**Tech Stack:** Electron 38, CommonJS main process, vanilla renderer HTML/JS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-24-desktop-pin-startup-cleanup-design.md`

## Global Constraints

- Keep toolbar and result as separate Electron windows.
- `startOnLogin` defaults to `false`.
- `clearOnClose` defaults to `true`.
- Startup synchronization uses Electron's OS login-item API where supported.
- Do not add automated tests in this change; run the existing desktop suite.

## Review Focus

- A pinned result remains visible at the same position while a new selection toolbar appears elsewhere.
- Toolbar dismissal must not clear the pinned result state before the next translation.
- Explicit result close clears current translation and selection data when cleanup is enabled.
- Existing settings files without the new fields load with the specified defaults.
- Saving startup settings updates the OS login-item setting and does not throw on unsupported platforms.

---

### Task 1: Restore independent toolbar and result windows

**Files:**
- Modify: `desktop/src/main.cjs` around window creation, selection handling, result state, and pin/close IPC.

**Interfaces:**
- Produces independent `toolbarWindow` and `resultWindow` instances.
- Keeps result geometry and pin state independent from toolbar visibility.

- [ ] **Step 1: Restore independent window ownership**
  - Create a non-focusable toolbar window and a resizable result window.
  - Move only the toolbar for new selections.
  - Move the result only when it is unpinned; keep its bounds when pinned.

- [ ] **Step 2: Separate toolbar dismissal from result cleanup**
  - Keep toolbar hiding from clearing the saved pinned result.
  - Route explicit result close, outside dismissal of an unpinned result, Escape, and the close button through a cleanup-aware close function.
  - Clear `currentTranslation`, `lastTranslationSelection`, `currentSelection`, and renderer result text when `clearOnClose` is enabled.

- [ ] **Step 3: Preserve existing translation lifecycle**
  - Keep active request abort behavior on overlay hide and superseded translations.
  - Ensure a translation started from the toolbar can still set `lastTranslationSelection` for retry after the internal toolbar transition.

- [ ] **Step 4: Run the existing desktop tests**
  - Run `npm test` in `desktop/`.

### Task 2: Add startup and cleanup settings

**Files:**
- Modify: `desktop/src/settings.cjs`.
- Modify: `desktop/src/settings-ui.js`.
- Modify: `desktop/src/settings.html`.
- Modify: `desktop/src/settings.css`.

**Interfaces:**
- Settings fields: `startOnLogin: boolean`, `clearOnClose: boolean`.
- Defaults: `startOnLogin = false`, `clearOnClose = true`.

- [ ] **Step 1: Extend strict normalization and persistence**
  - Add both booleans to `PREFERENCES` and validation.
  - Preserve them through `resolve()` when provider fields are edited.

- [ ] **Step 2: Add the startup section to the form**
  - Add an off-by-default `开机自动启动` checkbox.
  - Show the note `启动后驻留系统托盘。`.
  - Add an on-by-default `关闭卡片后清除译文和选区` checkbox.
  - Read and fill both fields in the renderer.

- [ ] **Step 3: Adjust settings window sizing only as needed**
  - Keep the existing visual style and enlarge the window enough to avoid clipping the new controls.

- [ ] **Step 4: Run the existing desktop tests**
  - Run `npm test` in `desktop/`.

### Task 3: Synchronize OS startup behavior

**Files:**
- Modify: `desktop/src/main.cjs` around settings save and `app.whenReady()`.
- Modify: `desktop/README.md` to document the startup and cleanup settings.

**Interfaces:**
- Internal helper `syncLoginItemSetting(enabled)` applies the setting after Electron readiness and after each successful settings save.

- [ ] **Step 1: Apply the saved setting after readiness**
  - Read `startOnLogin` from the validated settings and call the helper after `app.whenReady()`.

- [ ] **Step 2: Apply changes immediately after save**
  - Call the helper only after settings persistence succeeds.
  - Use Electron's `setLoginItemSettings({ openAtLogin })` on supported OSes and no-op safely elsewhere.

- [ ] **Step 3: Document tray startup behavior**
  - Explain that automatic startup launches into the tray and does not open the settings window unless setup or a runtime warning requires it.

- [ ] **Step 4: Run final verification**
  - Run `npm test` in `desktop/`.
  - Run `git diff --check`.
  - Review the final diff and confirm no new test files were added.
