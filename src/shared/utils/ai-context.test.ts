import { describe, expect, it } from "vitest";
import {
  getAdjacentContext,
  getContextAroundSelection,
  normalizeAiContextSentenceCount,
} from "./ai-context";

describe("normalizeAiContextSentenceCount", () => {
  it("uses one sentence for invalid values", () => {
    expect(normalizeAiContextSentenceCount(undefined)).toBe(1);
    expect(normalizeAiContextSentenceCount(1.5)).toBe(1);
    expect(normalizeAiContextSentenceCount("2")).toBe(1);
  });

  it("clamps integer values to the supported range", () => {
    expect(normalizeAiContextSentenceCount(-1)).toBe(0);
    expect(normalizeAiContextSentenceCount(0)).toBe(0);
    expect(normalizeAiContextSentenceCount(3)).toBe(3);
    expect(normalizeAiContextSentenceCount(4)).toBe(3);
  });
});

describe("getAdjacentContext", () => {
  const chinese = "第一句。第二句！第三句？第四句。";
  const english = "First sentence. Second sentence! Third sentence?";

  it("returns no context when disabled", () => {
    expect(getAdjacentContext(chinese, "before", 0)).toBe("");
    expect(getAdjacentContext(chinese, "after", 0)).toBe("");
  });

  it("takes the nearest Chinese sentences in either direction", () => {
    expect(getAdjacentContext(chinese, "before", 2)).toBe("第三句？ 第四句。");
    expect(getAdjacentContext(chinese, "after", 2)).toBe("第一句。 第二句！");
  });

  it("supports English punctuation and incomplete sentence fragments", () => {
    expect(getAdjacentContext(english, "before", 1)).toBe("Third sentence?");
    expect(getAdjacentContext("First. unfinished fragment", "before", 1)).toBe(
      "unfinished fragment"
    );
  });

  it("returns all available text when fewer sentences exist", () => {
    expect(getAdjacentContext("Only one sentence.", "after", 3)).toBe(
      "Only one sentence."
    );
  });
});

describe("getContextAroundSelection", () => {
  it("applies one shared range to both sides", () => {
    expect(
      getContextAroundSelection("第一句。第二句。", "第三句。第四句。", 1)
    ).toEqual({
      contextBefore: "第二句。",
      contextAfter: "第三句。",
    });
  });
});
