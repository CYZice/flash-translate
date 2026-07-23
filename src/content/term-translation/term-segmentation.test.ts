import { describe, expect, it } from "vitest";
import { intlWordSegmentationStrategy } from "./term-segmentation";

describe("intlWordSegmentationStrategy", () => {
  it("returns the English word containing the offset", () => {
    expect(
      intlWordSegmentationStrategy.segmentAt({
        text: "Translate this sentence.",
        offset: 12,
        language: "en",
      })
    ).toEqual({
      text: "this",
      startOffset: 10,
      endOffset: 14,
    });
  });

  it("uses the preceding character when a caret is at the word end", () => {
    expect(
      intlWordSegmentationStrategy.segmentAt({
        text: "translate",
        offset: 9,
        language: "en",
      })
    ).toEqual({
      text: "translate",
      startOffset: 0,
      endOffset: 9,
    });
  });

  it("returns null for punctuation", () => {
    expect(
      intlWordSegmentationStrategy.segmentAt({
        text: "hello, world",
        offset: 6,
        language: "en",
      })
    ).toBeNull();
  });

  it("uses Japanese word boundaries", () => {
    expect(
      intlWordSegmentationStrategy.segmentAt({
        text: "翻訳機能を実装する",
        offset: 1,
        language: "ja",
      })
    ).toEqual({
      text: "翻訳",
      startOffset: 0,
      endOffset: 2,
    });
  });

  it("returns null for an offset outside the text", () => {
    expect(
      intlWordSegmentationStrategy.segmentAt({
        text: "hello",
        offset: 6,
        language: "en",
      })
    ).toBeNull();
  });
});
