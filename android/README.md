# Flash Translate Android

This is the native Android client for the stable selection-menu workflow. It receives selected text through `ACTION_PROCESS_TEXT` and presents the translation as a rounded bottom drawer over the source app.

## Build

Open `android/` in Android Studio, install Android SDK 35, and run the `app` configuration on an Android 8.0+ device or emulator.

The first launch supports OpenAI-compatible providers. Open the settings gear and configure:

- Base URL, for example `https://api.openai.com/v1` or a local network provider URL.
- Model name.
- Optional API key.
- Source language (`auto` by default).
- Target language (`Chinese` by default).

The Android client never replaces the original selected text automatically. Use the copy button to place the translation on the clipboard.
