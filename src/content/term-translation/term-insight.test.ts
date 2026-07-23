import { describe, expect, it } from "vitest";
import {
  parseTermInsight,
  parseTermInsightProgress,
  TermInsightUnavailableError,
} from "./term-insight";

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

  it("extracts only completed fields from a partial structured stream", () => {
    expect(
      parseTermInsightProgress(
        '{"contextualMeaning":"かなり","coreMeaning":"程度を穏やか'
      )
    ).toEqual({
      contextualMeaning: "かなり",
    });

    expect(
      parseTermInsightProgress(
        '{"contextualMeaning":"かなり","coreMeaning":"程度を\\n穏やかに示す","isMultiwordExpression":false'
      )
    ).toEqual({
      contextualMeaning: "かなり",
      coreMeaning: "程度を\n穏やかに示す",
      isMultiwordExpression: false,
    });
  });
});
