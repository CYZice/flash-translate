# Flash Translate

[![Demo Video](https://img.youtube.com/vi/KhFbv0te2Ck/maxresdefault.jpg)](https://www.youtube.com/watch?v=KhFbv0te2Ck)

A Chrome extension for instant translation using Chrome's built-in Translator API
or your own AI provider. An [Obsidian plugin](obsidian/README.md) is also available
for translating workspace selections in a draggable, pinnable card and safely
inserting results in editable notes.

A [desktop companion](desktop/README.md) supports global selection translation
on Windows and Linux. It includes a Chinese settings window and a Windows
portable-folder build that runs without installation.

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

Chrome's **Display settings → Translation text size** slider adjusts the card's
body text from 14 to 24 px (default 18 px). New cards follow the selection's full
width within the viewport. Pinned cards retain their position and width while
their height adapts to each new selection. They stay open when the window loses
focus.

### Usage statistics

Open **Usage on this installation** in either settings page for completed
translations, AI request attempts, reported input/output/total tokens, and the
number of AI requests without reported usage. Counters start with this build;
previous translations are not reconstructed. Native completions include input
assistance and word-hover translations. Model checks/downloads and connection
tests do not count. Failed or cancelled AI attempts count as requests, but not
completed translations.

Token counts come from the API's Chat Completions `usage` fields, not text-length
estimates. Cached/reasoning detail counts are not added again. Interrupted
streams may lack final usage. The official OpenAI endpoint is asked to include
[streaming usage](https://developers.openai.com/api/reference/resources/chat).
Custom compatible endpoints retain their existing request format; if they do
not include `usage`, their token usage remains unknown. Local translation does
not expose tokens. The displayed token sum covers reported requests only.

Only numeric aggregates are stored: Chrome uses local storage; Obsidian uses its
plugin data alongside settings. No translation history is added. An already-sent
Obsidian request can finish after its card closes; eventual reported tokens are
counted without restoring the closed UI.

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

### Install a GitHub release

Download the browser ZIP from [Releases](https://github.com/CYZice/flash-translate/releases/latest),
extract it, and load the extracted folder through **Load unpacked** in
`chrome://extensions/` with Developer mode enabled. The release also includes the
[Obsidian plugin](obsidian/README.md#install-a-release).

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
