import { describe, expect, it } from "vitest";
import { parseTermInsight, TermInsightUnavailableError } from "./term-insight";

describe("parseTermInsight", () => {
  it("validates a structured Prompt API response", () => {
    expect(
      parseTermInsight(
        JSON.stringify({
          expression: "fairly",
          contextualMeaning: "かなり",
          coreMeaning: "程度を穏やかに示す",
          roleInContext: "large の程度を説明する",
          partOfSpeech: "副詞",
          isMultiwordExpression: false,
        })
      )
    ).toEqual({
      expression: "fairly",
      contextualMeaning: "かなり",
      coreMeaning: "程度を穏やかに示す",
      roleInContext: "large の程度を説明する",
      partOfSpeech: "副詞",
      isMultiwordExpression: false,
    });
  });

  it("rejects malformed output at the integration boundary", () => {
    expect(() => parseTermInsight('{"contextualMeaning":"かなり"}')).toThrow(
      TermInsightUnavailableError
    );
  });
});
