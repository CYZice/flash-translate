import { describe, expect, it } from "vitest";
import { resolveTermContext } from "./term-context";

describe("resolveTermContext", () => {
  it("keeps the containing sentence and its neighbors as plain text", () => {
    const selectedText =
      "First sentence. The browser translates selected text. Final sentence.";
    const termOffset = selectedText.indexOf("translates");

    expect(
      resolveTermContext({
        selectedText,
        termOffset,
        termLength: "translates".length,
        sourceLanguage: "en",
      })
    ).toEqual({
      text: selectedText,
      termOffset,
      strategy: "neighboring-sentences",
    });
  });

  it("drops distant sentences when the neighboring context exceeds the limit", () => {
    const selectedText =
      "A long introduction sentence. The hovered term is relevant here. A long closing sentence.";
    const expectedText = "The hovered term is relevant here. ";
    const termOffset = selectedText.indexOf("term");

    expect(
      resolveTermContext({
        selectedText,
        termOffset,
        termLength: "term".length,
        sourceLanguage: "en",
        maxCharacters: expectedText.length,
      })
    ).toEqual({
      text: expectedText,
      termOffset: expectedText.indexOf("term"),
      strategy: "containing-sentence",
    });
  });

  it("creates a bounded character window for a very long sentence", () => {
    const selectedText = `${"before ".repeat(40)}target ${"after ".repeat(40)}`;
    const termOffset = selectedText.indexOf("target");

    const context = resolveTermContext({
      selectedText,
      termOffset,
      termLength: "target".length,
      sourceLanguage: "en",
      maxCharacters: 80,
    });

    expect(context.strategy).toBe("character-window");
    expect(context.text).toHaveLength(80);
    expect(
      context.text.slice(
        context.termOffset,
        context.termOffset + "target".length
      )
    ).toBe("target");
  });

  it("uses Japanese sentence boundaries", () => {
    const selectedText = "前の文です。対象の単語は中々です。後ろの文です。";
    const termOffset = selectedText.indexOf("中々");

    expect(
      resolveTermContext({
        selectedText,
        termOffset,
        termLength: "中々".length,
        sourceLanguage: "ja",
      })
    ).toEqual({
      text: selectedText,
      termOffset,
      strategy: "neighboring-sentences",
    });
  });
});
