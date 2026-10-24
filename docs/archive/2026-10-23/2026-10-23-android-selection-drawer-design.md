# Android Selection Drawer Design

## Intent

Provide a stable Android translation client that appears from the system text-selection menu and presents the result as a rounded bottom drawer. Reuse the desktop OpenAI-compatible streaming contract without requiring accessibility or overlay permission.

## Goals

- Receive selected text through `ACTION_PROCESS_TEXT`.
- Show a translucent, bottom-aligned rounded drawer over the source app.
- Stream translation results into the drawer.
- Copy the translation to the clipboard.
- Persist provider, model, key, and language settings locally.
- Keep the code ready for a later optional accessibility bubble.

## Non-goals

- Reading arbitrary screen content in the first Android release.
- Running a permanent accessibility service.
- Replacing selected text automatically.
- Sharing desktop Electron code with Android.

## Architecture

- Native Kotlin + Jetpack Compose UI.
- `MainActivity` receives `ACTION_PROCESS_TEXT` and owns the drawer lifecycle.
- `TranslationRepository` owns configuration and translation calls.
- `OpenAiStreamClient` handles OpenAI-compatible SSE streaming with OkHttp.
- `SettingsActivity` stores local configuration in `SharedPreferences`.
- The activity is translucent and bottom-gravity, so the drawer does not need `SYSTEM_ALERT_WINDOW`.

## Interaction

- The source app remains visible behind a dimmed translucent background.
- Back, outside-tap, or the system close action dismisses the drawer.
- Copy is the only primary action and never replaces the original selection.
- Settings uses an icon-only gear action.

## Constraints

- Minimum Android API: 26.
- Target Android API: 35.
- First Android release is intentionally selection-menu based; accessibility overlay is a later opt-in feature.
