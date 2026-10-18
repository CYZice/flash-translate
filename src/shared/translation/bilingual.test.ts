import { describe, expect, it } from "vitest";
import { getEnglishChinesePair } from "./bilingual";

describe("automatic Chinese/English translation", () => {
  it.each(["Hello", "A", "Consider f(t)=1 for all t.", "123 + x^2"])(
    "routes English to Chinese: %s",
    (text) => {
      expect(getEnglishChinesePair(text)).toEqual({
        sourceLanguage: "en",
        targetLanguage: "zh",
      });
    }
  );
  it.each(["你好", "鏡面的光斑", "Fresnel 近似与 Hermite-Gaussian 模式", "𠀀"])(
    "routes Chinese and mixed technical text to English: %s",
    (text) => {
      expect(getEnglishChinesePair(text)).toEqual({
        sourceLanguage: "zh",
        targetLanguage: "en",
      });
    }
  );
});
