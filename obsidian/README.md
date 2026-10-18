# Flash Translate for Obsidian

Select text in an editable Markdown note, run **Flash Translate: Translate
selection** from the command palette, then review and edit the translation.
Choose **Replace selection**, **Insert below**, or **Copy**. The editor context
menu also has a **Translate selection** action.

## Install the first development build

Requires Obsidian **1.11.4+** for its secret-storage API.

From the repository root:

```powershell
cd obsidian
npm ci
npm run build
cd ..
```

Copy the three files from `obsidian/dist/flash-translate/` into:

```text
<your-test-vault>/.obsidian/plugins/flash-translate/
  main.js
  manifest.json
  styles.css
```

In that test vault, enable community plugins and enable **Flash Translate**.
Start in a test vault before using the plugin in your main vault.

## Connect your model

Open **Settings → Flash Translate**:

1. Set **Base URL** to the API base, including `/v1` if your provider needs it.
   A full `/chat/completions` URL is also accepted.
2. Enter the exact **Model** ID.
3. Choose or create an **API key** through Obsidian's secret selector. Leave
   it empty for a local server that does not require authentication.
4. Choose the source and default target languages. Auto detection is performed
   by the selected model, not Chrome. You can change the target in the preview.
5. Optionally change the prompt and context sentence count. Use **0** to send
   only selected text.

The endpoint must support Chat Completions requests with `stream: false`.
Requests use Obsidian's HTTP API, so browser CORS policies do not restrict them.
No model is bundled. Chrome's built-in translator is not an Obsidian provider.

Assign a keyboard shortcut to **Flash Translate: Translate selection** under
**Settings → Hotkeys** if desired. No default shortcut is registered.

## Your note stays under your control

- Nothing is replaced automatically. You can edit the output before accepting.
- **Insert below** places the translation after the paragraph containing the
  selection's last text, preserving the original paragraph and its following text.
- Replacement and insertion check the original note, full document text, and
  selected range. If any changed, the result remains available to copy, but the
  plugin refuses the stale edit.
- Edits use Obsidian's editor API and participate in its normal undo history.
- Changing the target starts a new request; older results cannot overwrite it.
- Closing the preview or disabling the plugin prevents late UI updates. A
  request already sent through Obsidian's HTTP API can still finish at the provider.

Only settings and an API-key reference are saved in the vault's plugin
`data.json`; the key itself is managed by Obsidian's secret storage. Translation
text is not saved as plugin history. Your provider determines server-side
retention and billing. There is no telemetry in this plugin.

## Development

The Chrome extension remains in `src/`. The two applications share request
construction, response parsing, prompts, language constants, and context rules
through `src/shared/translation/` and adjacent pure modules.

```powershell
# Run all pure/unit tests, including the Obsidian tests (root dependencies needed)
npm test

# Type-check and build the Obsidian plugin
npm --prefix obsidian run build

# Watch TypeScript changes; run a full build after changing CSS or the manifest
npm --prefix obsidian run dev
```

Version 0.1 provides command/context-menu translation in Markdown editing mode.
Automatic selection popups, live typing hints, rendered-note/PDF selection,
and system-wide translation are separate follow-up features. Mobile behavior
has not yet been verified.
