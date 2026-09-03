import { describe, expect, it } from "vitest";
import {
  buildChatCompletionsUrl,
  buildModelsUrl,
  getAiHostPermissionPattern,
} from "./ai-endpoint";

describe("AI endpoint utilities", () => {
  it("builds OpenAI-compatible endpoints from a v1 base URL", () => {
    expect(buildChatCompletionsUrl("https://example.com/v1")).toBe(
      "https://example.com/v1/chat/completions"
    );
    expect(buildModelsUrl("https://example.com/v1")).toBe(
      "https://example.com/v1/models"
    );
  });

  it("accepts a full chat completions URL", () => {
    expect(
      buildChatCompletionsUrl("https://example.com/v1/chat/completions")
    ).toBe("https://example.com/v1/chat/completions");
    expect(buildModelsUrl("https://example.com/v1/chat/completions")).toBe(
      "https://example.com/v1/models"
    );
  });

  it("builds a host permission pattern without exposing a path or port", () => {
    expect(getAiHostPermissionPattern("http://localhost:11434/v1")).toBe(
      "http://localhost/*"
    );
  });

  it("rejects non-http protocols", () => {
    expect(() => buildChatCompletionsUrl("file:///tmp/v1")).toThrow(
      "Base URL must use http:// or https://"
    );
  });
});
