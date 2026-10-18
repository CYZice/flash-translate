/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./app";

const host = vi.hoisted(() => ({
  settings: {
    autoZhEn: true,
    autoDetectLanguage: true,
    sourceLanguage: "en",
    targetLanguage: "fr",
    aiBaseUrl: "http://localhost",
    aiModel: "test",
  },
  save: vi.fn(),
  translations: new Map<string, ReturnType<typeof vi.fn>>(),
}));
vi.mock("@/shared/hooks/use-settings", () => ({
  useSettings: () => [host.settings, false],
}));
vi.mock("@/shared/storage/settings", () => ({ saveSettings: host.save }));
vi.mock("@/content/hooks/use-language-detection", () => ({
  useLanguageDetection: () => ({
    effectiveSourceLanguage: "en",
    isDetecting: false,
  }),
}));
vi.mock("@/content/hooks/use-translator", () => ({
  useTranslator: (options: {
    provider: string;
    sourceLanguage: string;
    targetLanguage: string;
  }) => {
    const key = `${options.provider}:${options.sourceLanguage}:${options.targetLanguage}`;
    if (!host.translations.has(key)) {
      host.translations.set(key, vi.fn());
    }
    return {
      translate: host.translations.get(key),
      result: "Result",
      isLoading: false,
      availability: "available",
      error: null,
    };
  },
}));
afterEach(() => {
  vi.unstubAllGlobals();
  host.translations.clear();
  host.save.mockClear();
  document.body.replaceChildren();
});

describe("quick translation bilingual routing", () => {
  it("routes both providers, updates an active AI result, and preserves the source on manual target override", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const key = "flash-translate:quick-translation:1";
    let request = {
      requestId: "one",
      text: "Hello",
      source: "context-menu",
      tabId: 1,
      windowId: 1,
      createdAt: Date.now(),
    };
    let changed: (changes: Record<string, unknown>, area: string) => void =
      () => undefined;
    vi.stubGlobal("chrome", {
      windows: {
        getCurrent: (callback: (window: { id: number }) => void) =>
          callback({ id: 1 }),
      },
      storage: {
        session: {
          get: (
            _key: string,
            callback: (values: Record<string, unknown>) => void
          ) => callback({ [key]: request }),
        },
        onChanged: {
          addListener: (listener: typeof changed) => {
            changed = listener;
          },
          removeListener: vi.fn(),
        },
      },
      i18n: { getMessage: (message: string) => message },
    });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(<App />);
        await Promise.resolve();
      });
      expect(
        host.translations.get("chrome-built-in:en:zh")
      ).toHaveBeenCalledWith("Hello");
      act(() => {
        container
          .querySelector<HTMLButtonElement>(
            '[aria-label="content_switchTranslationProvider"]'
          )
          ?.click();
      });
      expect(host.translations.get("custom-ai:en:zh")).toHaveBeenCalledWith(
        "Hello",
        { contextBefore: "", contextAfter: "" }
      );
      act(() => {
        request = { ...request, requestId: "two", text: "你好" };
        changed({ [key]: {} }, "session");
      });
      expect(host.translations.get("custom-ai:zh:en")).toHaveBeenCalledWith(
        "你好",
        { contextBefore: "", contextAfter: "" }
      );
      const target = container.querySelectorAll("select")[1];
      act(() => {
        target.value = "fr";
        target.dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(host.save).toHaveBeenCalledWith({
        targetLanguage: "fr",
        sourceLanguage: "zh",
        autoZhEn: false,
      });
    } finally {
      act(() => root.unmount());
    }
  });
});
