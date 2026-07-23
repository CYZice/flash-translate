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

const originalChrome = globalThis.chrome;
const reactTestEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const originalActEnvironment = reactTestEnvironment.IS_REACT_ACT_ENVIRONMENT;
let container: HTMLDivElement;
let root: Root;

const MESSAGES: Record<string, string> = {
  content_close: "Close",
  content_termCoreMeaning: "Core meaning",
  content_termInsight: "Meaning in context",
  content_termInsightHint: "Click the term for details",
  content_termPartOfSpeech: "Part of speech",
  content_termRoleInContext: "Role in this context",
  content_termTranslation: "Term translation",
  content_translating: "Translating...",
};

function render(
  state: Pick<
    HoveredTermTranslationState,
    "hoveredTerm" | "result" | "isLoading"
  > &
    Partial<HoveredTermTranslationState>
) {
  act(() => {
    root.render(
      <HoveredTermTooltip
        state={{
          isPinned: false,
          insightStatus: "idle",
          insightResult: null,
          insightUnavailableReason: null,
          ...state,
        }}
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
        getMessage: (key: string) => MESSAGES[key] ?? key,
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
  it("uses the page highlight instead of repeating the source term while loading", () => {
    render({
      hoveredTerm: HOVERED_TERM,
      result: null,
      isLoading: true,
    });

    const tooltip = container.querySelector(
      "[data-flash-translate-term-tooltip]"
    );
    expect(tooltip?.textContent).toBe("Translating...");
    expect((tooltip as HTMLElement | null)?.style.viewTransitionName).toBe(
      "flash-translate-term-tooltip"
    );
  });

  it("renders only the translated term", () => {
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
    expect(tooltip?.textContent).toBe("翻訳するClick the term for details");
    expect(tooltip?.getAttribute("aria-label")).toBe("Term translation");
  });

  it("renders the contextual meaning and learning details when pinned", () => {
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
      isPinned: true,
      insightStatus: "ready",
      insightResult: {
        sourceText: "translate",
        quickTranslation: "翻訳する",
        sourceLanguage: "en",
        targetLanguage: "ja",
        context: {
          text: "Please translate this sentence.",
          termOffset: 7,
          strategy: "neighboring-sentences",
        },
        insight: {
          expression: "translate",
          contextualMeaning: "訳す",
          coreMeaning: "別の言語で意味を表す",
          roleInContext: "依頼している動作を表す",
          partOfSpeech: "動詞",
          isMultiwordExpression: false,
        },
      },
    });

    const tooltip = container.querySelector(
      "[data-flash-translate-term-tooltip]"
    );
    expect(tooltip?.textContent).toContain("訳す");
    expect(tooltip?.textContent).toContain("別の言語で意味を表す");
    expect(tooltip?.textContent).toContain("依頼している動作を表す");
    expect(tooltip?.textContent).toContain("動詞");
    expect(
      container.querySelector<HTMLButtonElement>('button[aria-label="Close"]')
    ).not.toBeNull();
  });
});
