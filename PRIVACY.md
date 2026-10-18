# Privacy for Flash Translate

Last updated: October 18, 2026

## Translation depends on the provider you choose

The Chrome extension offers Chrome's built-in Translator API and a custom AI
provider. Chrome's built-in provider processes translation text on-device.
Browser-managed model downloads are separate from translation requests.

When you use custom AI translation, the extension sends the selected text,
configured neighboring-sentence context, language choices, prompt, and model ID
to the endpoint you configure. An API key, when configured, authenticates that
request. Testing a connection also contacts the configured provider.

The Obsidian plugin uses your configured AI endpoint. It reads selected text in
workspace note editors, reading views, and selectable plugin output, plus the
configured context. The default small-button mode sends nothing until you click
the button or invoke the translation command. Immediate mode sends new selections
automatically; a pinned card also translates new selections automatically in
either automatic mode. Retry and target-language changes send another request.
Command-only mode disables automatic translation. The plugin does not use
Chrome's built-in translation API.

A local endpoint can keep processing on your computer. A remote endpoint receives
the submitted content; its retention, access, and billing policies apply. Set
context sentences to zero to exclude surrounding text from AI requests.

## What is stored

### Chrome extension

- Language, behavior, provider configuration, prompts, and site exclusions use
  `chrome.storage.sync`, which can sync through your Chrome account.
- The custom AI API key uses `chrome.storage.local`, not sync storage.
- Aggregate translation completions, AI request attempts, and provider-reported
  token counters also use `chrome.storage.local`. They contain no translation
  text, prompts, URLs, model IDs, or per-request history.
- Quick-translation requests can hold selected text in browser session storage
  so the side panel can display it. This is separate from persistent preferences.

### Obsidian plugin

- Provider configuration, language choices, prompt, selection behavior, and context preferences are
  stored in the vault's plugin `data.json`. Vault backup/sync tools may copy it.
- Only the API-key reference is stored in that file. The key itself is managed
  through Obsidian's secret-storage API.
- Numeric aggregate translation/request/token counters are stored in the same
  `data.json`. They contain no translation text or per-request history; vault
  backup/sync tools may copy these counters.
- Translation previews remain in memory unless you explicitly copy or insert
  them. The plugin does not save a translation history.

## Access and control

The Chrome extension needs storage and webpage access for selection translation,
plus context-menu and side-panel permissions for quick translation. Custom
provider requests use the host permission granted for that endpoint. Website
exclusions can disable translation on specified pages.

The Obsidian plugin watches selection events in workspace windows. Read-only
views and other plugin output offer copy, not note edits. For editable note
selections, it inserts text only after you confirm an action and verifies the
original editor, note, document, and selection. Closing the card clears its
selection and edit references and stops further UI updates; a request already
submitted to the provider may still complete there. Disabling the plugin removes
its selection listeners.

No analytics or telemetry are implemented by this project. Text submitted to
your chosen provider is subject to that provider's policies rather than a claim
that all translation remains local.

You can disable either integration, change the provider, remove its stored
settings, and remove unused credentials through the relevant application's
settings. For questions, use the repository's issue tracker:
https://github.com/yoshikouki/flash-translate/issues
