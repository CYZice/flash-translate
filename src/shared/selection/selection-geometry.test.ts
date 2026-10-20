/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSelectionBoundsRect,
  getSelectionFocusRect,
  positionSelectionBadge,
} from "./selection-geometry";

const caret = new DOMRect(135, 60, 0, 20);
const lines = [new DOMRect(20, 30, 700, 20), new DOMRect(20, 60, 115, 20)];
function select(backward = false, elementBoundary = false): Selection {
  document.body.innerHTML = "<p>Long first line with a short second line</p>";
  const paragraph = document.body.firstChild as HTMLElement;
  const text = paragraph.firstChild as Text;
  const range = document.createRange();
  if (elementBoundary) {
    range.selectNodeContents(paragraph);
  } else {
    range.selectNodeContents(text);
  }
  const selection = document.getSelection() as Selection;
  selection.removeAllRanges();
  selection.addRange(range);
  if (backward) {
    selection.setBaseAndExtent(text, text.length, text, 0);
  }
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value(this: Range) {
      return this.collapsed ? [] : lines;
    },
  });
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    configurable: true,
    value(this: Range) {
      return this.collapsed && !elementBoundary ? caret : new DOMRect();
    },
  });
  return selection;
}
afterEach(() => {
  document.getSelection()?.removeAllRanges();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("selection endpoint geometry", () => {
  it("uses the caret on the short final line, not the long first line's right edge", () => {
    const rect = getSelectionFocusRect(select());
    expect(rect).toMatchObject({ left: 135, top: 60, width: 1, height: 20 });
  });
  it("uses the last rendered fragment when an element-boundary caret has no box", () => {
    expect(getSelectionFocusRect(select(false, true))).toMatchObject({
      left: 135,
      top: 60,
    });
  });
  it("anchors a backward drag at the selection's moving start", () => {
    const selection = select(true);
    Object.defineProperty(Range.prototype, "getBoundingClientRect", {
      value: () => new DOMRect(),
      configurable: true,
    });
    expect(getSelectionFocusRect(selection)).toMatchObject({
      left: 20,
      top: 30,
    });
  });
  it("uses the opposite fragment edge for right-to-left text", () => {
    const selection = select(false, true);
    (document.body.firstChild as HTMLElement).style.direction = "rtl";
    expect(getSelectionFocusRect(selection)).toMatchObject({
      left: 20,
      top: 60,
    });
  });
  it("ignores invisible fragments at the end without allocating DOM clones", () => {
    const selection = select(false, true);
    const clone = vi.spyOn(Range.prototype, "cloneContents");
    lines.push(new DOMRect());
    expect(getSelectionFocusRect(selection)?.left).toBe(135);
    lines.pop();
    expect(clone).not.toHaveBeenCalled();
  });
  it("has no anchor for empty or non-rendered selections", () => {
    expect(getSelectionFocusRect(null)).toBeNull();
    const selection = select(false, true);
    Object.defineProperty(Range.prototype, "getClientRects", {
      value: () => [],
      configurable: true,
    });
    expect(getSelectionFocusRect(selection)).toBeNull();
  });
});

describe("selection bounds for card width", () => {
  it("covers every line rather than only the moving caret", () => {
    expect(getSelectionBoundsRect(select())).toMatchObject({
      left: 20,
      top: 30,
      width: 700,
      height: 50,
    });
  });
  it("includes every selected range", () => {
    const selection = select();
    const ranges = [
      { getBoundingClientRect: () => new DOMRect(20, 30, 300, 20) },
      { getBoundingClientRect: () => new DOMRect(40, 60, 700, 20) },
    ];
    vi.spyOn(selection, "rangeCount", "get").mockReturnValue(2);
    vi.spyOn(selection, "getRangeAt").mockImplementation(
      (index) => ranges[index] as Range
    );
    expect(getSelectionBoundsRect(selection)).toMatchObject({
      left: 20,
      top: 30,
      width: 720,
      height: 50,
    });
  });
  it("ignores empty selections and invisible fragments", () => {
    expect(getSelectionBoundsRect(null)).toBeNull();
    const selection = select();
    Object.defineProperty(Range.prototype, "getClientRects", {
      configurable: true,
      value: () => [new DOMRect()],
    });
    expect(getSelectionBoundsRect(selection)).toBeNull();
  });
});

describe("compact selection badge position", () => {
  it("sits just after the selected endpoint", () => {
    expect(
      positionSelectionBadge(
        caret,
        { width: 28, height: 28 },
        { width: 800, height: 600 }
      )
    ).toEqual({ x: 141, y: 86 });
  });
  it("clamps at the viewport edge and flips above when necessary", () => {
    expect(
      positionSelectionBadge(
        new DOMRect(790, 570, 1, 20),
        { width: 28, height: 28 },
        { width: 800, height: 600 }
      )
    ).toEqual({ x: 764, y: 536 });
  });
});
