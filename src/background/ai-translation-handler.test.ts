import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_TRANSLATION_PORT_NAME } from "@/shared/constants/ai-translation";
import { registerAiTranslationPortHandler } from "./ai-translation-handler";

const host = vi.hoisted(() => ({ settings: vi.fn(), record: vi.fn() }));
vi.mock("@/shared/storage/settings", () => ({ getSettings: host.settings }));
vi.mock("@/shared/storage/ai-api-key", () => ({ getAiApiKey: async () => "" }));
vi.mock("./usage-store", () => ({ recordUsage: host.record }));
let message: (value: unknown) => void;
let disconnect: () => void;
let post: ReturnType<typeof vi.fn>;
const settings = {
  aiBaseUrl: "https://provider.example/v1",
  aiModel: "test",
  aiSystemPrompt: "Translate",
};
const input = {
  type: "start",
  text: "Hello",
  sourceLanguage: "en",
  targetLanguage: "zh",
  contextBefore: "",
  contextAfter: "",
};

beforeEach(() => {
  host.settings.mockReset().mockResolvedValue(settings);
  host.record.mockReset().mockResolvedValue(undefined);
  post = vi.fn();
  vi.stubGlobal("chrome", {
    runtime: {
      onConnect: {
        addListener: (connect: (port: unknown) => void) =>
          connect({
            name: AI_TRANSLATION_PORT_NAME,
            postMessage: post,
            onMessage: {
              addListener: (fn: typeof message) => {
                message = fn;
              },
            },
            onDisconnect: {
              addListener: (fn: typeof disconnect) => {
                disconnect = fn;
              },
            },
          }),
      },
    },
    permissions: { contains: async () => true },
  });
  registerAiTranslationPortHandler();
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe("AI usage at the real request boundary", () => {
  it("counts one request and final usage despite duplicate cumulative usage chunks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            'data: {"choices":[{"delta":{"content":"你好"}}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":10,"completion_tokens":2,"total_tokens":12}}\n\ndata: {"choices":[],"usage":{"prompt_tokens":10,"completion_tokens":2,"total_tokens":12}}\n\ndata: [DONE]\n'
          )
      )
    );
    message(input);
    await vi.waitFor(() =>
      expect(host.record).toHaveBeenLastCalledWith({
        type: "ai-finished",
        usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 },
        completed: true,
      })
    );
    expect(host.record).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenLastCalledWith({ type: "done" });
  });
  it("does not send or count a request disconnected while settings were loading", async () => {
    let finish: (value: typeof settings) => void = () => undefined;
    host.settings.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    message(input);
    disconnect();
    finish(settings);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(host.record).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
  it("records an interrupted stream as a request with unknown usage, not a completed translation", async () => {
    const fetchImpl = vi.fn((_url: string, options: RequestInit) =>
      Promise.resolve(
        new Response(
          new ReadableStream({
            start(controller) {
              options.signal?.addEventListener(
                "abort",
                () =>
                  controller.error(new DOMException("Cancelled", "AbortError")),
                { once: true }
              );
              controller.enqueue(
                new TextEncoder().encode(
                  'data: {"choices":[{"delta":{"content":"半"}}]}\n\n'
                )
              );
            },
          })
        )
      )
    );
    vi.stubGlobal("fetch", fetchImpl);
    message(input);
    await vi.waitFor(() =>
      expect(post).toHaveBeenCalledWith({ type: "chunk", result: "半" })
    );
    disconnect();
    await vi.waitFor(() =>
      expect(host.record).toHaveBeenLastCalledWith({
        type: "ai-finished",
        usage: null,
        completed: false,
      })
    );
    expect(host.record).toHaveBeenCalledTimes(2);
  });
});
