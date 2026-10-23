# Flash Translate desktop companion

Select text in another application, click the small translation button, and
read or copy the streamed translation. The white result card has a compact
language-direction header, automatic-translation toggle, pin and close buttons.
Copy and retry sit at the bottom right. Enable the lightning toggle to translate
new selections immediately; the preference survives restarts. Drag the header
to move the card. Pinning keeps it open when clicking elsewhere; Escape closes it.
The selection button disappears when clicking elsewhere, scrolling or typing.
Automatic Chinese/English mode is enabled by default: text containing Chinese
(including mixed technical text) translates to English; other text translates
to Chinese. Turn it off in settings to choose a manual language direction.
The settings font-size slider adjusts the translation between 14 and 24px
(default 18px). Saving updates an open card and remembers the size. While
waiting for the first translation chunk, a blue highlight flows along a fixed
infinity outline at the top-left text position, without a loading label. Reduced
motion preferences stop the animation. The pin matches the browser extension's
Lucide Pin / PinOff icons, including the amber pinned state.
This Electron companion uses the MIT-licensed `selection-hook` native module on
Windows and Linux, with an OpenAI-compatible translation endpoint.

## Windows portable use

Open the generated `FlashTranslate-0.1.3-win-x64` folder and double-click
`FlashTranslate.exe`. Keep the entire folder together; no installer, Node.js, or
npm is needed on the destination PC.

On first launch, the Chinese settings window opens automatically:

1. The Base URL defaults to `https://api.deepseek.com` and the model to
   `deepseek-flash`. Enter your API key, or change the endpoint and model for
   another provider. Local services that do not require a key can leave
   it blank. A complete `/chat/completions` URL is also accepted.
2. Keep **自动中英互译** enabled, or turn it off to choose source and target
   languages. Adjust **字号** as needed.
3. Click **测试连接** to translate a short sample with the current form values.
   This sends an API request and does not save changes.
4. Click **保存**. New translations use the saved settings immediately.

Closing settings keeps the application running. Right-click the tray icon to
open **设置…** or **退出 Flash Translate**. Launching the executable again opens the existing
instance's settings.

Settings and Electron runtime data are stored in `data/` beside the executable.
Keep that directory when moving or updating your portable folder. API keys are
encrypted with Electron's system-backed `safeStorage`; moving to another PC or
OS account may require entering the key again. The settings page displays the
saved key as plain text; leave the field blank to retain it, or check the clear option
to remove it. The folder must be writable.

To update from an older release, exit it through its tray menu, copy its `data/` folder into
the new portable folder, then launch the new executable. Keep the old folder
until the new version works with your provider.

Electron includes Chromium and Node.js, so the portable folder is larger than
a native utility even though no installation is needed.

## Linux portable use

On a Linux machine, build the matching portable folder with:

```bash
npm run portable:linux
```

The output is `desktop/dist/FlashTranslate-<version>-linux-<architecture>/`.
Open `FlashTranslate.desktop` from the file manager and choose **Allow Launching**
if Linux asks; then double-click it like a normal application. It launches the
`FlashTranslate` binary from the same folder without opening a terminal. You can
also run `FlashTranslate` directly from that folder. It uses the same selection card,
settings, automatic Chinese/English routing, font-size preference, pin state,
streaming loader, and retry/copy actions as the Windows desktop build. X11 or
XWayland is recommended for the most reliable selection coordinates; Wayland
support remains compositor-dependent.

## Development

Run these commands inside `desktop/`:

```bash
npm install
npm start
```

On Windows:

```powershell
npm run start:windows
```

On Linux:

```bash
npm run start:linux
```

Ubuntu 24.04 can run Electron under Wayland, but X11/XWayland is recommended for more consistent global-selection coordinates and floating-window placement. Ubuntu normally provides XWayland by default. The native selection module's source-build dependencies are:

```bash
sudo apt install libevdev-dev libxtst-dev libx11-dev libxfixes-dev libwayland-dev
```

These packages are only needed when the prebuilt native binary cannot be used or when rebuilding the native module.

Linux works most reliably in an X11 session. Wayland remains available through `npm run start:linux`, but selection coordinates and clipboard fallback depend on the compositor and the source application.

Configuration is entered through the settings window; the old
`FLASH_TRANSLATE_AI_*` environment-variable path has been removed. Development
settings live in Electron's user-data directory under `Flash Translate/desktop`,
separately from portable builds.

Run the desktop tests:

```bash
npm test
```

Run the focused Electron renderer checks for the result card:

```bash
npm run test:ui
```

Build a Windows portable folder using the already-installed Electron runtime:

```bash
npm run portable:windows
```

The output is `desktop/dist/FlashTranslate-<version>-win-<architecture>/`.
The builder copies runtime and production dependencies, excluding tests, other
platforms' native binaries, and any development or user settings. It refuses to
overwrite an existing output folder. Move an old build elsewhere before
rebuilding, then transfer its `data/` if you want to retain settings.

On Linux, use `npm run portable:linux`; the builder uses the Linux Electron
runtime and Linux prebuilt `selection-hook` binary and writes the corresponding
`-linux-<architecture>` folder.

The desktop companion is the single global selection path. It does not distinguish browser pages, Obsidian notes, or other applications. The browser extension and Obsidian plugin can remain installed during migration, but they are no longer required for global selection translation.

## Android feasibility

Android is possible, but it should be a separate native client rather than an Electron port. The first Android version should use the system `ACTION_PROCESS_TEXT` selection action: select text in an app, choose Flash Translate from the text-action menu, and show the same rounded result card. This works without broad accessibility permissions, but only in applications that expose selected text to Android.

A true always-available floating bubble requires an Android `AccessibilityService` and `SYSTEM_ALERT_WINDOW` overlay permission. That path can read more applications, but it has higher battery, privacy, and Play Store policy costs. It should be a later opt-in mode. The translation API and visual design can be shared; the selection and window layer must be implemented natively with Kotlin/Jetpack Compose.
