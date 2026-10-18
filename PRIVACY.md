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

The Obsidian plugin uses your configured AI endpoint. It reads the selected note
text and the configured context, and sends a request only when you invoke
translation, retry it, or change the target language in an open preview. It does
not use Chrome's built-in translation API.

A local endpoint can keep processing on your computer. A remote endpoint receives
the submitted content; its retention, access, and billing policies apply. Set
context sentences to zero to exclude surrounding text from AI requests.

## What is stored

### Chrome extension

- Language, behavior, provider configuration, prompts, and site exclusions use
  `chrome.storage.sync`, which can sync through your Chrome account.
- The custom AI API key uses `chrome.storage.local`, not sync storage.
- Quick-translation requests can hold selected text in browser session storage
  so the side panel can display it. This is separate from persistent preferences.

### Obsidian plugin

- Provider configuration, language choices, prompt, and context preferences are
  stored in the vault's plugin `data.json`. Vault backup/sync tools may copy it.
- Only the API-key reference is stored in that file. The key itself is managed
  through Obsidian's secret-storage API.
- Translation previews remain in memory unless you explicitly copy or insert
  them. The plugin does not save a translation history.

## Access and control

The Chrome extension needs storage and webpage access for selection translation,
plus context-menu and side-panel permissions for quick translation. Custom
provider requests use the host permission granted for that endpoint. Website
exclusions can disable translation on specified pages.

The Obsidian plugin uses the active Markdown editor and inserts text only after
confirming an action. It checks that the original note and selection are still
current before editing. Closing the preview stops further UI updates; a request
already submitted to the provider may still complete there.

No analytics or telemetry are implemented by this project. Text submitted to
your chosen provider is subject to that provider's policies rather than a claim
that all translation remains local.

You can disable either integration, change the provider, remove its stored
settings, and remove unused credentials through the relevant application's
settings. For questions, use the repository's issue tracker:
https://github.com/yoshikouki/flash-translate/issues
