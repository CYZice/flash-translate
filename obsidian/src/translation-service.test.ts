import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "./settings";
import { translateNoteSelection } from "./translation-service";

const input = {
  text: "你好",
  sourceLanguage: "auto",
  targetLanguage: "en",
  contextBefore: "",
  contextAfter: "",
};
const settings = {
  ...DEFAULT_SETTINGS,
  baseUrl: "http://localhost:1234/v1",
  model: "my-custom-model",
};

describe("Obsidian translation transport", () => {
  it("sends the same supported thinking options as the browser", async () => {
    const request = vi.fn().mockResolvedValue({
      status: 200,
      body: { choices: [{ message: { content: "Hello" } }] },
    });
    await translateNoteSelection(
      input,
      {
        ...settings,
        model: "deepseek-chat",
        thinkingEnabled: true,
        reasoningEffort: "max",
      },
      "",
      request
    );
    expect(JSON.parse(request.mock.calls[0][0].body)).toMatchObject({
      thinking: { type: "enabled" },
      reasoning_effort: "max",
    });
  });
  it("uses the shared model request and returns a translation", async () => {
    const request = vi.fn().mockResolvedValue({
      status: 200,
      body: { choices: [{ message: { content: "Hello" } }] },
    });
    expect(
      await translateNoteSelection(input, settings, "test-key", request)
    ).toBe("Hello");
    const sent = request.mock.calls[0][0];
    expect(sent.url).toBe("http://localhost:1234/v1/chat/completions");
    expect(sent.headers.Authorization).toBe("Bearer test-key");
    expect(JSON.parse(sent.body)).toMatchObject({
      model: "my-custom-model",
      stream: false,
    });
    expect(JSON.parse(JSON.parse(sent.body).messages[1].content)).toMatchObject(
      {
        selectedText: "你好",
        sourceLanguage: "auto",
        targetLanguage: "English",
      }
    );
  });

  it("allows local providers without an API key", async () => {
    const request = vi.fn().mockResolvedValue({
      status: 200,
      body: { choices: [{ message: { content: "Hello" } }] },
    });
    await translateNoteSelection(input, settings, "", request);
    expect(request.mock.calls[0][0].headers).not.toHaveProperty(
      "Authorization"
    );
  });

  it("reports HTTP errors without displaying the raw response", async () => {
    const request = vi.fn().mockResolvedValue({
      status: 401,
      body: null,
    });
    await expect(
      translateNoteSelection(input, settings, "", request)
    ).rejects.toThrow("HTTP 401");
  });

  it.each([null, { choices: [] }, { choices: [{ message: { content: "" } }] }])(
    "rejects invalid or empty output",
    async (body) => {
      const request = vi.fn().mockResolvedValue({ status: 200, body });
      await expect(
        translateNoteSelection(input, settings, "", request)
      ).rejects.toThrow();
    }
  );

  it("does not make a request with an invalid endpoint or missing model", async () => {
    const request = vi.fn();
    await expect(
      translateNoteSelection(
        input,
        { ...settings, baseUrl: "file:///private" },
        "",
        request
      )
    ).rejects.toThrow("http");
    await expect(
      translateNoteSelection(input, { ...settings, model: "" }, "", request)
    ).rejects.toThrow("model");
    expect(request).not.toHaveBeenCalled();
  });
});
