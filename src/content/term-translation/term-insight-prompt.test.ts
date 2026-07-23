import { describe, expect, it } from "vitest";
import { createTermInsightPrompt } from "./term-insight-prompt";

describe("createTermInsightPrompt", () => {
  it("isolates the target expression without exposing offset implementation details", () => {
    const context =
      "If you find parameter tuning helpful, let us know in the GitHub repository.";
    const prompt = createTermInsightPrompt({
      sourceText: "you",
      quickTranslation: "貴方々",
      sourceLanguage: "en",
      targetLanguage: "ja",
      context: {
        text: context,
        termOffset: context.indexOf("you"),
        strategy: "containing-sentence",
      },
    });

    expect(prompt).not.toContain("UTF-16");
    expect(prompt).not.toContain("offset");
    expect(prompt).toContain('"contextBefore":"If ');
    expect(prompt).toContain('"targetExpression":"you"');
    expect(prompt).toContain(
      '"contextAfter":" find parameter tuning helpful, let us know in the GitHub repository."'
    );
    expect(prompt).toContain('"roughTranslation":"貴方々"');
    expect(prompt).toContain(
      "Explain only targetExpression in the exact context formed by contextBefore and contextAfter."
    );
  });
});
