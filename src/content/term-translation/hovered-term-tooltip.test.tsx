/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HoveredTermTooltip } from "./hovered-term-tooltip";
import type { HoveredTermTranslationState } from "./use-hovered-term-translation";

const HOVERED_TERM = {
  sourceText: "translate",
  contextText: "Please translate this sentence.",
  anchorRect: {
    top: 200,
    right: 140,
    bottom: 220,
    left: 100,
    width: 40,
    height: 20,
  },
};

const originalChrome = globalThis.chrome;
const reactTestEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const originalActEnvironment = reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT;
let container: HTMLDivElement;
let root: Root;

function render(state: HoveredTermTranslationState) {
  act(() => {
    root.render(<HoveredTermTooltip state={state} />);
  });
}

beforeEach(() => {
  reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      i18n: {
        getMessage: (key: string) =>
          key === "content_translating" ? "Translating..." : "Term translation",
      },
    },
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
  reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
});

describe("HoveredTermTooltip", () => {
  it("renders the hovered source term while translation is loading", () => {
    render({
      hoveredTerm: HOVERED_TERM,
      result: null,
      isLoading: true,
    });

    const tooltip = container.querySelector(
      "[data-flash-translate-term-tooltip]"
    );
    expect(tooltip?.textContent).toContain("translate");
    expect(tooltip?.textContent).toContain("Translating...");
  });

  it("renders the translated term without exposing DOM data in the result", () => {
    render({
      hoveredTerm: HOVERED_TERM,
      result: {
        sourceText: "translate",
        translatedText: "翻訳する",
        contextText: "Please translate this sentence.",
        sourceLanguage: "en",
        targetLanguage: "ja",
      },
      isLoading: false,
    });

    const tooltip = container.querySelector(
      "[data-flash-translate-term-tooltip]"
    );
    expect(tooltip?.textContent).toContain("translate");
    expect(tooltip?.textContent).toContain("翻訳する");
    expect(tooltip?.getAttribute("aria-label")).toBe("Term translation");
  });
});
