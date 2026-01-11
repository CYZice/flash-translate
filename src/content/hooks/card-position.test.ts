import { describe, expect, it } from "vitest";
import {
  calculateCardPosition,
  calculateHorizontalPosition,
  calculateVerticalPosition,
  MIN_CARD_HEIGHT,
  type RectLike,
} from "./card-position";

// Helper to create a selection rect for testing
function createRect(overrides: Partial<RectLike> = {}): RectLike {
  return {
    left: 100,
    right: 200,
    top: 100,
    bottom: 120,
    width: 100,
    height: 20,
    ...overrides,
  };
}

describe("calculateHorizontalPosition", () => {
  const cardWidth = 320;
  const viewportWidth = 1024;
  const margin = 8;

  it("centers card on selection when space is available", () => {
    const rect = createRect({ left: 400, right: 500, width: 100 });
    // Center of selection: 400 + 100/2 = 450
    // Popup left: 450 - 320/2 = 290
    const x = calculateHorizontalPosition(
      rect,
      cardWidth,
      viewportWidth,
      margin
    );
    expect(x).toBe(290);
  });

  it("handles selection at center of viewport", () => {
    const rect = createRect({ left: 462, right: 562, width: 100 });
    // Center: 462 + 50 = 512 (center of 1024)
    // Popup left: 512 - 160 = 352
    const x = calculateHorizontalPosition(
      rect,
      cardWidth,
      viewportWidth,
      margin
    );
    expect(x).toBe(352);
  });

  it("clamps to left margin when selection is near left edge", () => {
    const rect = createRect({ left: 0, right: 50, width: 50 });
    // Would calculate: 0 + 25 - 160 = -135, but clamped to margin
    const x = calculateHorizontalPosition(
      rect,
      cardWidth,
      viewportWidth,
      margin
    );
    expect(x).toBe(margin);
  });

  it("clamps to right margin when selection is near right edge", () => {
    const rect = createRect({ left: 950, right: 1024, width: 74 });
    // Would overflow right edge, so clamp
    const x = calculateHorizontalPosition(
      rect,
      cardWidth,
      viewportWidth,
      margin
    );
    expect(x).toBe(viewportWidth - cardWidth - margin);
  });

  it("handles narrow viewport where card fills available space", () => {
    const narrowViewport = 340; // Only slightly wider than card
    const rect = createRect({ left: 10, right: 60, width: 50 });
    const x = calculateHorizontalPosition(
      rect,
      cardWidth,
      narrowViewport,
      margin
    );
    // Should clamp to left margin since card barely fits
    expect(x).toBe(margin);
  });

  it("handles selection wider than card", () => {
    const rect = createRect({ left: 100, right: 500, width: 400 });
    // Center: 100 + 200 = 300
    // Popup left: 300 - 160 = 140
    const x = calculateHorizontalPosition(
      rect,
      cardWidth,
      viewportWidth,
      margin
    );
    expect(x).toBe(140);
  });

  it("handles zero margin", () => {
    const rect = createRect({ left: 0, right: 50, width: 50 });
    const x = calculateHorizontalPosition(rect, cardWidth, viewportWidth, 0);
    // Would be: 0 + 25 - 160 = -135, clamped to 0
    expect(x).toBe(0);
  });
});

describe("calculateVerticalPosition", () => {
  const cardHeight = 150;
  const viewportHeight = 768;
  const margin = 8;

  it("places card below selection when sufficient space", () => {
    const rect = createRect({ top: 100, bottom: 120 });
    const result = calculateVerticalPosition(
      rect,
      cardHeight,
      viewportHeight,
      margin
    );

    expect(result.placement).toBe("bottom");
    expect(result.y).toBe(120 + margin);
  });

  it("calculates correct maxHeight for bottom placement", () => {
    const rect = createRect({ top: 100, bottom: 120 });
    const result = calculateVerticalPosition(
      rect,
      cardHeight,
      viewportHeight,
      margin
    );

    // spaceBelow = 768 - 120 - 16 = 632
    expect(result.maxHeight).toBe(632);
  });

  it("places card above selection when no space below", () => {
    const rect = createRect({ top: 600, bottom: 700 });
    // Space below: 768 - 700 - 8 - 150 = -90 (not enough)
    // Space above: 600 - 8 - 150 = 442 (enough)
    const result = calculateVerticalPosition(
      rect,
      cardHeight,
      viewportHeight,
      margin
    );

    expect(result.placement).toBe("top");
    expect(result.y).toBe(600 - margin - cardHeight);
  });

  it("calculates correct maxHeight for top placement", () => {
    const rect = createRect({ top: 600, bottom: 700 });
    const result = calculateVerticalPosition(
      rect,
      cardHeight,
      viewportHeight,
      margin
    );

    // spaceAbove = 600 - 16 = 584
    expect(result.maxHeight).toBe(584);
  });

  it("falls back to bottom when neither above nor below has full space", () => {
    const tinyViewport = 200;
    const rect = createRect({ top: 80, bottom: 120 });
    // Not enough space above or below for full card
    const result = calculateVerticalPosition(
      rect,
      cardHeight,
      tinyViewport,
      margin
    );

    expect(result.placement).toBe("bottom");
    expect(result.y).toBe(120 + margin);
  });

  it("ensures minimum height constraint", () => {
    const tinyViewport = 130;
    const rect = createRect({ top: 50, bottom: 70 });
    // spaceBelow = 130 - 70 - 16 = 44 (less than MIN_CARD_HEIGHT)
    const result = calculateVerticalPosition(
      rect,
      cardHeight,
      tinyViewport,
      margin
    );

    expect(result.maxHeight).toBe(MIN_CARD_HEIGHT);
  });

  it("handles selection at top of viewport", () => {
    const rect = createRect({ top: 0, bottom: 20 });
    const result = calculateVerticalPosition(
      rect,
      cardHeight,
      viewportHeight,
      margin
    );

    // Should place below since above has no space
    expect(result.placement).toBe("bottom");
    expect(result.y).toBe(20 + margin);
  });

  it("handles selection at bottom of viewport", () => {
    const rect = createRect({ top: 700, bottom: 768 });
    const result = calculateVerticalPosition(
      rect,
      cardHeight,
      viewportHeight,
      margin
    );

    // Should place above since below has no space
    expect(result.placement).toBe("top");
    expect(result.y).toBe(700 - margin - cardHeight);
  });

  it("handles zero margin", () => {
    const rect = createRect({ top: 100, bottom: 120 });
    const result = calculateVerticalPosition(
      rect,
      cardHeight,
      viewportHeight,
      0
    );

    expect(result.y).toBe(120);
    // spaceBelow = 768 - 120 - 0 = 648
    expect(result.maxHeight).toBe(648);
  });
});

describe("calculateCardPosition", () => {
  const defaultOptions = {
    cardWidth: 320,
    cardHeight: 150,
    margin: 8,
  };
  const defaultViewport = {
    width: 1024,
    height: 768,
  };

  it("returns complete position object with defaults", () => {
    const rect = createRect({ left: 400, right: 500, top: 100, bottom: 120 });
    const result = calculateCardPosition(rect, defaultOptions, defaultViewport);

    expect(result).toHaveProperty("x");
    expect(result).toHaveProperty("y");
    expect(result).toHaveProperty("placement");
    expect(result).toHaveProperty("maxHeight");
  });

  it("respects custom cardWidth option", () => {
    const rect = createRect({ left: 0, right: 50, width: 50 });
    const options = { ...defaultOptions, cardWidth: 200 };
    const result = calculateCardPosition(rect, options, defaultViewport);

    // With smaller card, more room to position
    expect(result.x).toBeGreaterThanOrEqual(defaultOptions.margin);
  });

  it("respects custom cardHeight option", () => {
    const rect = createRect({ top: 600, bottom: 650 });
    const options = { ...defaultOptions, cardHeight: 50 };
    const result = calculateCardPosition(rect, options, defaultViewport);

    // With smaller card, should fit below
    expect(result.placement).toBe("bottom");
  });

  it("respects custom margin option", () => {
    const rect = createRect({ left: 0, right: 50 });
    const options = { ...defaultOptions, margin: 20 };
    const result = calculateCardPosition(rect, options, defaultViewport);

    expect(result.x).toBe(20);
  });

  it("handles small viewport (mobile)", () => {
    const mobileViewport = { width: 375, height: 667 };
    const rect = createRect({ left: 100, right: 200, top: 300, bottom: 320 });
    const result = calculateCardPosition(rect, defaultOptions, mobileViewport);

    // Should clamp to fit within mobile viewport
    expect(result.x).toBeLessThanOrEqual(
      mobileViewport.width - defaultOptions.cardWidth - defaultOptions.margin
    );
    expect(result.x).toBeGreaterThanOrEqual(defaultOptions.margin);
  });

  it("handles large viewport (desktop)", () => {
    const desktopViewport = { width: 1920, height: 1080 };
    const rect = createRect({ left: 800, right: 900, top: 400, bottom: 420 });
    const result = calculateCardPosition(rect, defaultOptions, desktopViewport);

    // Should center on selection
    const expectedX = 800 + 50 - 160; // 690
    expect(result.x).toBe(expectedX);
    expect(result.placement).toBe("bottom");
  });

  it("handles selection spanning most of viewport width", () => {
    const rect = createRect({ left: 50, right: 974, width: 924 });
    const result = calculateCardPosition(rect, defaultOptions, defaultViewport);

    // Center of selection: 50 + 462 = 512
    // Popup left: 512 - 160 = 352
    expect(result.x).toBe(352);
  });
});
