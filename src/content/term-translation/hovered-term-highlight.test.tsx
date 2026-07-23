/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HoveredTermHighlight } from "./hovered-term-highlight";

const HOVERED_TERM = {
  sourceText: "fairly",
  contextText: "They are fairly large.",
  anchorRect: {
    top: 200,
    right: 140,
    bottom: 220,
    left: 100,
    width: 40,
    height: 20,
  },
};

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

describe("HoveredTermHighlight", () => {
  it("draws a non-interactive outline around the segmented term", () => {
    act(() => {
      root.render(<HoveredTermHighlight hoveredTerm={HOVERED_TERM} />);
    });

    const highlight = container.querySelector<HTMLElement>(
      "[data-flash-translate-term-highlight]"
    );
    expect(highlight?.getAttribute("aria-hidden")).toBe("true");
    expect(highlight?.style.top).toBe("198px");
    expect(highlight?.style.left).toBe("98px");
    expect(highlight?.style.width).toBe("44px");
    expect(highlight?.style.height).toBe("24px");
    expect(highlight?.style.viewTransitionName).toBe(
      "flash-translate-term-highlight"
    );
  });
});
