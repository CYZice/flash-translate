import { describe, expect, it, vi } from "vitest";
import {
  executeStreamingTranslation,
  type TranslationFunctions,
} from "./translator-executor";

function createMockTranslator(
  overrides: Partial<TranslationFunctions> = {}
): TranslationFunctions {
  return {
    // biome-ignore lint/suspicious/useAwait: AsyncIterable requires async generator
    translateStreaming: vi.fn().mockImplementation(async function* () {
      yield "chunk1";
      yield "chunk1 chunk2";
    }),
    ...overrides,
  };
}

function createAbortController(aborted = false): AbortController {
  const controller = new AbortController();
  if (aborted) {
    controller.abort();
  }
  return controller;
}

describe("executeStreamingTranslation", () => {
  const baseOptions = {
    text: "hello",
    sourceLanguage: "en",
    targetLanguage: "ja",
  };

  it("returns success with final result after streaming", async () => {
    const translator = createMockTranslator();
    const onChunk = vi.fn();
    const controller = createAbortController();

    const result = await executeStreamingTranslation(
      { ...baseOptions, signal: controller.signal },
      translator,
      { onChunk }
    );

    expect(result).toEqual({ type: "success", result: "chunk1 chunk2" });
    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk).toHaveBeenNthCalledWith(1, "chunk1");
    expect(onChunk).toHaveBeenNthCalledWith(2, "chunk1 chunk2");
    expect(translator.translateStreaming).toHaveBeenCalledWith(
      "hello",
      "en",
      "ja",
      controller.signal
    );
  });

  it("returns aborted when signal is already aborted", async () => {
    const translator = createMockTranslator({
      // biome-ignore lint/suspicious/useAwait: AsyncIterable requires async generator
      async *translateStreaming() {
        yield "chunk1";
      },
    });
    const onChunk = vi.fn();
    const controller = createAbortController(true);

    const result = await executeStreamingTranslation(
      { ...baseOptions, signal: controller.signal },
      translator,
      { onChunk }
    );

    expect(result).toEqual({ type: "aborted" });
  });

  it("returns aborted when signal is aborted during streaming", async () => {
    const controller = createAbortController();
    const translator = createMockTranslator({
      // biome-ignore lint/suspicious/useAwait: AsyncIterable requires async generator
      async *translateStreaming() {
        yield "chunk1";
        controller.abort();
        yield "chunk2";
      },
    });
    const onChunk = vi.fn();

    const result = await executeStreamingTranslation(
      { ...baseOptions, signal: controller.signal },
      translator,
      { onChunk }
    );

    expect(result).toEqual({ type: "aborted" });
    expect(onChunk).toHaveBeenCalledTimes(1);
  });

  it("returns error when translation throws", async () => {
    const translator = createMockTranslator({
      // biome-ignore lint/suspicious/useAwait lint/correctness/useYield: Test mock for error case
      async *translateStreaming() {
        throw new Error("Translation failed");
      },
    });
    const onChunk = vi.fn();
    const controller = createAbortController();

    const result = await executeStreamingTranslation(
      { ...baseOptions, signal: controller.signal },
      translator,
      { onChunk }
    );

    expect(result.type).toBe("error");
    if (result.type === "error") {
      expect(result.error.message).toBe("Translation failed");
    }
  });

  it("returns aborted when AbortError is thrown", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    const translator = createMockTranslator({
      // biome-ignore lint/suspicious/useAwait lint/correctness/useYield: Test mock for abort case
      async *translateStreaming() {
        throw abortError;
      },
    });
    const onChunk = vi.fn();
    const controller = createAbortController();

    const result = await executeStreamingTranslation(
      { ...baseOptions, signal: controller.signal },
      translator,
      { onChunk }
    );

    expect(result).toEqual({ type: "aborted" });
  });
});
