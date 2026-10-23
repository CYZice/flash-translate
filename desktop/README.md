# Flash Translate desktop companion

This is the lightweight global selection layer for Windows and Linux. It uses the MIT-licensed `selection-hook` native module to detect selected text in other applications, then displays a small Electron toolbar.

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

Linux works most reliably in an X11 session. Wayland is supported by `selection-hook`, but selection coordinates and clipboard fallback depend on the compositor and the source application. If the toolbar is not positioned correctly under Wayland, use an X11 session for the first release.

Configure the existing OpenAI-compatible provider through environment variables before starting:

```powershell
$env:FLASH_TRANSLATE_AI_BASE_URL = "http://localhost:11434/v1"
$env:FLASH_TRANSLATE_AI_MODEL = "qwen2.5:7b"
$env:FLASH_TRANSLATE_AI_KEY = ""
$env:FLASH_TRANSLATE_SOURCE_LANGUAGE = "auto"
$env:FLASH_TRANSLATE_TARGET_LANGUAGE = "Chinese"
npm start
```

The desktop companion is the single global selection path. It does not distinguish browser pages, Obsidian notes, or other applications. The browser extension and Obsidian plugin can remain installed during migration, but they are no longer required for global selection translation.

## Android feasibility

Android is possible, but it should be a separate native client rather than an Electron port. The first Android version should use the system `ACTION_PROCESS_TEXT` selection action: select text in an app, choose Flash Translate from the text-action menu, and show the same rounded result card. This works without broad accessibility permissions, but only in applications that expose selected text to Android.

A true always-available floating bubble requires an Android `AccessibilityService` and `SYSTEM_ALERT_WINDOW` overlay permission. That path can read more applications, but it has higher battery, privacy, and Play Store policy costs. It should be a later opt-in mode. The translation API and visual design can be shared; the selection and window layer must be implemented natively with Kotlin/Jetpack Compose.
