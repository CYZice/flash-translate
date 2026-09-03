import { describe, expect, it } from "vitest";
import {
  getCjkTranslationSlice,
  getSentenceSlice,
} from "./use-editor-input-assist";

describe("getSentenceSlice", () => {
  it("extracts the Chinese sentence surrounding the caret", () => {
    expect(getSentenceSlice("第一句。正在输入中文！最后一句", 10)).toEqual({
      start: 4,
      end: 11,
      text: "正在输入中文！",
    });
  });

  it("handles text without sentence punctuation", () => {
    expect(getSentenceSlice("输入中文提示", 6)).toEqual({
      start: 0,
      end: 6,
      text: "输入中文提示",
    });
  });
});

describe("getCjkTranslationSlice", () => {
  it("excludes an English prefix from the translated text", () => {
    expect(
      getCjkTranslationSlice("now we can continue 学习集成光子学", 27)
    ).toEqual({
      start: 20,
      end: 27,
      text: "学习集成光子学",
    });
  });

  it("excludes an English suffix from the translated text", () => {
    expect(getCjkTranslationSlice("学习集成光子学 and continue", 7)).toEqual({
      start: 0,
      end: 7,
      text: "学习集成光子学",
    });
  });

  it("preserves English terminology inside Chinese text", () => {
    expect(getCjkTranslationSlice("学习 silicon photonics 的基础", 24)).toEqual(
      {
        start: 0,
        end: 24,
        text: "学习 silicon photonics 的基础",
      }
    );
  });

  it("returns null when the current sentence contains no Chinese", () => {
    expect(getCjkTranslationSlice("now we can continue", 19)).toBeNull();
  });
});
