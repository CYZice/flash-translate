import { describe, expect, it } from "vitest";
import { clampPosition, positionNearSelection } from "./floating-position";

describe("floating positions", () => {
  it("anchors below a selection and switches above near the bottom", () => {
    const rect = {
      left: 300,
      right: 400,
      top: 100,
      bottom: 120,
      width: 100,
      height: 20,
    };
    expect(
      positionNearSelection(
        rect,
        { width: 300, height: 200 },
        { width: 800, height: 600 }
      )
    ).toEqual({ x: 100, y: 128 });
    expect(
      positionNearSelection(
        { ...rect, top: 500, bottom: 520 },
        { width: 300, height: 200 },
        { width: 800, height: 600 }
      )
    ).toEqual({ x: 100, y: 292 });
  });
  it("keeps dragged cards within the viewport, including tiny windows", () => {
    expect(
      clampPosition(
        { x: 1000, y: -50 },
        { width: 300, height: 200 },
        { width: 800, height: 600 }
      )
    ).toEqual({ x: 492, y: 8 });
    expect(
      clampPosition(
        { x: 40, y: 60 },
        { width: 300, height: 200 },
        { width: 250, height: 150 }
      )
    ).toEqual({ x: 8, y: 8 });
  });
});
