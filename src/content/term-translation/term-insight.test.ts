import { describe, expect, it } from "vitest";
import {
  parseTermInsight,
  parseTermInsightProgress,
  TermInsightUnavailableError,
} from "./term-insight";

describe("parseTermInsight", () => {
  it("accepts a concise explanation in the requested language", () => {
    expect(
      parseTermInsight("この文脈では「かなり」という意味。", "ja")
    ).toEqual({
      contextualMeaning: "この文脈では「かなり」という意味。",
    });
    expect(
      parseTermInsight("In this context, it means considerably.", "en")
    ).toEqual({
      contextualMeaning: "In this context, it means considerably.",
    });
  });

  it("rejects a response in the wrong output language", () => {
    expect(() =>
      parseTermInsight("In this context, it means considerably.", "ja")
    ).toThrow(TermInsightUnavailableError);
  });

  it("streams only content that matches the requested language", () => {
    expect(parseTermInsightProgress("In this context", "ja")).toEqual({});
    expect(parseTermInsightProgress("この文脈では「かなり」", "ja")).toEqual({
      contextualMeaning: "この文脈では「かなり」",
    });
  });

  it("rejects empty output at the integration boundary", () => {
    expect(() => parseTermInsight("   ", "ja")).toThrow(
      TermInsightUnavailableError
    );
  });
});
