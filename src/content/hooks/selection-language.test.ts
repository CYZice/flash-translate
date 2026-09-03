import { describe, expect, it } from "vitest";
import { hasMixedLanguageSelection } from "./selection-language";

describe("hasMixedLanguageSelection", () => {
  it("ignores punctuation and numbers", () => {
    expect(hasMixedLanguageSelection("中文，123。", "zh")).toBe(false);
  });
  it("detects Latin mixed into Chinese", () => {
    expect(hasMixedLanguageSelection("这是中文 English", "zh")).toBe(true);
  });
  it("detects CJK mixed into English", () => {
    expect(hasMixedLanguageSelection("English 中文", "en")).toBe(true);
  });
  it("allows Japanese Kanji and Kana together", () => {
    expect(hasMixedLanguageSelection("日本語です", "ja")).toBe(false);
  });
});
