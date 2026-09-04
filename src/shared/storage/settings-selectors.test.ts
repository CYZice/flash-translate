import { describe, expect, it } from "vitest";
import type { TranslationSettings } from "./settings";
import {
  selectContentAppSettings,
  selectExclusionPatterns,
  selectLanguageSettings,
  selectSkipSameLanguage,
  selectSourceLanguage,
  selectTargetLanguage,
} from "./settings-selectors";

const mockSettings: TranslationSettings = {
  targetLanguage: "ja",
  sourceLanguage: "en",
  skipSameLanguage: true,
  autoDetectLanguage: true,
  editorInputAssistEnabled: false,
  exclusionPatterns: [
    { id: "1", pattern: "https://example.com", enabled: true },
    { id: "2", pattern: "https://test.com", enabled: false },
  ],
  aiBaseUrl: "",
  aiModel: "",
  aiSystemPrompt: "",
  aiContextSentenceCount: 1,
  aiThinkingEnabled: false,
  aiReasoningEffort: "high",
};

describe("selectTargetLanguage", () => {
  it("returns targetLanguage from settings", () => {
    expect(selectTargetLanguage(mockSettings)).toBe("ja");
  });

  it("returns different value when settings change", () => {
    const settings = { ...mockSettings, targetLanguage: "zh" };
    expect(selectTargetLanguage(settings)).toBe("zh");
  });
});
describe("selectSourceLanguage", () => {
  it("returns sourceLanguage from settings", () => {
    expect(selectSourceLanguage(mockSettings)).toBe("en");
  });

  it("returns different value when settings change", () => {
    const settings = { ...mockSettings, sourceLanguage: "fr" };
    expect(selectSourceLanguage(settings)).toBe("fr");
  });
});

describe("selectSkipSameLanguage", () => {
  it("returns skipSameLanguage from settings", () => {
    expect(selectSkipSameLanguage(mockSettings)).toBe(true);
  });

  it("returns false when disabled", () => {
    const settings = { ...mockSettings, skipSameLanguage: false };
    expect(selectSkipSameLanguage(settings)).toBe(false);
  });
});

describe("selectExclusionPatterns", () => {
  it("returns exclusionPatterns from settings", () => {
    const patterns = selectExclusionPatterns(mockSettings);
    expect(patterns).toHaveLength(2);
    expect(patterns[0].pattern).toBe("https://example.com");
  });

  it("returns empty array when no patterns", () => {
    const settings = { ...mockSettings, exclusionPatterns: [] };
    expect(selectExclusionPatterns(settings)).toEqual([]);
  });
});

describe("selectContentAppSettings", () => {
  it("returns combined settings for content app", () => {
    const result = selectContentAppSettings(mockSettings);
    expect(result).toEqual({
      sourceLanguage: "en",
      targetLanguage: "ja",
      skipSameLanguage: true,
      autoDetectLanguage: true,
      editorInputAssistEnabled: false,
      exclusionPatterns: mockSettings.exclusionPatterns,
      aiBaseUrl: "",
      aiModel: "",
      aiContextSentenceCount: 1,
    });
  });

  it("includes all required fields for content app", () => {
    const result = selectContentAppSettings(mockSettings);
    expect(result).toHaveProperty("sourceLanguage");
    expect(result).toHaveProperty("targetLanguage");
    expect(result).toHaveProperty("skipSameLanguage");
    expect(result).toHaveProperty("autoDetectLanguage");
    expect(result).toHaveProperty("exclusionPatterns");
    expect(result).toHaveProperty("aiContextSentenceCount");
  });
});

describe("selectLanguageSettings", () => {
  it("returns source and target language", () => {
    const result = selectLanguageSettings(mockSettings);
    expect(result).toEqual({
      sourceLanguage: "en",
      targetLanguage: "ja",
    });
  });

  it("does not include other settings", () => {
    const result = selectLanguageSettings(mockSettings);
    expect(result).not.toHaveProperty("skipSameLanguage");
    expect(result).not.toHaveProperty("exclusionPatterns");
  });
});
