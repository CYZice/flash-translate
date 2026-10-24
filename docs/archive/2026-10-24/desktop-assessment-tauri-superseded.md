# Flash Translate on Windows

## Recommendation: add a Tauri desktop application

Keep the working Chrome extension. Add a separate Tauri 2 application with the
existing React UI and a small Rust/Win32 integration layer. Use the configured
AI endpoint first; desktop operation must not depend on a running Chrome process.
This assessment does not add a desktop application or produce an executable.

## What can be shared

- Language constants and text/context transformation rules.
- Streaming execution and cancellation contracts.
- The HTTP/SSE request logic and browser-independent configuration types in
  `src/shared/translation/`, now shared by Chrome and the Obsidian integration.
- Presentational React controls and card content. DOM-specific anchoring and
  browser i18n calls need desktop adapters rather than wholesale reuse.

## What must change

| Extension integration | Desktop integration |
| --- | --- |
| DOM selection and document events | Native shortcut and selection capture |
| In-page Shadow DOM card | Frameless desktop translation window |
| `chrome.runtime` ports | Tauri commands and streaming channels |
| `chrome.storage.sync` | Validated local settings |
| API key in extension storage | Windows credential storage |
| Chrome `Translator` / `LanguageDetector` | Independent translation / detection provider |
| Website exclusions | Application allow/exclusion rules |

Tauri uses WebView2 on Windows to render React, but does not require a Chrome
window. Chromium-based rendering does not guarantee Chrome's built-in AI APIs.
A local model server can be supported through the same compatible HTTP contract;
model quality, latency, and hardware requirements need separate measurement.

## First executable: selection, preview, confirmed replacement

1. Stay in the tray and register a configurable translation shortcut.
2. Record the foreground window and focused control before taking focus.
3. Read the selection using the supported native text interface or a controlled
   copy operation. If using the clipboard, preserve its formats and wait for a
   confirmed update; never translate stale clipboard text.
4. Translate through the configured provider and display a preview.
5. On explicit confirmation, validate the original target and selection. If the
   user changed either, keep the preview and require reselection instead of
   pasting into the current foreground window.
6. Insert the accepted translation without sending Enter. Restore temporary
   clipboard contents only if the user has not copied something new meanwhile.

Test this complete path in Notepad and the user's installed WeChat version,
including Chinese input, multiline text, focus changes, and cancellation.
Password fields and elevated applications need explicit handling; do not run the
whole tool as administrator to bypass application restrictions.

## Follow-up: live English beside Chinese input

This is a separate capability from Trayslate-style copy/translate/paste.
Investigate UI Automation text, caret, bounds, and change notifications in
WeChat. Only enable automatic input assistance for validated applications.
Respect IME composition, debounce committed text, cancel stale requests, and
verify the exact text range before replacement. Do not reconstruct text by
recording global keystrokes. Screenshot OCR helps reading, not safe editing.

## Build and migration boundary

Tauri's Windows toolchain needs Rust, MSVC C++ build tools, and WebView2. It can
package an NSIS `-setup.exe` or an MSI; packaging alone does not implement native
selection or replacement.

During this assessment, `cargo` and `rustc` were not available on the current
shell PATH. Visual Studio Installer is present; the C++ workload has not been
verified. No toolchain was installed.

Before the architectural work, commit the current extension changes and create
a dedicated desktop branch. The next implementation milestone is the working
selection/preview/replacement executable, not an empty desktop wrapper.

## References

- [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/#windows)
- [Tauri global shortcuts](https://v2.tauri.app/plugin/global-shortcut/)
- [Tauri WebView runtimes](https://v2.tauri.app/reference/webview-versions/)
- [Tauri Windows packaging](https://v2.tauri.app/distribute/windows-installer/)
- [Windows text control patterns](https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-about-text-and-textrange-patterns)
- [SendInput restrictions](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput)
- [Trayslate selection and paste implementation](https://github.com/plaintool/trayslate/blob/main/forms/mainform.pas)
