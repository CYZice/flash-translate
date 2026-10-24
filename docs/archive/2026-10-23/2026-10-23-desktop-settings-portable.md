# Desktop settings and portable Windows build

Implement the requested small desktop increment in the existing Electron app.

1. Add validated local settings and encrypted API-key storage. Cover validation,
   saving/reloading, retaining/removing a key, and decryption failure with pure tests.
2. Pass configuration explicitly to translation. Test HTTP/SSE translation against
   a local fixture, including authentication failures, empty output, and cancellation.
3. Add a Chinese settings window with connection testing and immediate saving.
   Open it on first run; expose it from the selection toolbar and system tray.
   Keep one translation active and cancel it when hidden or superseded.
4. Build a Windows portable directory from the installed Electron runtime and the
   production dependency closure. Keep settings/runtime data beside the executable;
   no installer or new runtime dependencies. Never overwrite an existing release.
5. Run desktop and root tests, check relevant lint, build the portable directory,
   inspect its actual settings render and exercise saving, connection testing,
   reloading, and a translation with a local fixture. Document launch and data use.

Implementation decisions: GUI settings replace environment-variable configuration.
The API key stays in the main process and is encrypted through Electron safeStorage.
Copying to another OS account/machine may require re-entering the key. Use the
existing feature branch and preserve unrelated code. No Git commit is requested.

Progress: repository clean at start; existing desktop is Electron 38 with
selection-hook 2.1.2, without build tools or settings persistence.

Completed:
- Validated settings, encrypted-key retention/removal and recovery: 6 Node tests.
- Explicit-config streaming, HTTP errors, empty output, cancellation: 4 Node tests.
- Chinese settings UI, separate restricted preload, tray and toolbar entry points.
- Portable Windows build, with no new dependencies or installer.
- Desktop tests: 10/10; root Vitest: 681/681 across 70 files; Ultracite: clean.
- Actual packaged EXE launched using Playwright's Electron support against a local
  HTTP/SSE fixture. Verified first-run form, key visibility, connection testing
  without saving, encrypted persistence, reload/restart, retaining/removing keys,
  HTTP 401 feedback, closing to tray, second-instance activation and narrow layout.
- Inspected first-run, saved, error and narrow-window screenshots under
  `desktop/dist/qa/`. The fixture settings were removed after validation.
- Final review: self-review; no independent reviewer tool was available. No merge
  or Git commit is performed. Real provider credentials remain for the user to enter.
