/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getRangeContext,
  getRangeText,
  MAX_SELECTION_CONTEXT_CHARACTERS,
} from "./selection-text";

function content(html: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

function rangeIn(node: Node, start?: number, end?: number): Range {
  const range = document.createRange();
  if (start === undefined) {
    range.selectNodeContents(node);
  } else {
    range.setStart(node, start);
    range.setEnd(node, end ?? start);
  }
  return range;
}

function katex(source = "f(t)=1"): string {
  return `<span class="katex"><span class="katex-mathml"><math><semantics><mrow><mi>f</mi><mo>(</mo><mi>t</mi><mo>)</mo><mo>=</mo><mn>1</mn></mrow><annotation encoding="application/x-tex">${source}</annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span>f(t)</span><span>=1</span></span></span>`;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("shared selected text extraction", () => {
  it("reads partial text across inline elements without copying or editing DOM", () => {
    const root = content("<p>Hello <b>beautiful</b> world.</p>");
    const paragraph = root.firstChild as HTMLElement;
    const range = document.createRange();
    range.setStart(paragraph.firstChild as Text, 3);
    range.setEnd(paragraph.lastChild as Text, 4);
    const original = root.innerHTML;
    const clone = vi.spyOn(Range.prototype, "cloneContents");
    const split = vi.spyOn(Text.prototype, "splitText");
    expect(getRangeText(range)).toBe("lo beautiful wor");
    expect(clone).not.toHaveBeenCalled();
    expect(split).not.toHaveBeenCalled();
    expect(root.innerHTML).toBe(original);
  });

  it("honors element boundary offsets", () => {
    const root = content("<span>omit</span><b>keep</b><i>omit</i>");
    expect(getRangeText(rangeIn(root, 1, 2))).toBe("keep");
  });

  it("does not fall back to hidden text when the visible result is empty", () => {
    const root = content('<span style="display:none">secret</span>');
    expect(getRangeText(rangeIn(root))).toBe("");
  });

  it("skips hidden ancestors, scripts, styles and hidden attributes", () => {
    const root = content(
      '<p>A<span style="display:none"><b>hidden</b></span><span hidden>hidden</span><script>script</script><style>.unused { color: red }</style>B</p>'
    );
    expect(getRangeText(rangeIn(root))).toBe("AB");
    expect(getRangeText(rangeIn(root.querySelector("b") as Element))).toBe("");
  });

  it("uses CSS visibility, allowing descendants to become visible again", () => {
    const root = content(
      '<p>A<span style="visibility:hidden">hidden<b style="visibility:visible">visible</b></span>B</p>'
    );
    expect(getRangeText(rangeIn(root))).toBe("AvisibleB");
  });

  it("preserves paragraph and explicit line boundaries without joining words", () => {
    const root = content(
      "<p>First <b>paragraph.</b></p><p>Second<br>line.</p>"
    );
    expect(getRangeText(rangeIn(root))).toBe(
      "First paragraph.\n\nSecond\nline."
    );
  });

  it("collapses ordinary whitespace and preserves preformatted newlines", () => {
    const root = content(
      "<p>Hello\n   <b>beautiful</b>    world.</p><pre>first\nsecond</pre>"
    );
    expect(getRangeText(rangeIn(root))).toBe(
      "Hello beautiful world.\n\nfirst\nsecond"
    );
  });

  it("separates table cells and rows instead of joining adjacent words", () => {
    const root = content(
      "<table><tbody><tr><td>First</td><td>row</td></tr><tr><td>Second</td><td>row</td></tr></tbody></table>"
    );
    expect(getRangeText(rangeIn(root))).toBe("First row\n\nSecond row");
  });

  it("does not truncate a long selected text node", () => {
    const text = "x".repeat(100_000);
    const root = content(`<p>${text}</p>`);
    expect(getRangeText(rangeIn(root))).toBe(text);
  });

  it("does not inspect thousands of nodes before a short selection", () => {
    const root = content(
      `${"<span>Distant.</span>".repeat(5000)}<b>final word</b>`
    );
    const style = vi.spyOn(window, "getComputedStyle");
    expect(
      getRangeText(rangeIn(root.lastChild?.firstChild as Text, 0, 5))
    ).toBe("final");
    expect(style.mock.calls.length).toBeLessThan(12);
  });
});

describe("formula extraction", () => {
  it("takes one TeX source from real KaTeX's dual-layer structure", () => {
    const root = content(`Consider ${katex()} for all ${katex("t")}.`);
    expect(getRangeText(rangeIn(root))).toBe("Consider f(t)=1 for all t.");
  });

  it("recognizes a complete formula even when boundaries are inside its visual layer", () => {
    const root = content(katex());
    const visual = root.querySelector(".katex-html") as HTMLElement;
    const range = document.createRange();
    range.setStart(visual.firstChild?.firstChild as Text, 0);
    range.setEnd(visual.lastChild?.firstChild as Text, 2);
    expect(getRangeText(range)).toBe("f(t)=1");
  });

  it("does not expand a partial formula selection to the whole source", () => {
    const root = content(katex());
    const text = root.querySelector(".katex-html span")?.firstChild as Text;
    expect(getRangeText(rangeIn(text, 2, 3))).toBe("t");
  });

  it("reads MathJax's source and not its SVG plus assistive duplicate", () => {
    const root = content(
      '<p>Let <mjx-container data-latex="x^2"><svg><path d="" /></svg><mjx-assistive-mml><math><mi>x</mi><mn>2</mn></math></mjx-assistive-mml></mjx-container> grow.</p>'
    );
    expect(getRangeText(rangeIn(root))).toBe("Let x^2 grow.");
  });

  it("retains a visible SVG formula's text when source is unavailable", () => {
    const root = content(
      "<p>Let <mjx-container><svg><text>x=1</text></svg></mjx-container>.</p>"
    );
    expect(getRangeText(rangeIn(root))).toBe("Let x=1.");
  });

  it("serializes MathJax assistive MathML fractions and exponents once", () => {
    const root = content(
      '<p>Let <mjx-container><svg><path d="" /></svg><mjx-assistive-mml><math><mfrac><msup><mi>x</mi><mn>2</mn></msup><mi>y</mi></mfrac></math></mjx-assistive-mml></mjx-container>.</p>'
    );
    expect(getRangeText(rangeIn(root))).toBe("Let \\frac{x^{2}}{y}.");
  });

  it("never substitutes a visually hidden formula", () => {
    const root = content(
      `<p>A<span style="display:none">${katex()}</span>B</p>`
    );
    expect(getRangeText(rangeIn(root))).toBe("AB");
  });

  it("does not read a visibility-hidden formula's source", () => {
    const root = content(
      `<p>A<span style="visibility:hidden">${katex()}</span>B</p>`
    );
    expect(getRangeText(rangeIn(root))).toBe("AB");
  });
});

describe("local context extraction", () => {
  it("reads neighboring sentences in either direction without DOM clones", () => {
    const root = content(
      "<p>Far away. Near before. Selected. Near after. Distant.</p>"
    );
    const text = root.firstChild?.firstChild as Text;
    const offset = text.data.indexOf("Selected.");
    const clone = vi.spyOn(Range.prototype, "cloneContents");
    expect(getRangeContext(rangeIn(text, 0, offset), "before", 1)).toBe(
      "Near before."
    );
    expect(
      getRangeContext(rangeIn(text, offset + 9, text.length), "after", 1)
    ).toBe("Near after.");
    expect(clone).not.toHaveBeenCalled();
  });

  it("stops before distant DOM in both directions", () => {
    const root = content(
      `${"<span>Distant.</span>".repeat(1000)}<b>Nearest before.</b><i>Selected.</i><b>Nearest after.</b>${"<span>Distant.</span>".repeat(1000)}`
    );
    const selected = root.querySelector("i") as HTMLElement;
    const before = document.createRange();
    before.selectNodeContents(root);
    before.setEnd(selected, 0);
    const after = document.createRange();
    after.selectNodeContents(root);
    after.setStart(selected, 1);
    const style = vi.spyOn(window, "getComputedStyle");
    expect(getRangeContext(before, "before", 1)).toBe("Nearest before.");
    expect(getRangeContext(after, "after", 1)).toBe("Nearest after.");
    expect(style.mock.calls.length).toBeLessThan(24);
  });

  it("bounds punctuation-free context without copying the entire text node", () => {
    const root = content("x".repeat(1_000_000));
    const range = rangeIn(root);
    const read = vi.spyOn(Text.prototype, "substringData");
    expect(getRangeContext(range, "after", 1)).toHaveLength(
      MAX_SELECTION_CONTEXT_CHARACTERS
    );
    expect(getRangeContext(range, "before", 1)).toHaveLength(
      MAX_SELECTION_CONTEXT_CHARACTERS
    );
    expect(read.mock.calls.every(([, length]) => length <= 256)).toBe(true);
  });

  it("bounds traversal through empty elements", () => {
    const root = content(`${"<span></span>".repeat(5000)}unreachable`);
    const style = vi.spyOn(window, "getComputedStyle");
    expect(getRangeContext(rangeIn(root), "after", 1)).toBe("");
    expect(style.mock.calls.length).toBeLessThan(520);
  });

  it("does not allocate a DOM reader when context is disabled", () => {
    const root = content("hello");
    const style = vi.spyOn(window, "getComputedStyle");
    expect(getRangeContext(rangeIn(root), "after", 0)).toBe("");
    expect(style).not.toHaveBeenCalled();
  });
});
