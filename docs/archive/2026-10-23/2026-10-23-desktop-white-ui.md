# Desktop white UI and selection dismissal

Apply the user's screenshots and current browser-extension styling to the
existing desktop implementation. This is a scoped UI/interaction update on top
of the previous authorized, uncommitted desktop increment, without architecture
changes or framework/dependency additions.

- White settings window, small heading, essential field labels and actions only.
- One 28px translation button in a tightly bounded transparent native window.
- White result card with a compact header containing language direction,
  persistent automatic-translation toggle, pin and close. Bottom right contains
  copy and retry only. New selections translate directly when automatic mode is on.
- Fix dismissal using the existing selection-hook mouse/key/wheel events;
  nonfocusable windows cannot rely on blur. Preserve clicks inside the button,
  scrolling in the result and pinned result behavior.
- Convert native pixel coordinates at the Electron integration boundary; allow
  negative coordinates for monitors to the left.
- Test decision/positioning rules first, then actual packaged UI and native-event
  wiring with a controlled fixture. Inspect the rendered windows.
- Produce version 0.1.2 separately after the additional user requirements. Preserve older releases and user data;
  no user credentials in the new portable archive.

References read: browser SelectionBadge, TranslationCardHeader and provider
settings; supplied screenshots; current Cherry Studio SelectionToolbarView source;
Pot desktop release page. Adopt the local extension's visual language.

## Verification and handoff

- Implemented the 34px header, white rounded result card, bottom-right copy/retry,
  single 28px selection button, and compact white settings form.
- API keys are visible in settings as requested, returned only through the
  settings window's restricted IPC; persistent keys remain system-encrypted.
- Automatic translation persists independently of provider-form changes.
- Also fixed accessing an already-destroyed settings window during selection.
- Desktop Node suite: 22 passed. Root Vitest: 70 files, 681 tests passed.
  Ultracite: 238 files checked, no fixes required. `git diff --check` passed.
- `desktop/dist/qa/white-ui-smoke.cjs` passed against real Electron windows, a
  local SSE fixture, and the installed native hook. Controlled native-event
  injection checks dismissal/coordinates without changing production code.
  Verified actual button click, copy, retry, auto mode/restart, pin/Escape,
  long-text scrolling, HTTP error recovery, and cancelling a hidden stream.
- Inspected screenshots in `desktop/dist/qa/white-*.png`. Packaged 0.1.2 starts
  with its real native monitor and no warning; settings fit a 440x620 window
  (minor width rounding at fractional Windows DPI). The first show restores
  the intended compact size when Windows inherits a maximized startup state.
- User confirmed defaults: `https://api.deepseek.com`, `deepseek-flash`. Existing
  saved providers are not overwritten. No user API keys were imported.
- Added default-on bilingual mode matching the extension's Han-script rule,
  a persisted 14–24px font slider (default 18), and a transparent animated
  infinity loader at the top-left text position, with no visible loading label.
- Actual Electron fixture verifies both outgoing language directions, manual
  language fallback, live font changes/restart persistence, and spinner
  animation/transparency/alignment. Real paid DeepSeek requests were not run.
- Fixed long-to-short card shrinking using setBounds: native transparent
  Windows windows are non-resizable and setSize clamps to stale size limits.
  Confirmed with a standalone native Electron reproduction, then a long/short
  and font-size regression in the full window fixture.
- Portable ZIP excludes the entire `data/` directory. Exit the previous release
  before use; copy its `data/` to the new folder to retain settings.

## Pin and loading refinement (0.1.3)

- Replaced the desktop-only pin drawing with the exact installed Lucide Pin
  and PinOff paths used by TranslationCardHeader: 14px icons, 2px strokes,
  28px button and amber pinned state. Included Lucide's license with the assets.
- Replaced whole-symbol rotation with a stationary infinity track and a blue
  short stroke flowing around the loop. Kept transparent background, text-start
  alignment and no visible loading label; honors reduced-motion preferences.
- Added `desktop/scripts/check-result-ui.cjs` / `npm run test:ui`, using an
  isolated actual Electron renderer and existing preload. Reproduced the old
  rotating symbol and blue pin state before the fix; all five checks pass after
  the fix. Inspected actual loading, pinned and unpinned render captures.
- Delivered `desktop/dist/FlashTranslate-0.1.3-win-x64/` and a 135.5 MiB
  `FlashTranslate-0.1.3-win-x64-portable.zip`, preserving earlier releases.
- Final verification: 22 desktop tests and all five renderer checks passed;
  Ultracite checked 239 files without errors. The full native-hook / local SSE
  smoke fixture passed, including packaged startup, pin/unpin, stationary
  geometry, changing stroke offset, reduced motion, copy/retry, streaming and
  preferences persistence. Packaged UI assets match the source. ZIP contains
  runtime/native binaries and the icon license, excluding data, settings and
  tests. Real paid DeepSeek requests were not run.
