/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { useTranslator } from "./use-translator";

interface Capture {
  reset: () => void;
  translate: (text: string) => Promise<void>;
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function Harness({
  onCapture,
  sourceLanguage,
  targetLanguage,
}: {
  onCapture: (capture: Capture) => void;
  sourceLanguage: string;
  targetLanguage: string;
}) {
  const translator = useTranslator({
    provider: "chrome-built-in",
    sourceLanguage,
    targetLanguage,
  });
  onCapture({ reset: translator.reset, translate: translator.translate });
  return null;
}

function render(
  onCapture: (capture: Capture) => void,
  sourceLanguage = "zh",
  targetLanguage = "en"
): void {
  if (!host) {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  }
  act(() => {
    root?.render(
      <Harness
        onCapture={onCapture}
        sourceLanguage={sourceLanguage}
        targetLanguage={targetLanguage}
      />
    );
  });
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  host?.remove();
  host = null;
  root = null;
});

describe("useTranslator", () => {
  it("keeps commands stable across state updates and changes only translate for a new language pair", () => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const captures: Capture[] = [];
    const capture = (value: Capture) => {
      captures.push(value);
    };

    render(capture);
    const initial = captures.at(-1);
    if (!initial) {
      throw new Error("Expected useTranslator to render");
    }

    act(() => {
      initial?.reset();
    });
    const afterStateUpdate = captures.at(-1);
    expect(afterStateUpdate?.translate).toBe(initial.translate);
    expect(afterStateUpdate?.reset).toBe(initial.reset);

    render(capture, "en", "zh");
    const afterLanguageChange = captures.at(-1);
    expect(afterLanguageChange?.translate).not.toBe(initial.translate);
    expect(afterLanguageChange?.reset).toBe(initial.reset);
  });
});
