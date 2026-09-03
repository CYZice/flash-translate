/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import {
  cloneSelectionRanges,
  getSelectionContext,
  getSelectionRect,
  getSelectionText,
  getValidSelectionText,
  isNodeInContentEditable,
  isValidRect,
  shouldShowCardForSelection,
} from "./text-selection";

describe("cloneSelectionRanges", () => {
  it("clones every current selection range", () => {
    const textNode = document.createTextNode("hello world");
    document.body.append(textNode);
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const ranges = cloneSelectionRanges(selection);

    expect(ranges).toHaveLength(1);
    expect(ranges[0]).not.toBe(range);
    expect(ranges[0]?.toString()).toBe("hello");

    selection?.removeAllRanges();
    document.body.replaceChildren();
  });
});

describe("getSelectionContext", () => {
  it("captures bounded text around the selected range", () => {
    const paragraph = document.createElement("p");
    paragraph.textContent =
      "The propagation constant determines the phase evolution of the guided mode.";
    document.body.append(paragraph);
    const textNode = paragraph.firstChild;
    if (!textNode) {
      throw new Error("Expected paragraph text node");
    }

    const start = paragraph.textContent.indexOf("propagation");
    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, start + "propagation".length);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    expect(getSelectionContext(selection)).toEqual({
      contextBefore: "The",
      contextAfter:
        "constant determines the phase evolution of the guided mode.",
    });

    selection?.removeAllRanges();
    paragraph.remove();
  });

  it("returns empty context without an active selection", () => {
    expect(getSelectionContext(null)).toEqual({
      contextBefore: "",
      contextAfter: "",
    });
  });
});

describe("getSelectionText", () => {
  it("removes duplicate assistive LaTeX content from a rendered selection", () => {
    const paragraph = document.createElement("p");
    paragraph.innerHTML = `few <span class="katex"><span class="katex-mathml"><math><annotation encoding="application/x-tex">duplicate source</annotation></math></span><span class="katex-html">transverse modes</span></span> to high spatial coherence`;
    document.body.append(paragraph);
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    expect(getSelectionText(selection)).toBe(
      "few transverse modes to high spatial coherence"
    );

    selection?.removeAllRanges();
    paragraph.remove();
  });

  it("ignores hidden and SVG math layers while keeping visible text", () => {
    const paragraph = document.createElement("p");
    paragraph.innerHTML = `before <mjx-container><svg><text>duplicate</text></svg></mjx-container><span aria-hidden="true">hidden</span>after`;
    document.body.append(paragraph);
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    expect(getSelectionText(selection)).toBe("before after");

    selection?.removeAllRanges();
    paragraph.remove();
  });
});

describe("getValidSelectionText", () => {
  it("returns null for null or undefined", () => {
    expect(getValidSelectionText(null)).toBeNull();
    expect(getValidSelectionText(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getValidSelectionText("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(getValidSelectionText("   ")).toBeNull();
    expect(getValidSelectionText("\n\t")).toBeNull();
  });

  it("returns trimmed text for valid input", () => {
    expect(getValidSelectionText("hello")).toBe("hello");
    expect(getValidSelectionText("こんにちは")).toBe("こんにちは");
  });

  it("trims whitespace from valid text", () => {
    expect(getValidSelectionText("  trimmed  ")).toBe("trimmed");
    expect(getValidSelectionText("\n hello \t")).toBe("hello");
  });

  it("accepts long text without length limit", () => {
    const longText = "a".repeat(100_000);
    expect(getValidSelectionText(longText)).toBe(longText);
  });
});

describe("isValidRect", () => {
  it("returns false for null or undefined", () => {
    expect(isValidRect(null)).toBe(false);
    expect(isValidRect(undefined)).toBe(false);
  });

  it("returns false for zero-width rect", () => {
    expect(isValidRect({ width: 0, height: 100 })).toBe(false);
  });

  it("returns false for zero-height rect", () => {
    expect(isValidRect({ width: 100, height: 0 })).toBe(false);
  });

  it("returns true for valid rect", () => {
    expect(isValidRect({ width: 100, height: 50 })).toBe(true);
  });

  it("returns true for rect with minimal dimensions", () => {
    expect(isValidRect({ width: 1, height: 1 })).toBe(true);
  });

  it("returns false for negative dimensions", () => {
    expect(isValidRect({ width: -10, height: 50 })).toBe(false);
    expect(isValidRect({ width: 10, height: -50 })).toBe(false);
  });
});

describe("shouldShowCardForSelection", () => {
  it("returns true when lastText is null", () => {
    expect(shouldShowCardForSelection("hello", null)).toBe(true);
  });

  it("returns true when text is different from lastText", () => {
    expect(shouldShowCardForSelection("hello", "world")).toBe(true);
    expect(shouldShowCardForSelection("new text", "old text")).toBe(true);
  });

  it("returns false when text is same as lastText", () => {
    expect(shouldShowCardForSelection("hello", "hello")).toBe(false);
    expect(shouldShowCardForSelection("same", "same")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(shouldShowCardForSelection("Hello", "hello")).toBe(true);
  });
});

describe("isNodeInContentEditable", () => {
  it("returns false for null", () => {
    expect(isNodeInContentEditable(null)).toBe(false);
  });

  it("returns false for regular element", () => {
    const div = document.createElement("div");
    const textNode = document.createTextNode("hello");
    div.appendChild(textNode);
    expect(isNodeInContentEditable(textNode)).toBe(false);
  });

  it("returns true for element with contenteditable=true", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    const textNode = document.createTextNode("hello");
    div.appendChild(textNode);
    expect(isNodeInContentEditable(textNode)).toBe(true);
  });

  it("returns true for element with contenteditable (empty string)", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "");
    const textNode = document.createTextNode("hello");
    div.appendChild(textNode);
    expect(isNodeInContentEditable(textNode)).toBe(true);
  });

  it("returns true for nested element inside contenteditable", () => {
    const outer = document.createElement("div");
    outer.setAttribute("contenteditable", "true");
    const inner = document.createElement("span");
    const textNode = document.createTextNode("hello");
    inner.appendChild(textNode);
    outer.appendChild(inner);
    expect(isNodeInContentEditable(textNode)).toBe(true);
  });

  it("returns false when contenteditable=false explicitly set", () => {
    const outer = document.createElement("div");
    outer.setAttribute("contenteditable", "true");
    const inner = document.createElement("span");
    inner.setAttribute("contenteditable", "false");
    const textNode = document.createTextNode("hello");
    inner.appendChild(textNode);
    outer.appendChild(inner);
    expect(isNodeInContentEditable(textNode)).toBe(false);
  });

  it("returns true for direct contenteditable element", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    expect(isNodeInContentEditable(div)).toBe(true);
  });
});

describe("getSelectionRect", () => {
  const createFallbackRect = (): DOMRect => new DOMRect(0, 0, 100, 100);

  it("returns null for null selection", () => {
    const fallback = createFallbackRect();
    expect(getSelectionRect(null, fallback)).toBeNull();
  });

  it("returns rect for valid selection", () => {
    const div = document.createElement("div");
    div.textContent = "Hello World";
    document.body.appendChild(div);

    const range = document.createRange();
    range.selectNodeContents(div);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const fallback = createFallbackRect();
    const result = getSelectionRect(selection, fallback);

    expect(result).not.toBeNull();

    document.body.removeChild(div);
  });

  it("returns fallback rect when getRangeAt throws", () => {
    const mockSelection = {
      getRangeAt: () => {
        throw new Error("No range");
      },
    } as unknown as Selection;

    const fallback = createFallbackRect();
    const result = getSelectionRect(mockSelection, fallback);

    expect(result).toBe(fallback);
  });
});
