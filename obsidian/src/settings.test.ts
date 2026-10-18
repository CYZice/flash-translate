import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";

describe("Obsidian settings boundary", () => {
  it("validates automatic Chinese/English mode without changing manual defaults", () => {
    expect(normalizeSettings({ autoZhEn: "true" }).autoZhEn).toBe(false);
    expect(normalizeSettings({ autoZhEn: true })).toMatchObject({
      autoZhEn: true,
      sourceLanguage: "auto",
      targetLanguage: "en",
    });
  });
  it("validates the automatic selection trigger", () => {
    expect(
      normalizeSettings({ selectionTrigger: "invalid" }).selectionTrigger
    ).toBe("badge");
    for (const selectionTrigger of ["badge", "immediate", "off"]) {
      expect(normalizeSettings({ selectionTrigger }).selectionTrigger).toBe(
        selectionTrigger
      );
    }
  });
  it.each([null, undefined, [], "invalid"])(
    "uses defaults for invalid storage",
    (input) => {
      expect(normalizeSettings(input)).toEqual(DEFAULT_SETTINGS);
    }
  );

  it("validates languages and context limits", () => {
    expect(
      normalizeSettings({
        sourceLanguage: "unknown",
        targetLanguage: "auto",
        contextSentenceCount: 500,
      })
    ).toMatchObject({
      sourceLanguage: "auto",
      targetLanguage: "en",
      contextSentenceCount: 3,
    });
  });

  it("stores only a secret reference, never an accidentally supplied raw key", () => {
    const settings = normalizeSettings({
      apiKeySecret: " my-translation-key ",
      apiKey: "not-a-real-key",
      baseUrl: " http://localhost:1234/v1 ",
      model: " local-model ",
    });
    expect(settings.apiKeySecret).toBe("my-translation-key");
    expect(settings).not.toHaveProperty("apiKey");
    expect(settings.baseUrl).toBe("http://localhost:1234/v1");
    expect(settings.model).toBe("local-model");
  });
});
