/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type CardLayout, useCardLayout } from "./use-card-layout";

let root: Root;
let host: HTMLDivElement;
let layout: CardLayout;
const firstRect = new DOMRect(180, 60, 300, 20);
const secondRect = new DOMRect(520, 400, 400, 20);

function Harness({
  rect,
  pinned,
  bounds = rect,
}: {
  rect: DOMRect;
  pinned: boolean;
  bounds?: DOMRect;
}) {
  layout = useCardLayout({
    selectionRect: rect,
    selectionBounds: bounds,
    layoutKey: `${rect.x}:${rect.y}`,
    isPinned: pinned,
  });
  return null;
}

function render(rect: DOMRect, pinned: boolean) {
  act(() => root.render(<Harness rect={rect} pinned={pinned} />));
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("pinned card layout", () => {
  it("uses the full selection width when the anchor is a one-pixel caret", () => {
    act(() =>
      root.render(
        <Harness
          rect={new DOMRect(600, 60, 1, 20)}
          bounds={new DOMRect(180, 40, 600, 40)}
          pinned={false}
        />
      )
    );
    expect(layout.width).toBe(600);
  });
  it("restores automatic height for a new selection while retaining pinned width", () => {
    render(firstRect, false);
    act(() =>
      layout.handleBottomKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent)
    );
    const manualHeight = layout.height;
    act(() => layout.setHeight(400));
    expect(layout.height).toBe(manualHeight);
    render(firstRect, true);
    render(secondRect, true);
    act(() => layout.setHeight(400));
    expect(layout.height).toBe(400);
    expect(layout.width).toBe(firstRect.width);
  });
  it("preserves its position and resized width when pinned and reselected", () => {
    render(firstRect, false);
    act(() =>
      layout.handleRightKeyDown({
        key: "ArrowRight",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent)
    );
    act(() =>
      layout.handleDragKeyDown({
        key: "ArrowRight",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent)
    );
    const original = {
      left: layout.left,
      top: layout.top,
      width: layout.width,
    };
    render(firstRect, true);
    expect({ left: layout.left, top: layout.top, width: layout.width }).toEqual(
      original
    );
    render(secondRect, true);
    expect({ left: layout.left, top: layout.top, width: layout.width }).toEqual(
      original
    );
    act(() => layout.setHeight(220));
    expect(layout.top).toBe(original.top);
    render(secondRect, false);
    expect(layout.top).toBe(secondRect.bottom + 8);
    expect(layout.width).toBe(secondRect.width);
    expect(layout.left).not.toBe(original.left);
  });
});
