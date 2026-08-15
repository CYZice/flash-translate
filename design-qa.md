# Design QA: temporary header replacement

## Evidence

- Source visual truth:
  - `/var/folders/rh/wrfq1xw55z95mr_kkbc24h8m0000gn/T/codex-clipboard-85262def-65f0-41d1-abde-2cf661aaf21c.webp`
  - `/var/folders/rh/wrfq1xw55z95mr_kkbc24h8m0000gn/T/codex-clipboard-13a3ed14-a63e-448e-9c23-08ff9df4f837.webp`
- Browser-rendered implementation screenshot:
  - `/Users/yoshikouki/.codex/visualizations/2026/08/15/01a00382-f6ca-7783-832e-0e77efdeb8dd/flash-translate-confirmation-header.png`
  - `/Users/yoshikouki/.codex/visualizations/2026/08/15/01a00382-f6ca-7783-832e-0e77efdeb8dd/flash-translate-term-header.png`
- Focused card crop:
  - `/Users/yoshikouki/.codex/visualizations/2026/08/15/01a00382-f6ca-7783-832e-0e77efdeb8dd/flash-translate-confirmation-card.png`
- Combined comparison:
  - `/Users/yoshikouki/.codex/visualizations/2026/08/15/01a00382-f6ca-7783-832e-0e77efdeb8dd/flash-translate-confirmation-comparison.png`
- Chrome viewport: 844 x 993 CSS pixels at device scale factor 1.
- Source pixels: 716 x 378. The source was normalized to 343 x 181 for the combined comparison.
- Implementation card crop: 450 x 181 pixels. The card width differed because it retained the user's resized width; height was matched for comparison.
- State: selected English sentence translated to Japanese; temporary-pause confirmation visible. The hovered-term state was separately checked with `extension` translated as `拡張`.

The browser captures above document the first structural fix. The later user direction supersedes its prompt-plus-action content with one right-aligned destructive action. A new Chrome capture for that follow-up is pending because the Mac was locked during the verification pass.

## Full-view comparison

The confirmation now occupies the normal header slot instead of covering it. No language selectors, settings button, pause button, or close button remain behind the confirmation. The card body and footer stay in place, so entering and leaving the temporary state does not resize the card.

The page behind the translucent card differs between the source and implementation captures, so the resulting card tint differs as expected. The implementation adds no opaque header background or backdrop blur.

## Focused-region comparison

The combined crop confirms the structural header replacement. The follow-up implementation removes the prompt and replaces the short destructive action with a self-describing, right-aligned `リロードするまで翻訳を表示しない` button. Typography, destructive color, rounded card edge, drag handle, body copy, and copy action continue to use the existing component system.

## Required fidelity surfaces

- Fonts and typography: Existing font family, text sizes, weights, line heights, and truncation behavior are preserved.
- Spacing and layout rhythm: Existing header height and horizontal padding are preserved. The temporary content uses the same header slot and does not introduce an overlay layer.
- Colors and visual tokens: Existing gray text and destructive red button tokens are reused. No new opaque background token is introduced.
- Image quality and asset fidelity: No image assets are part of this UI state. Existing Lucide icons remain unchanged in the normal state.
- Copy and content: The superseded confirmation copy and `停止` label were removed. The remaining action is `リロードするまで翻訳を表示しない`; English uses `Hide translations until reload`.

## Interaction verification

- Clicking the pause action replaces the complete normal header.
- Escape and the existing eight-second timeout restore the normal header.
- The destructive action receives initial focus.
- Hovered-term output also replaces the complete header, including the right-side controls.
- The follow-up component test confirms there is no dialog or separate prompt, and that the destructive action is right-aligned and initially focused.
- Chrome accessibility snapshot showed only the term status in hovered-term mode.
- Console check found no Flash Translate errors or warnings. The observed warnings came from another installed extension.

## Findings

No code-level or interaction blocker remains. Browser-rendered visual verification of the latest action-only state is pending because the Mac was locked.

## Comparison history

1. Before the fix, the confirmation was an absolute overlay with backdrop blur. The normal header remained mounted underneath and became visible when the overlay background was made transparent.
2. The fix lifted confirmation state to the header and made normal, confirmation, and hovered-term content mutually exclusive.
3. The post-fix Chrome capture and accessibility tree confirm that hidden header controls are absent rather than merely obscured.
4. The follow-up removes the prompt, places one self-describing destructive action at the right edge, and preserves the existing escape and timeout behavior.

## Follow-up polish

Capture the latest action-only state in Chrome after the Mac is unlocked.

final result: blocked
