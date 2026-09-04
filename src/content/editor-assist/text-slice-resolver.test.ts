import { describe, expect, it } from "vitest";
import { resolveCjkSlice, resolveSentence } from "./text-slice-resolver";

describe("TextSliceResolver", () => {
  it("resolves a sentence around the caret", () => {
    expect(resolveSentence("第一句。正在输入中文！最后一句", 10)).toEqual({
      start: 4,
      end: 11,
      text: "正在输入中文！",
    });
  });

  it("keeps English terminology inside a Chinese slice", () => {
    expect(resolveCjkSlice("学习 silicon photonics 的基础", 24)).toEqual({
      start: 0,
      end: 24,
      text: "学习 silicon photonics 的基础",
    });
  });

  it("resolves Chinese typed at the beginning of an editor", () => {
    expect(resolveCjkSlice("你好", 2)).toEqual({
      start: 0,
      end: 2,
      text: "你好",
    });
  });

  it("excludes English outside the Chinese span", () => {
    expect(resolveCjkSlice("now we can continue 学习集成光子学", 27)).toEqual({
      start: 20,
      end: 27,
      text: "学习集成光子学",
    });
    expect(resolveCjkSlice("学习集成光子学 and continue", 7)).toEqual({
      start: 0,
      end: 7,
      text: "学习集成光子学",
    });
  });
});
