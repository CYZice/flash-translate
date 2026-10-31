# Desktop Pin, Startup, and Cleanup Design

## Intent

Restore separate Electron windows for the selection toolbar and translation
card so a pinned card keeps its screen position while later selections show a
new toolbar. Extend desktop settings with startup behavior and explicit
post-close data cleanup.

## Goals

- A pinned card remains visible and keeps its bounds while a new selection
  shows a separate toolbar.
- Translating from that toolbar updates the pinned card without moving it.
- Add `startOnLogin`, defaulting to `false`, and apply it to the operating
  system login-item setting when settings are saved and when the app starts.
- Keep the app resident in the tray after startup; this is the existing app
  lifecycle and should be reflected in the startup setting copy.
- Add `clearOnClose`, defaulting to `true`; closing or dismissing the result
  clears the current translation, last selection, and renderer result content.

## Non-goals

- Do not add a generic idle resource-release switch. The desktop selection hook
  must remain available for global selection, and its wake-up behavior is not
  defined by this change.
- Do not change the translation provider or request lifecycle beyond clearing
  closed-card data and preserving the existing abort behavior.
- Do not add automated tests in this change, per the user's instruction.

## Approach

Restore independent `toolbarWindow` and `resultWindow` BrowserWindows. The
toolbar owns only the current selection anchor; the result window owns card
geometry, translation state, and pin state. A pinned result window is not
hidden or repositioned when a new selection creates a toolbar.

Extend the existing strict settings schema and form with startup and cleanup
preferences. Apply `startOnLogin` through Electron's OS integration rather than
treating it as a settings-file-only flag. Apply cleanup in the central hide
path so close, Escape, and dismissal share the same behavior.

## Acceptance

- Pinning a result, selecting new text, and translating it leaves the result at
  the original pinned coordinates.
- `startOnLogin` is persisted and reflected in the OS login-item configuration;
  the default is off.
- Closing a result removes its translation and selection data from the main
  process and clears the renderer result when cleanup is enabled.
- Existing desktop tests remain passing; no new test files are added.
