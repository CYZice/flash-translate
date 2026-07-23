import { describe, expect, it } from "vitest";
import { getTermTooltipPosition } from "./term-tooltip-position";

const ANCHOR_RECT = {
  top: 200,
  right: 140,
  bottom: 220,
  left: 100,
  width: 40,
  height: 20,
};

describe("getTermTooltipPosition", () => {
  it("places the tooltip above the hovered term when space is available", () => {
    expect(
      getTermTooltipPosition(ANCHOR_RECT, {
        width: 1024,
        height: 768,
      })
    ).toEqual({
      left: 152,
      top: 144,
    });
  });

  it("places the tooltip below a term near the top edge", () => {
    expect(
      getTermTooltipPosition(
        {
          ...ANCHOR_RECT,
          top: 12,
          bottom: 32,
        },
        {
          width: 1024,
          height: 768,
        }
      )
    ).toEqual({
      left: 152,
      top: 32,
    });
  });

  it("keeps the tooltip inside the horizontal viewport", () => {
    expect(
      getTermTooltipPosition(
        {
          ...ANCHOR_RECT,
          right: 40,
          left: 0,
        },
        {
          width: 320,
          height: 568,
        }
      )
    ).toEqual({
      left: 152,
      top: 144,
    });
  });
});
