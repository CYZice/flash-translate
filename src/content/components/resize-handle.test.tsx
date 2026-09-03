/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResizeHandle } from "./resize-handle";

const originalChrome = globalThis.chrome;

describe("ResizeHandle", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: { i18n: { getMessage: (key: string) => key } },
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: originalChrome,
    });
  });

  it("positions the resize target against the card edge", () => {
    const onMouseDown = vi.fn();
    act(() => {
      root.render(<ResizeHandle onMouseDown={onMouseDown} side="right" />);
    });

    const handle = container.querySelector<HTMLElement>('[role="separator"]');
    expect(handle?.className).toContain("absolute");
    expect(handle?.className).toContain("right-0");

    act(() =>
      handle?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
    );
    expect(onMouseDown).toHaveBeenCalledOnce();
  });

  it("exposes a diagonal resize target in the bottom-right corner", () => {
    const onMouseDown = vi.fn();
    act(() => {
      root.render(
        <ResizeHandle onMouseDown={onMouseDown} side="bottom-right" />
      );
    });

    const handle = container.querySelector<HTMLElement>('[role="separator"]');
    expect(handle?.className).toContain("bottom-0");
    expect(handle?.className).toContain("right-0");
    expect(handle?.className).toContain("cursor-nwse-resize");
  });
});
