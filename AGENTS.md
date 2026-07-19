# Flash Translate Agent Guide

This file is the canonical guidance for AI coding agents working in this
repository. Tool-specific instruction files should link to this file instead of
duplicating its contents.

## Project Overview

Flash Translate is a Manifest V3 Chrome extension for on-device translation
with Chrome's built-in Translator and Language Detector APIs. It translates
selected text in a page-injected card and provides language and exclusion
settings through the extension popup.

The extension requires Chrome 138 or later with the Translator API enabled in
`chrome://flags`.

## Commands

```bash
bun install           # Install dependencies
bun run dev           # Start the Vite development server with HMR
bun run build         # Type-check and build into dist/
bun run lint          # Check formatting and lint rules with Ultracite
bun run format        # Apply safe Ultracite fixes
bun run test          # Run the Vitest suite once
bun run test:watch    # Run Vitest in watch mode
```

To test the extension manually, load `dist/` as an unpacked extension from
`chrome://extensions/` with Developer mode enabled.

Ultracite and Biome configuration is the source of truth for mechanically
checkable style rules. Do not duplicate those rules in agent instructions.

## Architecture

### Entry Points

- `src/content/index.tsx` mounts the content application in a Shadow DOM on
  HTTPS pages.
- `src/popup/index.tsx` mounts the extension popup for language, download,
  behavior, and site-exclusion settings.
- `src/background/index.ts` is the Manifest V3 service worker.
- `src/manifest.ts` defines the extension manifest through
  `@crxjs/vite-plugin`.

### Translation Flow

1. `useTextSelection` detects and validates selected page text.
2. `useTranslationFlow` combines selection state, persisted settings, language
   detection, exclusion matching, and skip rules.
3. `TranslationCard` renders the in-page translation interface and delegates
   translation state to `useTranslator`.
4. `TranslatorManager` in `src/shared/utils/translator.ts` owns Translator API
   availability checks, model creation, language-pair reuse, and streaming.

### Shared State

- Settings are stored in `chrome.storage.sync` by
  `src/shared/storage/settings.ts`.
- `useSettings` subscribes to storage changes and accepts selectors from
  `src/shared/storage/settings-selectors.ts`.
- Site exclusions are origin-and-path prefixes evaluated by `isUrlExcluded`.
- Content and popup code share language constants, Translator API utilities,
  settings, and primitive UI components through `src/shared/`.

## Implementation Constraints

- Keep browser and DOM side effects at integration boundaries. Extract
  validation, transformation, and decision logic into adjacent pure modules.
- Use small structural interfaces such as `RectLike` when a pure function does
  not need a concrete DOM type.
- Preserve Translator and Language Detector lifecycle ownership in their
  managers; components and hooks should consume those abstractions rather than
  creating browser API instances directly.
- Preserve the strict settings boundary: validate values read from extension
  storage before exposing them to consumers.
- React Compiler is enabled. Do not add `useMemo`, `useCallback`, or `memo`
  solely for routine memoization; use them only when a concrete semantic or
  measured performance requirement remains.
- Keep concerns separated: hooks coordinate state and effects, while adjacent
  modules hold pure rules that can be tested without browser mocks.

## Testing

Prefer pure-function tests over mocks of React, the DOM, or Chrome APIs.

- Co-locate extracted logic and its test, for example `foo.ts` and
  `foo.test.ts`.
- Cover boundary conditions in selection validation, positioning, language
  matching, exclusion rules, and streaming behavior.
- Add integration-style tests only when behavior cannot be expressed through a
  stable pure contract.
- Run `bun run lint` and `bun run test` before committing code changes. Run
  `bun run build` when changing extension entry points, manifests, build
  configuration, or browser API integration.
