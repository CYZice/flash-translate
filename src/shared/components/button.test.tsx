/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Button } from "./button";

const reactTestEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const originalActEnvironment = reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT;
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
});

describe("Button", () => {
  it("renders a visual tooltip for hover and keyboard focus", () => {
    act(() => {
      root.render(
        <Button aria-label="Close" tooltip="Close">
          X
        </Button>
      );
    });

    const button = container.querySelector("button");
    const tooltip = container.querySelector('[aria-hidden="true"]');

    expect(button?.getAttribute("aria-label")).toBe("Close");
    expect(tooltip?.textContent).toBe("Close");
    expect(tooltip?.className).toContain("group-hover:opacity-100");
    expect(tooltip?.className).toContain("group-focus-within:opacity-100");
    expect(tooltip?.className).toContain("left-1/2");
    expect(tooltip?.className).toContain("top-full");
  });

  it("supports aligning the tooltip to an edge", () => {
    act(() => {
      root.render(
        <Button aria-label="Close" tooltip="Close" tooltipAlign="end">
          X
        </Button>
      );
    });

    expect(
      container.querySelector('[aria-hidden="true"]')?.className
    ).toContain("right-0");
  });

  it("supports positioning the tooltip above the button", () => {
    act(() => {
      root.render(
        <Button aria-label="Copy" tooltip="Copy" tooltipSide="top">
          Copy
        </Button>
      );
    });

    expect(
      container.querySelector('[aria-hidden="true"]')?.className
    ).toContain("bottom-full");
  });

  it("keeps plain buttons wrapper-free", () => {
    act(() => {
      root.render(<Button>Confirm</Button>);
    });

    expect(container.firstElementChild?.tagName).toBe("BUTTON");
  });
});
