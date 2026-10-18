# Flash Translate for Obsidian

Select text and click the small translation button. The translation opens in a
compact floating card, without a modal or scroll-blocking overlay. Drag its header
to move it, or use the header's arrow keys. Resize from its bottom-right corner.
The small button follows the moving end of your selection, including wrapped
text. Copy, retry, insert, and replace use compact icons with hover labels.

**Pin position** keeps the card at the same screen coordinates while you scroll
and select more text. Each new selection updates that card instead of moving it
next to the selection. In manual mode, the chosen target stays selected. An unpinned card
closes on outside clicks or workspace scrolling; **Escape**, window blur, and
plugin unload close either kind of card.

Selections work in Markdown editing/live preview, reading views, and selectable
plugin output within workspace leaves, including chat output such as YoloAgent's.
Complete KaTeX/MathJax formulas use their TeX source when available, or readable
MathML structure; partial formula selections remain partial. Image-only content
and external embedded webviews are not converted to text.

Editable notes offer **Replace selection**, **Insert below**, and **Copy**.
File-backed embedded Markdown editors, including Canvas note editors, use the
same guarded edit actions. Reading views and other plugin output offer copy, not
note edits. You can also run **Flash Translate: Translate selection** from the
command palette or use the editor's **Translate selection** context-menu action.

## Install the development build

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

1. Set **API base URL** to the API base, including `/v1` if your provider needs it.
   A full `/chat/completions` URL is also accepted.
2. Enter the exact **Model** ID.
3. Choose or create an **API key** through Obsidian's secret selector. Leave
   it empty for a local server that does not require authentication.
4. Choose the source and default target languages. With **Source language → Auto
   detect**, the selected model detects the source. You can change the target in the card.
5. Choose **Context range** (0–3 sentences per side). Use **0** to send only
   selected text. **System prompt**, **Deep thinking**, and **Reasoning effort**
   are under **Advanced settings**, as in the browser extension. Thinking controls
   affect supported models only.

Enable **Automatic Chinese ↔ English** to choose both languages
automatically: English → Chinese; Chinese (including mixed technical text) →
English. The header shows the actual pair and a pinned card changes direction
on each new selection. Choosing a target language in the card leaves this mode.
This Chinese/English mode uses a local character rule, not a downloaded detector
or an extra AI request. For other languages, turn it off and choose languages.
The manual language selectors are hidden while this mode is on; turning it off
restores their saved values. Common settings follow the same language and
behavior rules as the browser extension. Chrome-only detection, page skipping,
and model downloads are not shown here. Changes save automatically in Obsidian;
the browser AI connection form uses **Save** or **Test connection**. Preferences
are stored separately and do not synchronize between the two applications.

**After selecting text** chooses between a small button (default), immediate
translation, and command-only operation. The button alone makes no network
request and reads no optional context. A pinned card updates immediately on new
selections in either automatic mode. Command-only mode stays manual even if pinned.

The endpoint must support Chat Completions requests with `stream: false`.
Requests use Obsidian's HTTP API, so browser CORS policies do not restrict them.
No model is bundled. Chrome's built-in translator is not an Obsidian provider.

Assign a keyboard shortcut to **Flash Translate: Translate selection** under
**Settings → Hotkeys** if desired. No default shortcut is registered.

## Your note stays under your control

- Nothing is replaced automatically. You can edit the output before accepting.
- **Insert below** places the translation after the paragraph containing the
  selection's last text, preserving the original paragraph and its following text.
- Replacement and insertion check the original editor, note, full document text, and
  selected range. If any changed, the result remains available to copy, but the
  plugin refuses the stale edit.
- Edits use Obsidian's editor API and participate in its normal undo history.
- Changing the target or selected text cancels the previous UI task. Across
  cards, at most one HTTP request runs and only the newest waiting request is kept. Older results
  cannot overwrite the current target.
- Closing the card releases its note-edit callbacks, selected text, output,
  selection ranges, and UI references, and prevents late UI updates. Closing a
  pop-out window also removes its selection listeners. Obsidian's HTTP API does not
  expose cancellation: an already-sent request can still finish. No replacement
  request is sent until it settles; closing cancels any waiting request. A slow
  endpoint can therefore delay the next translation. Disabling the plugin also
  cancels waiting tasks. Payloads contain selected text and context, not the full
  note snapshot.

The [public `requestUrl` API](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts)
has no abort signal or cancellation handle. Closing a card does not close
that underlying connection. The queue retains its transport slot until the
request actually ends, rather than pretending a UI timeout cancelled the network
operation. This preserves the API's cross-origin support without creating
overlapping obsolete requests.

Only settings and an API-key reference are saved in the vault's plugin
`data.json`; the key itself is managed by Obsidian's secret storage. Translation
text is not saved as plugin history. Your provider determines server-side
retention and billing. There is no telemetry in this plugin.

## Development

The Chrome extension remains in `src/`. The two applications share request
construction, response parsing, prompts, language constants, and context rules
through `src/shared/translation/` and adjacent pure modules. Both use
`src/shared/selection/` to walk selected DOM ranges without cloning page trees.
Context is read lazily at translation time and bounded independently of the
selected text. CodeMirror selections use the editor API so virtualized lines are
not silently omitted; full note snapshots are captured only when translating an
editable selection and released when that translation is replaced or closed.

```powershell
# Run all pure/unit tests, including the Obsidian tests (root dependencies needed)
npm test

# Type-check and build the Obsidian plugin
npm --prefix obsidian run build

# Watch TypeScript changes; run a full build after changing CSS or the manifest
npm --prefix obsidian run dev
```

Version 0.2 adds the non-modal floating card and generic workspace selections.
The development build is checked with unit/integration tests and a real Chromium
host harness using the built bundle and a local test provider. Native Obsidian
and installed YoloAgent behavior still need verification in a test vault; the
host harness does not reproduce their full runtime. Mobile behavior has not yet
been verified. System-wide translation and live typing hints remain separate work.
