# Electron 单 Overlay 窗口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 合并桌面版翻译按钮与结果卡片窗口，减少一个常驻 Renderer，并修复 Windows 应用显示名称。

**Architecture:** 一个 `overlayWindow` 加载合并后的 `overlay.html`，通过页面状态切换按钮态和结果态；设置窗口继续按需创建。构建脚本使用 Windows PE 资源工具写入产品元数据，GPU 和 Electron runtime 保持不变。

**Tech Stack:** Electron 38、CommonJS、原生 HTML/CSS/JavaScript、Node test runner、Electron UI checks、Windows PE resource editor。

**Spec:** `docs/superpowers/specs/2026-10-24-electron-single-overlay-design.md`

## Global Constraints

- 不改变 Linux、Android、Electron GPU 设置或现有翻译 API 语义。
- 选中文本事件、固定、失焦关闭、复制、重试、字体大小和拖拽缩放行为保持不变。
- API 密钥不得进入前端事件、日志或构建产物。
- 构建脚本不得覆盖已有便携版目录。

## Review Focus

- 未固定卡片失焦：按钮和卡片都应按原规则消失；由桌面行为测试覆盖。
- 固定卡片外部输入：原应用仍可操作，卡片保持显示；由桌面行为测试覆盖。
- 按钮态到结果态的窗口复用：不应创建第二个 overlay renderer；由窗口生命周期测试覆盖。
- 拖拽缩放后的流式更新：手动尺寸不能被自动高度重置；由现有 UI 检查和尺寸逻辑测试覆盖。
- 任务管理器元数据：构建 exe 的产品名必须是 Flash Translate；由构建脚本检查覆盖。

---

### Task 1: 合并 overlay 页面与窗口状态

**Files:**
- Create: `desktop/src/overlay.html`
- Modify: `desktop/src/overlay.css`, `desktop/src/overlay-ui.js`, `desktop/src/preload.cjs`
- Modify: `desktop/src/main.cjs`
- Test: `desktop/src/main.test.cjs`, `desktop/scripts/check-result-ui.cjs`

**Interfaces:**
- `overlay-ui.js` consumes the existing preload behavior names and produces `toolbar`/`result` visual states.
- `main.cjs` owns exactly one `overlayWindow` and sends selection/result/language/preference/state events to it.

- [ ] Write a failing lifecycle test proving selection-button display and result display use one window reference.
- [ ] Run `npm test --prefix desktop` and observe the new test fail because the implementation still creates `toolbarWindow` and `resultWindow`.
- [ ] Merge the two HTML/CSS/JS surfaces and replace the two main-process window variables with one stateful `overlayWindow`.
- [ ] Run desktop tests and the renderer UI check; expect all existing checks plus the lifecycle assertion to pass.
- [ ] Commit `feat: merge desktop translation overlay windows`.

### Task 2: Set Windows executable metadata during portable build

**Files:**
- Modify: `desktop/scripts/build-portable.cjs`
- Modify: `desktop/package.json`, `desktop/package-lock.json` only if the build-time tool is added
- Test: `desktop/scripts/test-portable-metadata.cjs`

**Interfaces:**
- The portable builder continues to output `FlashTranslate.exe` and refuses to overwrite existing output.
- The metadata test reads the generated PE version information and asserts `ProductName` and `FileDescription` are `Flash Translate`.

- [ ] Write the metadata test and run it against the current portable executable; observe the existing Electron metadata fail.
- [ ] Add a build-only PE resource editing step that changes ProductName, FileDescription, OriginalFilename, and CompanyName without changing runtime code.
- [ ] Run the metadata test against a fresh temporary portable build; expect all fields to pass.
- [ ] Commit `fix: name portable desktop executable Flash Translate`.

### Task 3: Full verification and release readiness

**Files:**
- Modify: `desktop/README.md` if usage/build notes need the merged-window behavior documented.

- [ ] Run `npm test --prefix desktop`.
- [ ] Run `npm run test:ui --prefix desktop`.
- [ ] Run `npm exec --no -- ultracite check`.
- [ ] Run a fresh Windows portable build and verify no second toolbar window is created by source inspection and UI behavior.
- [ ] Run `git diff --check` and inspect the complete diff.
- [ ] Commit only after all checks pass; do not publish a new release until explicitly requested.
