import { describe, expect, it } from "vitest";
import { getSentenceSlice } from "./use-editor-input-assist";

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
