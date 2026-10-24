# Flash Translate Android

This is the native Android client for the stable selection-menu workflow. Select
text in another app, choose **翻译** from Android's text-action menu, and Flash
Translate presents the result in a rounded bottom drawer over the source app.
It does not use a floating overlay or accessibility service.

## Text-selection compatibility

The APK registers `android.intent.action.PROCESS_TEXT` with `text/plain`, so
the normal trigger is: select text in another app, open the Android text-action
menu, and choose **翻译**. It also accepts `ACTION_SEND` text as a share-menu
fallback. Android and the device manufacturer decide the final menu order; the
app cannot force itself ahead of every other action.

This works in apps that expose selected text through Android's standard action
menu. Apps with custom selection controls, protected/DRM text, some WebViews,
or no text-selection action will not show Flash Translate. That is an Android
host limitation, not a requirement for an accessibility service.

The current source has been built and the APK manifest was checked for the
`PROCESS_TEXT` and `SEND` entries. A physical device or emulator was not
connected in the build environment, so device-specific menu behavior still
needs testing on the target phone.

## Build

Open `android/` in Android Studio, install Android SDK 35, and run the `app` configuration on an Android 8.0+ device or emulator.

For a smaller distribution build, use the `release` variant. It enables R8 and
resource shrinking; the local unsigned output is
`app/build/outputs/apk/release/app-release-unsigned.apk` and must be signed
before distribution.

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
