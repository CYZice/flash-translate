# Android Selection Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a native Android selection-menu translator with a rounded bottom drawer and local provider settings.

**Architecture:** Kotlin/Compose activity receives `ACTION_PROCESS_TEXT`, renders a translucent bottom drawer, and streams from an OpenAI-compatible endpoint through a small OkHttp client. The desktop Linux path remains a single `start:linux` entry point.

**Tech Stack:** Kotlin, Android Gradle Plugin, Jetpack Compose Material 3, AndroidX Activity, OkHttp.

**Spec:** `docs/superpowers/specs/2026-10-23-android-selection-drawer-design.md`

## Global Constraints

- One Linux launch path; Ubuntu 24 is not a separate product target.
- Android minimum API 26 and target API 35.
- No accessibility service or overlay permission in the first release.
- Never replace selected text automatically.

## Review Focus

- Intent without selected text must show a safe empty state.
- HTTP errors and malformed SSE must become visible UI errors.
- Copy must not mutate the source app's selection.
- Missing provider settings must be actionable.
- Drawer dismissal must work through back and outside-tap.

### Task 1: Consolidate Linux entry points

**Files:** Modify `desktop/package.json`, `desktop/README.md`.

- [ ] Remove the Ubuntu-specific script and document `npm run start:linux` as the single Linux path.
- [ ] Validate JSON and diff whitespace.

### Task 2: Scaffold Android application

**Files:** Create `android/settings.gradle.kts`, `android/build.gradle.kts`, `android/gradle.properties`, `android/app/build.gradle.kts`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/res/values/styles.xml`, `android/README.md`.

- [ ] Define the Android application with API 26/35 and Compose dependencies.
- [ ] Register `MainActivity` for `ACTION_PROCESS_TEXT` with text MIME types.
- [ ] Use a translucent bottom-gravity theme.

### Task 3: Implement translation and settings

**Files:** Create `android/app/src/main/java/com/flashtranslate/android/TranslationConfig.kt`, `OpenAiStreamClient.kt`, `TranslationRepository.kt`, `SettingsActivity.kt`.

- [ ] Load and persist endpoint, model, API key, source language, and target language.
- [ ] Stream SSE deltas and surface HTTP/parser errors.
- [ ] Render a minimal settings form.

### Task 4: Implement selection drawer UI

**Files:** Create `android/app/src/main/java/com/flashtranslate/android/MainActivity.kt`.

- [ ] Read `Intent.EXTRA_PROCESS_TEXT`.
- [ ] Render rounded bottom drawer with translate result, loading state, error state, copy action, settings icon, and dismissal behavior.
- [ ] Keep selected text unchanged and only copy translated output on demand.

### Task 5: Documentation and verification

**Files:** Modify `android/README.md`, repository `README.md` if needed.

- [ ] Document Android Studio build/run instructions and provider setup.
- [ ] Run Gradle checks when Gradle/Android SDK are available; otherwise run Kotlin/JSON/static checks and report the environment limitation.
