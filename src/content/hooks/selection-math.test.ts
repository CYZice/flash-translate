/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { getMathText } from "./selection-math";

function math(markup: string): Element {
  const root = document.createElement("div");
  root.innerHTML = markup;
  return root.firstElementChild as Element;
}

describe("MathML serialization", () => {
  it.each([
    ["<msup><mi>x</mi><mn>2</mn></msup>", "x^{2}"],
    ["<msub><mi>x</mi><mi>i</mi></msub>", "x_{i}"],
    ["<msubsup><mi>x</mi><mi>i</mi><mn>2</mn></msubsup>", "x_{i}^{2}"],
    ["<msqrt><mi>x</mi><mo>+</mo><mn>1</mn></msqrt>", "\\sqrt{x+1}"],
    ["<mroot><mi>x</mi><mn>3</mn></mroot>", "\\sqrt[3]{x}"],
    [
      "<msup><mrow><mi>x</mi><mo>+</mo><mi>y</mi></mrow><mn>2</mn></msup>",
      "{x+y}^{2}",
    ],
    ["<mfrac>\n <mi>x</mi>\n <mi>y</mi>\n</mfrac>", "\\frac{x}{y}"],
  ])("retains structure: %s", (markup, expected) => {
    expect(getMathText(math(`<math>${markup}</math>`))).toBe(expected);
  });

  it("prefers source over MathML and excludes other annotations", () => {
    const root = math(
      '<math><semantics><mi>x</mi><annotation encoding="application/x-tex">x^2</annotation><annotation-xml>duplicate</annotation-xml></semantics></math>'
    );
    expect(getMathText(root)).toBe("x^2");
  });

  it("omits oversized context formulas without truncating selected formulas", () => {
    const source = "x".repeat(10_000);
    const root = math(
      `<span class="katex"><annotation encoding="application/x-tex">${source}</annotation><span class="katex-html">x</span></span>`
    );
    expect(getMathText(root, 8192, 512)).toBe("");
    expect(getMathText(root)).toBe(source);
  });

  it("bounds the MathML tree used for optional context", () => {
    const root = math(`<math><mrow>${"<mi>x</mi>".repeat(1000)}</mrow></math>`);
    expect(getMathText(root, 8192, 512)).toBe("");
    expect(getMathText(root)).toBe("x".repeat(1000));
  });
});
