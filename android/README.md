# Flash Translate Android

This is the native Android client for the stable selection-menu workflow. Select
text in another app, choose **翻译** from Android's text-action menu, and Flash
Translate presents the result in a rounded bottom drawer over the source app.
It does not use a floating overlay or accessibility service.

## Build

Open `android/` in Android Studio, install Android SDK 35, and run the `app` configuration on an Android 8.0+ device or emulator.

Open **Flash Translate settings** from the app launcher to configure:

- Base URL, defaulting to `https://api.deepseek.com`.
- Model name, defaulting to `deepseek-flash`.
- Optional API key, shown as plain text in the settings field.
- Automatic Chinese ↔ English routing, enabled by default.
- Manual source/target languages when automatic routing is disabled.
- Translation font size from 14 to 24sp, defaulting to 18sp.

The drawer shows a compact direction header, a text-aligned flowing loading
mark, and copy/retry actions at the bottom right. It never replaces the
original selected text automatically; use copy to place the translation on the
clipboard.
