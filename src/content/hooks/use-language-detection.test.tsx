/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { languageDetectorManager } from "@/shared/utils/language-detector";
import {
  type UseLanguageDetectionResult,
  useLanguageDetection,
} from "./use-language-detection";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("explicit source-language overrides", () => {
  it("cancels detection and does not start it again while a manual source is selected", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.spyOn(languageDetectorManager, "checkAvailability").mockResolvedValue(
      "available"
    );
    const release = vi.fn();
    vi.spyOn(languageDetectorManager, "retain").mockReturnValue(release);
    let finish!: (value: {
      detectedLanguage: string;
      confidence: number;
    }) => void;
    const detect = vi
      .spyOn(languageDetectorManager, "detect")
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      );
    let current!: UseLanguageDetectionResult;
    function Harness() {
      current = useLanguageDetection({
        text: "Hello world",
        enabled: true,
        fallbackLanguage: "en",
      });
      return null;
    }
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => {
        root.render(<Harness />);
        await Promise.resolve();
      });
      expect(current.isDetecting).toBe(true);
      act(() => current.setOverriddenLanguage("zh"));
      expect(current.isDetecting).toBe(false);
      expect(current.effectiveSourceLanguage).toBe("zh");
      expect(detect.mock.calls[0][1]?.aborted).toBe(true);
      expect(release).toHaveBeenCalledOnce();
      await act(async () => {
        finish({ detectedLanguage: "en", confidence: 1 });
        await Promise.resolve();
      });
      expect(detect).toHaveBeenCalledOnce();
      expect(current.effectiveSourceLanguage).toBe("zh");
    } finally {
      act(() => root.unmount());
    }
  });
});
