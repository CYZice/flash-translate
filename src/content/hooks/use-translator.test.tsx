/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTranslator } from "./use-translator";

interface Capture {
  result: string;
  isLoading: boolean;
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
  onCapture(translator);
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
  vi.unstubAllGlobals();
});

describe("useTranslator", () => {
  it("clears a completed result on reset and destroys the session on reset/unmount", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const destroy = vi.fn();
    const create = vi.fn().mockImplementation(async () => ({
      destroy,
      translateStreaming: () =>
        new ReadableStream<string>({
          start(controller) {
            controller.enqueue("Bonjour");
            controller.close();
          },
        }),
    }));
    vi.stubGlobal("Translator", {
      availability: async () => "available",
      create,
    });
    let current!: Capture;
    render((value) => {
      current = value;
    });
    await act(async () => {
      await current.translate("Hello");
    });
    expect(current.result).toBe("Bonjour");
    expect(destroy).not.toHaveBeenCalled();
    act(() => current.reset());
    expect(current.result).toBe("");
    expect(current.isLoading).toBe(false);
    expect(destroy).toHaveBeenCalledTimes(1);
    await act(async () => {
      await current.translate("Again");
    });
    act(() => root?.unmount());
    root = null;
    expect(create).toHaveBeenCalledTimes(2);
    expect(destroy).toHaveBeenCalledTimes(2);
  });

  it("ignores a stream completing after reset", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    let stream!: ReadableStreamDefaultController<string>;
    const destroy = vi.fn();
    vi.stubGlobal("Translator", {
      availability: async () => "available",
      create: async () => ({
        destroy,
        translateStreaming: () =>
          new ReadableStream<string>({
            start(controller) {
              stream = controller;
            },
          }),
      }),
    });
    let current!: Capture;
    render((value) => {
      current = value;
    });
    let pending!: Promise<void>;
    await act(async () => {
      pending = current.translate("Hello");
      await Promise.resolve();
    });
    act(() => current.reset());
    await act(async () => {
      stream.enqueue("Late translation");
      stream.close();
      await pending;
    });
    expect(current.result).toBe("");
    expect(current.isLoading).toBe(false);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

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
