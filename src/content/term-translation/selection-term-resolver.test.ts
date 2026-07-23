/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isPointInsideSelectionRanges,
  resolveHoveredTermAtPoint,
} from "./selection-term-resolver";

const TERM_RECT = new DOMRect(10, 20, 50, 18);
const originalCaretPositionFromPoint = document.caretPositionFromPoint;
const originalGetClientRects = Range.prototype.getClientRects;

function setCaret(node: Text, offset: number) {
  Object.defineProperty(document, "caretPositionFromPoint", {
    configurable: true,
    value: () => ({
      offsetNode: node,
      offset,
      getClientRect: () => new DOMRect(),
    }),
  });
}

function createSelectionRange(node: Text, start: number, end: number): Range {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  return range;
}

beforeEach(() => {
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value: () => [TERM_RECT],
  });
});

afterEach(() => {
  Object.defineProperty(document, "caretPositionFromPoint", {
    configurable: true,
    value: originalCaretPositionFromPoint,
  });
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value: originalGetClientRects,
  });
  document.body.replaceChildren();
});

describe("resolveHoveredTermAtPoint", () => {
  it("resolves a word under the pointer inside the selection", () => {
    const textNode = document.createTextNode("hello world");
    document.body.append(textNode);
    setCaret(textNode, 2);

    expect(
      resolveHoveredTermAtPoint({
        document,
        x: 30,
        y: 28,
        selectionRanges: [createSelectionRange(textNode, 0, 11)],
        contextText: "hello world",
        sourceLanguage: "en",
      })
    ).toEqual({
      sourceText: "hello",
      contextText: "hello world",
      anchorRect: {
        top: 20,
        right: 60,
        bottom: 38,
        left: 10,
        width: 50,
        height: 18,
      },
    });
  });

  it("rejects a word that is not fully inside the selection", () => {
    const textNode = document.createTextNode("hello world");
    document.body.append(textNode);
    setCaret(textNode, 2);

    expect(
      resolveHoveredTermAtPoint({
        document,
        x: 30,
        y: 28,
        selectionRanges: [createSelectionRange(textNode, 2, 11)],
        contextText: "llo world",
        sourceLanguage: "en",
      })
    ).toBeNull();
  });

  it("rejects a caret whose word rectangle is not under the pointer", () => {
    const textNode = document.createTextNode("hello world");
    document.body.append(textNode);
    setCaret(textNode, 2);

    expect(
      resolveHoveredTermAtPoint({
        document,
        x: 200,
        y: 200,
        selectionRanges: [createSelectionRange(textNode, 0, 11)],
        contextText: "hello world",
        sourceLanguage: "en",
      })
    ).toBeNull();
  });
});

describe("isPointInsideSelectionRanges", () => {
  it("keeps the current term while crossing whitespace inside the selection", () => {
    const textNode = document.createTextNode("hello world");
    document.body.append(textNode);
    const selectionRange = createSelectionRange(textNode, 0, 11);

    expect(isPointInsideSelectionRanges([selectionRange], 30, 28)).toBe(true);
    expect(isPointInsideSelectionRanges([selectionRange], 200, 200)).toBe(
      false
    );
  });
});
