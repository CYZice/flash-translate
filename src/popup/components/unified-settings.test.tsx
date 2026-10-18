/** @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageSettings } from "./language-settings";
import { ProviderSettings } from "./provider-settings";
import { TranslationBehaviorSettings } from "./translation-behavior-settings";

const detector = vi.hoisted(() =>
  vi.fn(() => ({ availability: "available", isChecking: false }))
);
vi.mock("@/shared/hooks/use-language-detector-availability", () => ({
  useLanguageDetectorAvailability: detector,
}));
vi.mock("./exclusion-settings", () => ({ ExclusionSettings: () => null }));
let root: Root;
let container: HTMLElement;
let settings: Record<string, unknown>;
let listeners: Set<(changes: unknown, area: string) => void>;
const storageKey = "flash-translate-settings";

beforeEach(() => {
  settings = {
    autoZhEn: true,
    sourceLanguage: "fr",
    targetLanguage: "ja",
    autoDetectLanguage: true,
    skipSameLanguage: true,
    defaultTranslationProvider: "custom-ai",
    aiSystemPrompt: "Keep this prompt",
    aiContextSentenceCount: 2,
    aiThinkingEnabled: true,
    aiReasoningEffort: "max",
  };
  listeners = new Set();
  vi.stubGlobal("chrome", {
    runtime: { id: "test" },
    i18n: { getUILanguage: () => "zh-CN", getMessage: (key: string) => key },
    storage: {
      sync: {
        get: async () => ({ [storageKey]: settings }),
        set: (value: Record<string, Record<string, unknown>>) => {
          settings = value[storageKey];
          for (const listener of listeners) {
            listener({ [storageKey]: { newValue: settings } }, "sync");
          }
          return Promise.resolve();
        },
      },
      local: { get: async () => ({}) },
      onChanged: {
        addListener: (listener: (changes: unknown, area: string) => void) =>
          listeners.add(listener),
        removeListener: (listener: (changes: unknown, area: string) => void) =>
          listeners.delete(listener),
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
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function button(label: string): HTMLButtonElement {
  const result = container.querySelector<HTMLButtonElement>(
    `[aria-label="${label}"]`
  );
  if (!result) {
    throw new Error(label);
  }
  return result;
}

describe("unified settings", () => {
  it("temporarily disables conflicting controls, then restores manual preferences live", async () => {
    await act(async () =>
      root.render(
        <>
          <LanguageSettings />
          <TranslationBehaviorSettings />
        </>
      )
    );
    expect(button("popup_behavior_autoDetectLanguage").disabled).toBe(true);
    expect(button("popup_behavior_skipSameLanguage").disabled).toBe(true);
    expect(
      button("popup_behavior_skipSameLanguage").getAttribute("aria-checked")
    ).toBe("false");
    expect(container.querySelector("#sourceLanguage")).toBeNull();
    expect(detector).toHaveBeenLastCalledWith({ enabled: false });
    await act(async () => button("自动中英互译").click());
    expect(
      container.querySelector<HTMLSelectElement>("#sourceLanguage")?.value
    ).toBe("fr");
    expect(
      container.querySelector<HTMLSelectElement>("#targetLanguage")?.value
    ).toBe("ja");
    expect(button("popup_behavior_autoDetectLanguage").disabled).toBe(false);
    expect(button("popup_behavior_skipSameLanguage").disabled).toBe(true);
    expect(settings.skipSameLanguage).toBe(true);
    await act(async () => button("popup_behavior_autoDetectLanguage").click());
    expect(button("popup_behavior_skipSameLanguage").disabled).toBe(false);
    expect(
      button("popup_behavior_skipSameLanguage").getAttribute("aria-checked")
    ).toBe("true");
    expect(listeners.size).toBe(2);
    await act(async () => root.unmount());
    expect(listeners.size).toBe(0);
    root = createRoot(container);
  });
  it("keeps context visible and prompt/thinking inside advanced AI controls without losing values", async () => {
    await act(async () => root.render(<ProviderSettings />));
    expect(
      container
        .querySelector("#ai-context-sentence-count")
        ?.closest("details details")
    ).toBeNull();
    expect(
      container.querySelector<HTMLTextAreaElement>("#ai-system-prompt")?.value
    ).toBe("Keep this prompt");
    expect(
      container
        .querySelector("#ai-system-prompt")
        ?.closest("details details")
        ?.querySelector("summary")?.textContent
    ).toBe("高级设置");
    expect(
      container.querySelector<HTMLSelectElement>("#ai-reasoning-effort")?.value
    ).toBe("max");
  });
});
