import { describe, expect, it } from "vitest";
import {
  computeEffectiveSourceLanguage,
  containsHighDensityScript,
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_MIN_TEXT_LENGTH,
  getMinTextLengthForDetection,
  HIGH_DENSITY_MIN_TEXT_LENGTH,
  isTextSufficientForDetection,
  mapDetectorAvailability,
  normalizeDetectedLanguage,
  selectBestLanguage,
  shouldSkipDetection,
} from "./language-detector-utils";

describe("mapDetectorAvailability", () => {
  it("maps 'available' to 'available'", () => {
    expect(mapDetectorAvailability("available")).toBe("available");
  });

  it("maps 'downloadable' to 'after-download'", () => {
    expect(mapDetectorAvailability("downloadable")).toBe("after-download");
  });

  it("maps 'downloading' to 'after-download'", () => {
    expect(mapDetectorAvailability("downloading")).toBe("after-download");
  });

  it("maps 'unavailable' to 'unavailable'", () => {
    expect(mapDetectorAvailability("unavailable")).toBe("unavailable");
  });
});

describe("selectBestLanguage", () => {
  it("returns null for empty results", () => {
    expect(selectBestLanguage([])).toEqual({
      detectedLanguage: null,
      confidence: 0,
    });
  });

  it("returns the only result when single item", () => {
    const results = [{ detectedLanguage: "en", confidence: 0.95 }];
    expect(selectBestLanguage(results)).toEqual({
      detectedLanguage: "en",
      confidence: 0.95,
    });
  });

  it("returns highest confidence language", () => {
    const results = [
      { detectedLanguage: "en", confidence: 0.3 },
      { detectedLanguage: "ja", confidence: 0.9 },
      { detectedLanguage: "zh", confidence: 0.5 },
    ];
    expect(selectBestLanguage(results)).toEqual({
      detectedLanguage: "ja",
      confidence: 0.9,
    });
  });

  it("handles missing confidence values", () => {
    const results = [
      { detectedLanguage: "en" },
      { detectedLanguage: "ja", confidence: 0.8 },
    ];
    expect(selectBestLanguage(results)).toEqual({
      detectedLanguage: "ja",
      confidence: 0.8,
    });
  });

  it("handles missing detectedLanguage", () => {
    const results = [{ confidence: 0.5 }];
    expect(selectBestLanguage(results)).toEqual({
      detectedLanguage: null,
      confidence: 0.5,
    });
  });
});

describe("normalizeDetectedLanguage", () => {
  it("returns normalized code for supported language", () => {
    expect(normalizeDetectedLanguage("en-US", ["en", "ja", "zh"])).toBe("en");
  });

  it("returns null for unsupported language", () => {
    expect(normalizeDetectedLanguage("unknown", ["en", "ja", "zh"])).toBeNull();
  });

  it("handles lowercase conversion", () => {
    expect(normalizeDetectedLanguage("EN", ["en", "ja"])).toBe("en");
  });

  it("uses default supported languages when not provided", () => {
    // "en" is in the default SUPPORTED_LANGUAGES
    expect(normalizeDetectedLanguage("en")).toBe("en");
  });
});

describe("isTextSufficientForDetection", () => {
  it("returns false for empty text", () => {
    expect(isTextSufficientForDetection("")).toBe(false);
  });

  it("returns false for whitespace only", () => {
    expect(isTextSufficientForDetection("   ")).toBe(false);
  });

  it("returns false for text shorter than min length", () => {
    expect(isTextSufficientForDetection("hello", 10)).toBe(false);
  });

  it("returns true for text at min length", () => {
    expect(isTextSufficientForDetection("hello worl", 10)).toBe(true);
  });

  it("returns true for text longer than min length", () => {
    expect(
      isTextSufficientForDetection("hello world, this is a test", 10)
    ).toBe(true);
  });

  it("uses default min length", () => {
    const shortText = "a".repeat(DEFAULT_MIN_TEXT_LENGTH - 1);
    const exactText = "a".repeat(DEFAULT_MIN_TEXT_LENGTH);
    expect(isTextSufficientForDetection(shortText)).toBe(false);
    expect(isTextSufficientForDetection(exactText)).toBe(true);
  });
});

describe("computeEffectiveSourceLanguage", () => {
  it("returns overridden language when set", () => {
    expect(computeEffectiveSourceLanguage("ja", 0.9, "ko", "en", 0.5)).toBe(
      "ko"
    );
  });

  it("returns detected language when confidence is high", () => {
    expect(computeEffectiveSourceLanguage("ja", 0.9, null, "en", 0.5)).toBe(
      "ja"
    );
  });

  it("returns fallback when confidence is low", () => {
    expect(computeEffectiveSourceLanguage("ja", 0.3, null, "en", 0.5)).toBe(
      "en"
    );
  });

  it("returns fallback when detected language is null", () => {
    expect(computeEffectiveSourceLanguage(null, 0.9, null, "en", 0.5)).toBe(
      "en"
    );
  });

  it("uses default confidence threshold", () => {
    // With default threshold (0.5), confidence of 0.5 should pass
    expect(
      computeEffectiveSourceLanguage(
        "ja",
        DEFAULT_CONFIDENCE_THRESHOLD,
        null,
        "en"
      )
    ).toBe("ja");

    // Confidence below threshold should fall back
    expect(
      computeEffectiveSourceLanguage(
        "ja",
        DEFAULT_CONFIDENCE_THRESHOLD - 0.1,
        null,
        "en"
      )
    ).toBe("en");
  });
});

describe("shouldSkipDetection", () => {
  it("returns true when disabled", () => {
    expect(shouldSkipDetection("hello world", false)).toBe(true);
  });

  it("returns true for short Latin text when enabled", () => {
    // Latin scripts require 5 characters minimum
    expect(shouldSkipDetection("hi", true)).toBe(true);
    expect(shouldSkipDetection("abc", true)).toBe(true);
  });

  it("returns false for sufficient Latin text when enabled", () => {
    expect(shouldSkipDetection("hello", true)).toBe(false);
    expect(shouldSkipDetection("hello world", true)).toBe(false);
  });

  it("returns false for single CJK character when enabled", () => {
    // CJK scripts require only 1 character
    expect(shouldSkipDetection("翻", true)).toBe(false);
    expect(shouldSkipDetection("안", true)).toBe(false);
    expect(shouldSkipDetection("中", true)).toBe(false);
  });

  it("returns false for short Korean text (original issue)", () => {
    // This was the original issue: 국민성장펀드 (7 chars) was being skipped
    expect(shouldSkipDetection("국민성장펀드", true)).toBe(false);
  });

  it("uses dynamic min length based on script type", () => {
    // Latin: needs 5 chars
    expect(shouldSkipDetection("abcd", true)).toBe(true);
    expect(shouldSkipDetection("abcde", true)).toBe(false);

    // CJK: needs 1 char
    expect(shouldSkipDetection("漢", true)).toBe(false);
  });
});

describe("containsHighDensityScript", () => {
  it("returns true for CJK characters", () => {
    // Chinese
    expect(containsHighDensityScript("中文")).toBe(true);
    // Japanese Hiragana
    expect(containsHighDensityScript("ひらがな")).toBe(true);
    // Japanese Katakana
    expect(containsHighDensityScript("カタカナ")).toBe(true);
    // Korean Hangul
    expect(containsHighDensityScript("한글")).toBe(true);
    expect(containsHighDensityScript("국민성장펀드")).toBe(true);
  });

  it("returns true for Arabic script", () => {
    expect(containsHighDensityScript("مرحبا")).toBe(true);
  });

  it("returns true for Hebrew script", () => {
    expect(containsHighDensityScript("שלום")).toBe(true);
  });

  it("returns true for Devanagari script", () => {
    expect(containsHighDensityScript("नमस्ते")).toBe(true);
  });

  it("returns true for Thai script", () => {
    expect(containsHighDensityScript("สวัสดี")).toBe(true);
  });

  it("returns false for Latin script", () => {
    expect(containsHighDensityScript("hello")).toBe(false);
    expect(containsHighDensityScript("world")).toBe(false);
  });

  it("returns true for mixed text containing high-density script", () => {
    expect(containsHighDensityScript("Hello 世界")).toBe(true);
    expect(containsHighDensityScript("Test 테스트")).toBe(true);
  });
});

describe("getMinTextLengthForDetection", () => {
  it("returns HIGH_DENSITY_MIN_TEXT_LENGTH for CJK text", () => {
    expect(getMinTextLengthForDetection("漢字")).toBe(
      HIGH_DENSITY_MIN_TEXT_LENGTH
    );
    expect(getMinTextLengthForDetection("한글")).toBe(
      HIGH_DENSITY_MIN_TEXT_LENGTH
    );
    expect(getMinTextLengthForDetection("ひらがな")).toBe(
      HIGH_DENSITY_MIN_TEXT_LENGTH
    );
  });

  it("returns DEFAULT_MIN_TEXT_LENGTH for Latin text", () => {
    expect(getMinTextLengthForDetection("hello")).toBe(DEFAULT_MIN_TEXT_LENGTH);
    expect(getMinTextLengthForDetection("world")).toBe(DEFAULT_MIN_TEXT_LENGTH);
  });

  it("returns HIGH_DENSITY_MIN_TEXT_LENGTH for mixed text", () => {
    // If any high-density script is present, use lower threshold
    expect(getMinTextLengthForDetection("Hello 世界")).toBe(
      HIGH_DENSITY_MIN_TEXT_LENGTH
    );
  });
});
