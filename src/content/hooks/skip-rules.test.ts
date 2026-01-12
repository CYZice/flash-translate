import { describe, expect, it } from "vitest";
import {
  evaluateSkipRules,
  type SkipContext,
  type SkipResult,
} from "./skip-rules";

function createContext(overrides: Partial<SkipContext> = {}): SkipContext {
  return {
    targetLanguage: "ja",
    skipSameLanguage: true,
    autoDetectEnabled: false,
    detectedLanguage: null,
    confidence: 0,
    pageLanguage: null,
    isDetecting: false,
    ...overrides,
  };
}

describe("evaluateSkipRules", () => {
  describe("基本ケース（スキップなし）", () => {
    it("skipSameLanguage が false の場合はスキップしない", () => {
      const context = createContext({
        skipSameLanguage: false,
        pageLanguage: "ja",
        targetLanguage: "ja",
      });
      const result = evaluateSkipRules(context);
      expect(result).toEqual<SkipResult>({
        shouldSkip: false,
        reason: null,
      });
    });

    it("言語が異なる場合はスキップしない（auto-detect OFF）", () => {
      const context = createContext({
        pageLanguage: "en",
        targetLanguage: "ja",
      });
      const result = evaluateSkipRules(context);
      expect(result).toEqual<SkipResult>({
        shouldSkip: false,
        reason: null,
      });
    });

    it("言語が異なる場合はスキップしない（auto-detect ON）", () => {
      const context = createContext({
        autoDetectEnabled: true,
        detectedLanguage: "en",
        confidence: 0.9,
        targetLanguage: "ja",
      });
      const result = evaluateSkipRules(context);
      expect(result).toEqual<SkipResult>({
        shouldSkip: false,
        reason: null,
      });
    });
  });

  describe("検出中（detecting-in-progress）", () => {
    it("auto-detect ON かつ検出中の場合はスキップする", () => {
      const context = createContext({
        autoDetectEnabled: true,
        isDetecting: true,
        targetLanguage: "ja",
      });
      const result = evaluateSkipRules(context);
      expect(result).toEqual<SkipResult>({
        shouldSkip: true,
        reason: "detecting-in-progress",
      });
    });

    it("auto-detect OFF の場合は検出中でもスキップしない", () => {
      const context = createContext({
        autoDetectEnabled: false,
        isDetecting: true,
        pageLanguage: "en",
        targetLanguage: "ja",
      });
      const result = evaluateSkipRules(context);
      expect(result).toEqual<SkipResult>({
        shouldSkip: false,
        reason: null,
      });
    });
  });

  describe("ページ言語によるスキップ（same-as-page-language）", () => {
    it("auto-detect OFF でページ言語とターゲットが一致する場合はスキップ", () => {
      const context = createContext({
        autoDetectEnabled: false,
        pageLanguage: "ja",
        targetLanguage: "ja",
      });
      const result = evaluateSkipRules(context);
      expect(result).toEqual<SkipResult>({
        shouldSkip: true,
        reason: "same-as-page-language",
      });
    });

    it("ページ言語のバリアント（ja-JP）も正規化して比較", () => {
      const context = createContext({
        autoDetectEnabled: false,
        pageLanguage: "ja-JP",
        targetLanguage: "ja",
      });
      const result = evaluateSkipRules(context);
      expect(result).toEqual<SkipResult>({
        shouldSkip: true,
        reason: "same-as-page-language",
      });
    });

    it("pageLanguage が null の場合はスキップしない", () => {
      const context = createContext({
        autoDetectEnabled: false,
        pageLanguage: null,
        targetLanguage: "ja",
      });
      const result = evaluateSkipRules(context);
      expect(result).toEqual<SkipResult>({
        shouldSkip: false,
        reason: null,
      });
    });

    it("auto-detect ON の場合はページ言語でスキップしない", () => {
      const context = createContext({
        autoDetectEnabled: true,
        pageLanguage: "ja",
        targetLanguage: "ja",
        detectedLanguage: null,
        confidence: 0,
      });
      const result = evaluateSkipRules(context);
      expect(result).toEqual<SkipResult>({
        shouldSkip: false,
        reason: null,
      });
    });
  });

  describe("検出言語によるスキップ（same-as-detected-language）", () => {
    it("auto-detect ON で検出言語とターゲットが一致する場合はスキップ", () => {
      const context = createContext({
        autoDetectEnabled: true,
        detectedLanguage: "ja",
        confidence: 0.9,
        targetLanguage: "ja",
      });
      const result = evaluateSkipRules(context);
      expect(result).toEqual<SkipResult>({
        shouldSkip: true,
        reason: "same-as-detected-language",
      });
    });

    it("検出言語のバリアント（ja-JP）も正規化して比較", () => {
      const context = createContext({
        autoDetectEnabled: true,
        detectedLanguage: "ja-JP",
        confidence: 0.8,
        targetLanguage: "ja",
      });
      const result = evaluateSkipRules(context);
      expect(result).toEqual<SkipResult>({
        shouldSkip: true,
        reason: "same-as-detected-language",
      });
    });

    it("confidence が閾値未満の場合はスキップしない", () => {
      const context = createContext({
        autoDetectEnabled: true,
        detectedLanguage: "ja",
        confidence: 0.3,
        targetLanguage: "ja",
      });
      const result = evaluateSkipRules(context);
      expect(result).toEqual<SkipResult>({
        shouldSkip: false,
        reason: null,
      });
    });

    it("detectedLanguage が null の場合はスキップしない", () => {
      const context = createContext({
        autoDetectEnabled: true,
        detectedLanguage: null,
        confidence: 0.9,
        targetLanguage: "ja",
      });
      const result = evaluateSkipRules(context);
      expect(result).toEqual<SkipResult>({
        shouldSkip: false,
        reason: null,
      });
    });

    it("auto-detect OFF の場合は検出言語でスキップしない", () => {
      const context = createContext({
        autoDetectEnabled: false,
        detectedLanguage: "ja",
        confidence: 0.9,
        targetLanguage: "ja",
        pageLanguage: "en",
      });
      const result = evaluateSkipRules(context);
      expect(result).toEqual<SkipResult>({
        shouldSkip: false,
        reason: null,
      });
    });
  });

  describe("優先順位", () => {
    it("検出中は他のルールより優先される", () => {
      const context = createContext({
        autoDetectEnabled: true,
        isDetecting: true,
        detectedLanguage: "ja",
        confidence: 0.9,
        targetLanguage: "ja",
      });
      const result = evaluateSkipRules(context);
      expect(result.reason).toBe("detecting-in-progress");
    });
  });
});
