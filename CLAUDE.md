# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flash Translate is a Chrome extension that provides instant translation using the Chrome built-in Translator API. Users can select text on any webpage to see translations in a popup, or use the extension popup for manual translation.

**Requirements**: Chrome 150+ with Translator API enabled (`chrome://flags` → "Translator API" → Enabled)

## Commands

```bash
bun install         # Install dependencies
bun run dev         # Development server with HMR
bun run build       # Production build (output: dist/)
bun run lint        # Biome linting and formatting check
```

To test the extension: Load `dist/` folder as unpacked extension in `chrome://extensions/` (Developer mode)

## Architecture

### Entry Points (Manifest V3)
- **Content Script** (`src/content/index.tsx`): Injected into all pages, renders React app in Shadow DOM for text selection → translation popup
- **Popup** (`src/popup/index.tsx`): Extension popup UI for manual translation and language settings
- **Background** (`src/background/index.ts`): Service Worker (minimal, mainly for extension lifecycle)

### Core Translation Flow
1. `useTextSelection` hook detects text selection on page
2. `TranslationPopup` component appears near selection
3. `useTranslator` hook manages translation state with streaming support
4. `TranslatorManager` singleton (`src/shared/utils/translator.ts`) wraps Chrome Translator API with:
   - Instance caching per language pair
   - Availability checking (available/after-download/unavailable/unsupported)
   - Streaming translation via async generator

### State Management
- Language settings stored in `chrome.storage.sync` (synced across devices)
- `subscribeToSettings()` provides real-time setting updates via storage change listeners
- Content script and popup share settings through `src/shared/storage/settings.ts`

### Key Abstractions
- **TranslatorManager**: Singleton managing Translator API lifecycle, handles model downloads and caching
- **useTranslator**: React hook for translation with abort support, streaming, and availability states
- **usePopupPosition**: Calculates popup position relative to text selection
- **useResizable/useDraggable**: Hooks for popup resize (left/right handles) and drag interactions

### Site Exclusion
- URL patterns stored in settings to disable translation on specific sites
- `isUrlExcluded()` checks current URL against enabled patterns
- Managed through popup's ExclusionSettings component

## Tech Stack
- Vite + @crxjs/vite-plugin (HMR-enabled Chrome extension builds)
- React 19 + TypeScript
- **React Compiler** enabled via `babel-plugin-react-compiler` (automatic memoization - no manual `useMemo`/`useCallback`/`memo` needed)
- Tailwind CSS v4
- Biome (via Ultracite) for linting and formatting
- Vitest for testing
- `@types/dom-chromium-ai` for Translator API types
- Path alias: `@/` → `src/`

## Testing Strategy

### Principle: Extract Pure Functions, Avoid Mocks

This project follows a testing strategy that prioritizes **pure function extraction** over mocking. When code is difficult to test due to DOM, browser APIs, or React dependencies, refactor to extract testable pure functions rather than introducing mocks.

### Pattern

**Before** (hard to test - requires DOM mocks):
```typescript
// useTextSelection.ts
const handleMouseUp = () => {
  const text = window.getSelection()?.toString().trim();
  if (text && text.length > 0 && text.length < 5000) {
    // ... logic mixed with DOM access
  }
};
```

**After** (testable without mocks):
```typescript
// textSelection.ts - Pure functions (validation + normalization)
export function getValidSelectionText(text: string | null): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length >= MAX_SELECTION_LENGTH) {
    return null;
  }
  return trimmed;
}

// useTextSelection.ts - Hook delegates to pure functions
import { getValidSelectionText } from "./textSelection";
const handleMouseUp = () => {
  const rawText = window.getSelection()?.toString();
  const validText = getValidSelectionText(rawText); // validation + trim
  if (!validText) return;
  // use validText...
};
```

### Guidelines

1. **Identify logic vs. side effects**: Separate validation, transformation, and decision logic from DOM access and state updates
2. **Use interfaces for DOM types**: Instead of depending on `DOMRect`, define `RectLike { width: number; height: number }` for testability
3. **Co-locate pure functions**: Place `foo.ts` (pure functions) alongside `useFoo.ts` (hook that uses them)
4. **Test files mirror source**: `foo.ts` → `foo.test.ts`

### Test Commands

```bash
bun run test          # Single run (CI)
bun run test:watch    # Watch mode
```

### Examples in Codebase

- `src/content/hooks/textSelection.ts` + `textSelection.test.ts`: Text selection validation
- `src/shared/storage/settings.ts` + `settings.test.ts`: URL exclusion, language matching
- `src/shared/constants/languages.ts` + `languages.test.ts`: Language code utilities
