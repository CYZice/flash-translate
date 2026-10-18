import { describe, expect, it, vi } from "vitest";
import {
  buildTranslationHttpRequest,
  getTranslationRequestOptions,
  parseOpenAiSseChunk,
  streamOpenAiTranslation,
} from "./openai-compatible";

describe("shared translation request", () => {
  const input = {
    text: "你好",
    sourceLanguage: "zh",
    targetLanguage: "en",
    contextBefore: "之前。",
    contextAfter: "之后。",
  };
  const config = {
    baseUrl: "https://provider.example/v1",
    model: "custom-model",
    systemPrompt: "Translate accurately.",
  };

  it("shares the exact request format while allowing stream and JSON transports", () => {
    const streaming = buildTranslationHttpRequest(
      input,
      config,
      "test-key",
      true
    );
    const json = buildTranslationHttpRequest(input, config, "test-key", false);
    expect(streaming.url).toBe("https://provider.example/v1/chat/completions");
    expect(streaming.headers.Accept).toBe("text/event-stream");
    expect(json.headers.Accept).toBe("application/json");
    expect(JSON.parse(streaming.body)).toMatchObject({
      stream: true,
      model: "custom-model",
    });
    expect(JSON.parse(json.body)).toMatchObject({ stream: false });
    expect(JSON.parse(JSON.parse(json.body).messages[1].content)).toMatchObject(
      { selectedText: "你好", contextBefore: "之前。", contextAfter: "之后。" }
    );
  });

  it("preserves Chrome extension streaming after extracting the shared core", async () => {
    const response = new Response(
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":"lo"}}]}\n\ndata: [DONE]\n'
    );
    const fetchImpl = vi.fn().mockResolvedValue(response);
    const signal = new AbortController().signal;
    const parts: string[] = [];
    for await (const part of streamOpenAiTranslation(
      input,
      config,
      "",
      signal,
      fetchImpl
    )) {
      parts.push(part);
    }
    expect(parts.join("")).toBe("Hello");
    expect(fetchImpl.mock.calls[0][1].signal).toBe(signal);
  });

  it("reads final usage-only chunks and requests usage only on the known official endpoint", async () => {
    const usage = vi.fn();
    const onRequest = vi.fn();
    const fetchImpl = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(
            'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":"stop"}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":10,"completion_tokens":2,"total_tokens":12}}\n\ndata: [DONE]\n'
          )
        )
      );
    for await (const _ of streamOpenAiTranslation(
      input,
      { ...config, baseUrl: "https://api.openai.com/v1" },
      "",
      new AbortController().signal,
      fetchImpl,
      { onRequest, onUsage: usage }
    )) {
      /* consume */
    }
    expect(usage).toHaveBeenCalledWith({
      inputTokens: 10,
      outputTokens: 2,
      totalTokens: 12,
    });
    expect(onRequest).toHaveBeenCalledOnce();
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).stream_options).toEqual({
      include_usage: true,
    });
    for await (const _ of streamOpenAiTranslation(
      input,
      config,
      "",
      new AbortController().signal,
      fetchImpl,
      { onUsage: usage }
    )) {
      /* consume */
    }
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).not.toHaveProperty(
      "stream_options"
    );
  });

  it("does not count a request cancelled before HTTP starts", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn();
    const onRequest = vi.fn();
    await expect(
      (async () => {
        for await (const _ of streamOpenAiTranslation(
          input,
          config,
          "",
          controller.signal,
          fetchImpl,
          { onRequest }
        )) {
          /* consume */
        }
      })()
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(onRequest).not.toHaveBeenCalled();
  });
});

describe("parseOpenAiSseChunk", () => {
  it("reads streamed chat completion content", () => {
    const data = JSON.stringify({
      choices: [{ delta: { content: "传播" } }],
    });
    expect(parseOpenAiSseChunk(data)).toBe("传播");
  });

  it("supports compatible providers that stream choice.text", () => {
    const data = JSON.stringify({ choices: [{ text: "constant" }] });
    expect(parseOpenAiSseChunk(data)).toBe("constant");
  });

  it("returns null for done markers and empty deltas", () => {
    expect(parseOpenAiSseChunk("[DONE]")).toBeNull();
    expect(parseOpenAiSseChunk(JSON.stringify({ choices: [{}] }))).toBeNull();
  });

  it("surfaces provider errors", () => {
    const data = JSON.stringify({ error: { message: "bad key" } });
    expect(() => parseOpenAiSseChunk(data)).toThrow("bad key");
  });
});

describe("getTranslationRequestOptions", () => {
  it("disables reasoning for GPT-5 translation requests", () => {
    expect(getTranslationRequestOptions("gpt-5.6")).toEqual({
      reasoning_effort: "none",
    });
    expect(getTranslationRequestOptions("GPT-5-mini")).toEqual({
      reasoning_effort: "none",
    });
  });

  it("omits provider-specific reasoning options for other models", () => {
    expect(getTranslationRequestOptions("qwen2.5-7b-instruct")).toEqual({});
    expect(getTranslationRequestOptions("gpt-4o")).toEqual({});
  });

  it("disables thinking for DeepSeek Chat Completions requests", () => {
    expect(getTranslationRequestOptions("deepseek-chat")).toEqual({
      thinking: { type: "disabled" },
    });
    expect(getTranslationRequestOptions("deepseek-v4-flash")).toEqual({
      thinking: { type: "disabled" },
    });
  });

  it("sends DeepSeek thinking and effort when enabled", () => {
    expect(
      getTranslationRequestOptions("deepseek-v4-flash", true, "low")
    ).toEqual({
      thinking: { type: "enabled" },
      reasoning_effort: "low",
    });
  });
});
