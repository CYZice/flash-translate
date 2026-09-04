import { describe, expect, it } from "vitest";
import {
  getTranslationRequestOptions,
  parseOpenAiSseChunk,
} from "./openai-compatible";

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
