# Flash Translate

[![Demo Video](https://img.youtube.com/vi/KhFbv0te2Ck/maxresdefault.jpg)](https://www.youtube.com/watch?v=KhFbv0te2Ck)

A Chrome extension for instant translation using Chrome's built-in Translator API
or your own AI provider. An [Obsidian plugin](obsidian/README.md) is also available
for translating workspace selections in a draggable, pinnable card and safely
inserting results in editable notes.

## Features

- **Automatic Chinese ↔ English**: Enable **自动中英互译** in the extension's
  language settings, or in Obsidian's Flash Translate settings. English selections
  translate to Chinese; selections containing Chinese (including mixed technical
  text) translate to English. Both languages are chosen locally without a detector
  model. Choosing a language in the translation card returns to manual mode.

- **Instant translation on text selection**: Select text to view translations immediately
- **Auto-detect source language**: Automatically detects the language of selected text using Chrome's Language Detection API
- **Handles long text**: Translate large paragraphs without length limits
- **Unlimited translations**: Translate long passages as often as you like
- **Site exclusion**: Disable translation on specific websites
- **Settings sync**: Your preferences sync automatically across devices
- **Translation providers**: Chrome's built-in translation runs on-device. Custom AI translation sends selected text and configured context to your chosen endpoint.
- **Selection extraction**: Reads selected text without cloning page DOM. KaTeX
  and MathJax formulas use their available TeX source or common MathML structures
  instead of duplicated rendering layers. Image-only formulas require OCR and
  are not extracted.
- **On-demand AI context**: Context is read only when using AI, not for the
  selection badge or Chrome's built-in translation. Each side reads up to the
  configured sentence count within 8,192 characters and a bounded DOM scan.
  These bounds apply to optional context, not the selected text.
- **Session cleanup**: Closing a translation clears its retained text and results.
  Local translation and language-detection sessions are destroyed once no active
  feature needs them. Downloaded language files and settings are kept.

## Settings in Chrome and Obsidian

Both hosts use **Languages → Translation behavior → AI translation**, with the
same labels and Chinese/English direction rule. Turn on **Automatic Chinese ↔
English** for English selections → Chinese and selections containing Chinese →
English. The saved manual languages are inactive until this mode is turned off.
In Chrome, language detection and page-language skipping are also inactive in
this mode; their saved preferences are restored when you turn it off.

AI endpoint, key, model, and context range stay together. System prompt, deep
thinking, and reasoning effort are under **Advanced settings**; thinking options
are applied only to supported models. Chrome additionally keeps language
detection, same-language skipping, input assistance, and site exclusions under
advanced behavior settings. **Chrome built-in language packs** is a separate,
on-demand download panel and does not change your translation languages.
Obsidian keeps its command-only option and secret storage. Settings are stored
separately in each host; they are not synchronized between Chrome and Obsidian.

## Requirements

- **Chrome 150+** (Translator API and element-scoped View Transition support)
- **Enable Translator API**:
  1. Open `chrome://flags`
  2. Search for "Translator API"
  3. Set to "Enabled"
  4. Restart Chrome

## Installation

### Chrome Web Store

[**Install Flash Translate**](https://chromewebstore.google.com/detail/gibfhkdnpbinchfllkhaihmghbbollfd)

### Manual Installation (Development)

1. Run `bun run dev` or `bun run build`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist` folder

## Development

```bash
# Install dependencies
bun install

# Start development server (with HMR)
bun run dev

# Production build
bun run build

# Type checking
bun run lint
```

## Tech Stack

- **Vite** + **@crxjs/vite-plugin** - Chrome extension builds with HMR
- **React 19** + **TypeScript** - UI components
- **React Compiler** - Automatic memoization
- **Tailwind CSS v4** - Styling
- **Chrome Translator API** - On-device AI translation

## Project Structure

```
src/
├── manifest.ts              # Chrome extension manifest
├── background/              # Service Worker
├── content/                 # Content Script (text selection → translation popup)
│   ├── components/          # TranslationPopup, etc.
│   ├── hooks/               # useTextSelection, useTranslator, etc.
│   └── styles/
├── popup/                   # Popup UI (settings, manual translation)
│   ├── components/
│   └── styles/
└── shared/                  # Shared code
    ├── components/          # ErrorBoundary, etc.
    ├── constants/           # Language list
    ├── storage/             # chrome.storage operations
    ├── types/               # Type definitions
    └── utils/               # Translator API wrapper
```

## Privacy

Chrome's built-in provider translates on-device. The custom AI provider and the
Obsidian plugin send selected text and configured context to your chosen endpoint.
See [PRIVACY.md](PRIVACY.md) for storage and provider details.

## License

MIT
