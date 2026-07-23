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
  content_termInsightDetails: "AI vocabulary insight",
  content_termInsightLoading: "Analyzing context and core meaning...",
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
          insightStatus: "idle",
          insightResult: null,
          insightProgress: {},
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

  it("keeps the quick translation visible while AI details load automatically", () => {
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
      insightStatus: "loading",
    });

    const tooltip = container.querySelector<HTMLOutputElement>(
      "[data-flash-translate-term-tooltip]"
    );
    expect(tooltip?.textContent).toContain("翻訳する");
    expect(tooltip?.textContent).toContain("AI vocabulary insight");
    expect(tooltip?.textContent).toContain(
      "Analyzing context and core meaning..."
    );
    expect(tooltip?.getAttribute("aria-label")).toBe("Term translation");
    expect(tooltip?.style.transform).toBe("translateX(-50%)");
  });

  it("reveals completed insight fields while the response is streaming", () => {
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
      insightStatus: "streaming",
      insightProgress: {
        contextualMeaning: "訳す",
        coreMeaning: "別の言語で意味を表す",
      },
    });

    const tooltip = container.querySelector(
      "[data-flash-translate-term-tooltip]"
    );
    expect(tooltip?.textContent).toContain("翻訳する");
    expect(tooltip?.textContent).toContain("訳す");
    expect(tooltip?.textContent).toContain("別の言語で意味を表す");
    expect(tooltip?.textContent).not.toContain("Part of speech");
  });

  it("renders the completed contextual meaning and learning details", () => {
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
      insightStatus: "ready",
      insightProgress: {
        expression: "translate",
        contextualMeaning: "訳す",
        coreMeaning: "別の言語で意味を表す",
        roleInContext: "依頼している動作を表す",
        partOfSpeech: "動詞",
        isMultiwordExpression: false,
      },
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
    expect(tooltip?.textContent).toContain("翻訳する");
  });
});
