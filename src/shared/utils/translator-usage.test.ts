import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { translatorManager } from "./translator";

const sent = vi.fn();
const streaming = vi.fn();
let release: () => void;
beforeEach(() => {
  sent.mockReset().mockResolvedValue({ ok: true });
  streaming.mockReset().mockImplementation(
    () =>
      new ReadableStream<string>({
        start(controller) {
          controller.enqueue("Translation");
          controller.close();
        },
      })
  );
  vi.stubGlobal("chrome", { runtime: { sendMessage: sent } });
  vi.stubGlobal("Translator", {
    availability: async () => "available",
    create: async () => ({
      translateStreaming: streaming,
      translate: async () => "Translation",
      destroy: vi.fn(),
    }),
  });
  release = translatorManager.retain("en", "zh");
});
afterEach(() => {
  release();
  translatorManager.destroy();
  vi.unstubAllGlobals();
});
async function consume(signal?: AbortSignal): Promise<void> {
  for await (const _ of translatorManager.translateStreaming(
    "First.\n\nSecond.",
    "en",
    "zh",
    signal
  )) {
    /* consume */
  }
}
describe("native translation completion statistics", () => {
  it("counts a completed multi-paragraph translation once, not once per paragraph", async () => {
    await consume();
    expect(streaming).toHaveBeenCalledTimes(2);
    expect(sent).toHaveBeenCalledOnce();
  });
  it("does not count an empty stream as a completed translation", async () => {
    streaming.mockImplementation(
      () =>
        new ReadableStream<string>({
          start(controller) {
            controller.close();
          },
        })
    );
    await consume();
    expect(sent).not.toHaveBeenCalled();
  });
  it("does not count a request cancelled before streaming", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(consume(controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(sent).not.toHaveBeenCalled();
    expect(streaming).not.toHaveBeenCalled();
  });
  it("does not count a failed stream as a completed translation", async () => {
    streaming.mockImplementation(
      () =>
        new ReadableStream<string>({
          start(controller) {
            controller.error(new Error("Translation failed"));
          },
        })
    );
    await expect(consume()).rejects.toThrow("Translation failed");
    expect(sent).not.toHaveBeenCalled();
  });
});
