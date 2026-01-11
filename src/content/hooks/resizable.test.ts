import { describe, expect, it } from "vitest";
import {
  calculateBottomResize,
  calculateLeftResize,
  calculateMaxBottomExpansion,
  calculateMaxLeftExpansion,
  calculateMaxRightExpansion,
  calculateRightResize,
  clampHeight,
  clampWidth,
  type HeightResizeConstraints,
  type ResizeConstraints,
} from "./resizable";

const defaultConstraints: ResizeConstraints = {
  minWidth: 280,
  maxWidth: 600,
  edgeMargin: 8,
};

describe("clampWidth", () => {
  it("returns width when within bounds", () => {
    expect(clampWidth(400, 280, 600)).toBe(400);
  });

  it("returns minWidth when width is below minimum", () => {
    expect(clampWidth(200, 280, 600)).toBe(280);
  });

  it("returns maxWidth when width is above maximum", () => {
    expect(clampWidth(700, 280, 600)).toBe(600);
  });

  it("handles edge case where width equals minWidth", () => {
    expect(clampWidth(280, 280, 600)).toBe(280);
  });

  it("handles edge case where width equals maxWidth", () => {
    expect(clampWidth(600, 280, 600)).toBe(600);
  });

  it("handles negative width", () => {
    expect(clampWidth(-100, 280, 600)).toBe(280);
  });
});

describe("calculateMaxLeftExpansion", () => {
  it("calculates available space to left edge", () => {
    expect(calculateMaxLeftExpansion(100, 8)).toBe(92);
  });

  it("returns zero when card is at edge margin", () => {
    expect(calculateMaxLeftExpansion(8, 8)).toBe(0);
  });

  it("returns negative when card is past edge margin", () => {
    expect(calculateMaxLeftExpansion(4, 8)).toBe(-4);
  });

  it("handles zero margin", () => {
    expect(calculateMaxLeftExpansion(50, 0)).toBe(50);
  });
});

describe("calculateMaxRightExpansion", () => {
  it("calculates available space to right edge", () => {
    // viewportWidth=1024, cardRight=800, margin=8 => 1024 - 8 - 800 = 216
    expect(calculateMaxRightExpansion(800, 1024, 8)).toBe(216);
  });

  it("returns zero when card is at edge margin", () => {
    // viewportWidth=1024, cardRight=1016, margin=8 => 1024 - 8 - 1016 = 0
    expect(calculateMaxRightExpansion(1016, 1024, 8)).toBe(0);
  });

  it("returns negative when card is past edge margin", () => {
    expect(calculateMaxRightExpansion(1020, 1024, 8)).toBe(-4);
  });

  it("handles zero margin", () => {
    expect(calculateMaxRightExpansion(800, 1024, 0)).toBe(224);
  });
});

describe("calculateLeftResize", () => {
  it("increases width when dragging left (negative deltaX)", () => {
    const result = calculateLeftResize({
      deltaX: -50,
      startWidth: 320,
      startOffsetX: 0,
      cardLeft: 100,
      constraints: defaultConstraints,
    });

    expect(result.newWidth).toBe(370);
    expect(result.newOffsetX).toBe(-50);
  });

  it("decreases width when dragging right (positive deltaX)", () => {
    const result = calculateLeftResize({
      deltaX: 30,
      startWidth: 350,
      startOffsetX: 0,
      cardLeft: 100,
      constraints: defaultConstraints,
    });

    expect(result.newWidth).toBe(320);
    expect(result.newOffsetX).toBe(30);
  });

  it("clamps width to minWidth when shrinking too much", () => {
    const result = calculateLeftResize({
      deltaX: 200,
      startWidth: 320,
      startOffsetX: 0,
      cardLeft: 100,
      constraints: defaultConstraints,
    });

    expect(result.newWidth).toBe(280);
    expect(result.newOffsetX).toBe(40);
  });

  it("clamps width to maxWidth when expanding too much", () => {
    const result = calculateLeftResize({
      deltaX: -500,
      startWidth: 320,
      startOffsetX: 0,
      cardLeft: 500,
      constraints: defaultConstraints,
    });

    expect(result.newWidth).toBe(600);
    expect(result.newOffsetX).toBe(-280);
  });

  it("clamps expansion to edge margin", () => {
    const result = calculateLeftResize({
      deltaX: -200,
      startWidth: 320,
      startOffsetX: 0,
      cardLeft: 50, // Only 42px available (50 - 8)
      constraints: defaultConstraints,
    });

    // Can only expand by 42px
    expect(result.newWidth).toBe(362);
    expect(result.newOffsetX).toBe(-42);
  });

  it("prevents card from going past left edge margin", () => {
    const result = calculateLeftResize({
      deltaX: -100,
      startWidth: 320,
      startOffsetX: 0,
      cardLeft: 20, // Only 12px available
      constraints: defaultConstraints,
    });

    expect(result.newWidth).toBe(332);
    expect(result.newOffsetX).toBe(-12);
  });

  it("handles card already at left edge", () => {
    const result = calculateLeftResize({
      deltaX: -50,
      startWidth: 320,
      startOffsetX: 0,
      cardLeft: 8, // Already at edge margin
      constraints: defaultConstraints,
    });

    // No expansion possible
    expect(result.newWidth).toBe(320);
    expect(result.newOffsetX).toBe(0);
  });

  it("handles zero deltaX", () => {
    const result = calculateLeftResize({
      deltaX: 0,
      startWidth: 320,
      startOffsetX: 10,
      cardLeft: 100,
      constraints: defaultConstraints,
    });

    expect(result.newWidth).toBe(320);
    expect(result.newOffsetX).toBe(10);
  });

  it("preserves startOffsetX in calculations", () => {
    const result = calculateLeftResize({
      deltaX: -20,
      startWidth: 320,
      startOffsetX: 15,
      cardLeft: 100,
      constraints: defaultConstraints,
    });

    expect(result.newWidth).toBe(340);
    expect(result.newOffsetX).toBe(-5); // 15 - 20 = -5
  });
});

describe("calculateRightResize", () => {
  const viewportWidth = 1024;

  it("increases width when dragging right (positive deltaX)", () => {
    const result = calculateRightResize({
      deltaX: 50,
      startWidth: 320,
      cardRight: 500,
      viewportWidth,
      constraints: defaultConstraints,
    });

    expect(result.newWidth).toBe(370);
  });

  it("decreases width when dragging left (negative deltaX)", () => {
    const result = calculateRightResize({
      deltaX: -30,
      startWidth: 350,
      cardRight: 500,
      viewportWidth,
      constraints: defaultConstraints,
    });

    expect(result.newWidth).toBe(320);
  });

  it("clamps width to minWidth", () => {
    const result = calculateRightResize({
      deltaX: -200,
      startWidth: 320,
      cardRight: 500,
      viewportWidth,
      constraints: defaultConstraints,
    });

    expect(result.newWidth).toBe(280);
  });

  it("clamps width to maxWidth", () => {
    const result = calculateRightResize({
      deltaX: 500,
      startWidth: 320,
      cardRight: 500,
      viewportWidth,
      constraints: defaultConstraints,
    });

    expect(result.newWidth).toBe(600);
  });

  it("clamps expansion to viewport edge", () => {
    const result = calculateRightResize({
      deltaX: 200,
      startWidth: 320,
      cardRight: 950, // Only 66px available (1024 - 8 - 950)
      viewportWidth,
      constraints: defaultConstraints,
    });

    expect(result.newWidth).toBe(386); // 320 + 66
  });

  it("prevents card from going past right edge margin", () => {
    const result = calculateRightResize({
      deltaX: 100,
      startWidth: 320,
      cardRight: 1000, // Only 16px available
      viewportWidth,
      constraints: defaultConstraints,
    });

    expect(result.newWidth).toBe(336); // 320 + 16
  });

  it("handles card already at right edge", () => {
    const result = calculateRightResize({
      deltaX: 50,
      startWidth: 320,
      cardRight: 1016, // Already at edge margin
      viewportWidth,
      constraints: defaultConstraints,
    });

    // No expansion possible
    expect(result.newWidth).toBe(320);
  });

  it("handles zero deltaX", () => {
    const result = calculateRightResize({
      deltaX: 0,
      startWidth: 320,
      cardRight: 500,
      viewportWidth,
      constraints: defaultConstraints,
    });

    expect(result.newWidth).toBe(320);
  });

  it("handles narrow viewport", () => {
    const result = calculateRightResize({
      deltaX: 50,
      startWidth: 300,
      cardRight: 350,
      viewportWidth: 400, // Narrow viewport
      constraints: { ...defaultConstraints, minWidth: 200 },
    });

    // Max available: 400 - 8 - 350 = 42
    expect(result.newWidth).toBe(342);
  });
});

const defaultHeightConstraints: HeightResizeConstraints = {
  minHeight: 120,
  maxHeight: 600,
  edgeMargin: 8,
};

describe("clampHeight", () => {
  it("returns height when within bounds", () => {
    expect(clampHeight(400, 120, 600)).toBe(400);
  });

  it("returns minHeight when height is below minimum", () => {
    expect(clampHeight(100, 120, 600)).toBe(120);
  });

  it("returns maxHeight when height is above maximum", () => {
    expect(clampHeight(700, 120, 600)).toBe(600);
  });

  it("handles edge case where height equals minHeight", () => {
    expect(clampHeight(120, 120, 600)).toBe(120);
  });

  it("handles edge case where height equals maxHeight", () => {
    expect(clampHeight(600, 120, 600)).toBe(600);
  });

  it("handles negative height", () => {
    expect(clampHeight(-100, 120, 600)).toBe(120);
  });
});

describe("calculateMaxBottomExpansion", () => {
  it("calculates available space to bottom edge", () => {
    // viewportHeight=768, cardBottom=500, margin=8 => 768 - 8 - 500 = 260
    expect(calculateMaxBottomExpansion(500, 768, 8)).toBe(260);
  });

  it("returns zero when card is at edge margin", () => {
    // viewportHeight=768, cardBottom=760, margin=8 => 768 - 8 - 760 = 0
    expect(calculateMaxBottomExpansion(760, 768, 8)).toBe(0);
  });

  it("returns negative when card is past edge margin", () => {
    expect(calculateMaxBottomExpansion(764, 768, 8)).toBe(-4);
  });

  it("handles zero margin", () => {
    expect(calculateMaxBottomExpansion(500, 768, 0)).toBe(268);
  });
});

describe("calculateBottomResize", () => {
  const viewportHeight = 768;

  it("increases height when dragging down (positive deltaY)", () => {
    const result = calculateBottomResize({
      deltaY: 50,
      startHeight: 180,
      cardBottom: 400,
      viewportHeight,
      constraints: defaultHeightConstraints,
    });

    expect(result.newHeight).toBe(230);
  });

  it("decreases height when dragging up (negative deltaY)", () => {
    const result = calculateBottomResize({
      deltaY: -30,
      startHeight: 200,
      cardBottom: 400,
      viewportHeight,
      constraints: defaultHeightConstraints,
    });

    expect(result.newHeight).toBe(170);
  });

  it("clamps height to minHeight", () => {
    const result = calculateBottomResize({
      deltaY: -200,
      startHeight: 180,
      cardBottom: 400,
      viewportHeight,
      constraints: defaultHeightConstraints,
    });

    expect(result.newHeight).toBe(120);
  });

  it("clamps height to maxHeight", () => {
    const result = calculateBottomResize({
      deltaY: 500,
      startHeight: 180,
      cardBottom: 100, // Low enough so viewport edge doesn't limit first
      viewportHeight,
      constraints: defaultHeightConstraints,
    });

    expect(result.newHeight).toBe(600);
  });

  it("clamps expansion to viewport bottom edge", () => {
    const result = calculateBottomResize({
      deltaY: 200,
      startHeight: 180,
      cardBottom: 700, // Only 60px available (768 - 8 - 700)
      viewportHeight,
      constraints: defaultHeightConstraints,
    });

    expect(result.newHeight).toBe(240); // 180 + 60
  });

  it("prevents card from going past bottom edge margin", () => {
    const result = calculateBottomResize({
      deltaY: 100,
      startHeight: 180,
      cardBottom: 740, // Only 20px available
      viewportHeight,
      constraints: defaultHeightConstraints,
    });

    expect(result.newHeight).toBe(200); // 180 + 20
  });

  it("handles card already at bottom edge", () => {
    const result = calculateBottomResize({
      deltaY: 50,
      startHeight: 180,
      cardBottom: 760, // Already at edge margin
      viewportHeight,
      constraints: defaultHeightConstraints,
    });

    // No expansion possible
    expect(result.newHeight).toBe(180);
  });

  it("handles zero deltaY", () => {
    const result = calculateBottomResize({
      deltaY: 0,
      startHeight: 180,
      cardBottom: 400,
      viewportHeight,
      constraints: defaultHeightConstraints,
    });

    expect(result.newHeight).toBe(180);
  });

  it("handles short viewport", () => {
    const result = calculateBottomResize({
      deltaY: 50,
      startHeight: 150,
      cardBottom: 350,
      viewportHeight: 400, // Short viewport
      constraints: { ...defaultHeightConstraints, minHeight: 100 },
    });

    // Max available: 400 - 8 - 350 = 42
    expect(result.newHeight).toBe(192);
  });
});
