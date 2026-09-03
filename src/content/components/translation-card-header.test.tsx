/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HoveredTermTranslationState } from "../term-translation/use-hovered-term-translation";
import { TranslationCardHeader } from "./translation-card-header";

const originalChrome = globalThis.chrome;
const reactTestEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const originalActEnvironment = reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT;
let container: HTMLDivElement;
let root: Root;

const IDLE_TERM_TRANSLATION: HoveredTermTranslationState = {
  hoveredTerm: null,
  result: null,
  isLoading: false,
};

const HOVERED_TERM = {
  sourceText: "structured",
  contextText: "Expose structured tools.",
  termOffset: 7,
  anchorRect: {
    top: 200,
    right: 140,
    bottom: 220,
    left: 100,
    width: 40,
    height: 20,
  },
};

function render(termTranslation: HoveredTermTranslationState) {
  act(() => {
    root.render(
      <TranslationCardHeader
        autoDetectEnabled={false}
        activeResultView="local"
        aiAvailable
        aiIsLoading={false}
        detectedLanguage={null}
        isDetecting={false}
        isDragging={false}
        isSettingsOpen={false}
        onClose={vi.fn()}
        onMovePointerDown={vi.fn()}
        onResultViewChange={vi.fn()}
        onSettingsToggle={vi.fn()}
        onSourceLanguageOverride={vi.fn()}
        sourceLanguage="en"
        targetLanguage="ja"
        termTranslation={termTranslation}
      />
    );
  });
}

beforeEach(() => {
  reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      i18n: {
        getMessage: (key: string) => key,
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

describe("TranslationCardHeader", () => {
  it("shows the language selectors while no selected term is hovered", () => {
    render(IDLE_TERM_TRANSLATION);

    expect(container.querySelectorAll("select")).toHaveLength(2);
    expect(
      container.querySelector("[data-flash-translate-term-translation]")
    ).toBeNull();
  });

  it("replaces the language selectors with source and emphasized translation", () => {
    render({
      hoveredTerm: HOVERED_TERM,
      result: {
        sourceText: "structured",
        translatedText: "構造化された",
        contextText: "Expose structured tools.",
        sourceLanguage: "en",
        targetLanguage: "ja",
      },
      isLoading: false,
    });

    const status = container.querySelector<HTMLOutputElement>(
      "[data-flash-translate-term-translation]"
    );
    expect(container.querySelectorAll("select")).toHaveLength(0);
    expect(status?.textContent).toBe("structured構造化された");
    expect(status?.querySelector("strong")?.textContent).toBe("構造化された");
    expect(status?.getAttribute("aria-live")).toBe("polite");
    expect(
      container.querySelector('[aria-label="content_toggleSettings"]')
    ).toBeNull();
    expect(container.querySelector('[aria-label="content_close"]')).toBeNull();
  });

  it("shows the source term and a loading status before translation completes", () => {
    render({
      hoveredTerm: HOVERED_TERM,
      result: null,
      isLoading: true,
    });

    const status = container.querySelector<HTMLOutputElement>(
      "[data-flash-translate-term-translation]"
    );
    expect(status?.textContent).toBe("structuredcontent_translating");
    expect(status?.querySelector("strong")).toBeNull();
  });

  it("shows compact local and AI result controls", () => {
    render(IDLE_TERM_TRANSLATION);

    expect(container.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
    expect(
      container.querySelector('[title="content_resultAi"]')
    ).not.toBeNull();
  });
});
