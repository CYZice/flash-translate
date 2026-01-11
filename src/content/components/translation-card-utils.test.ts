import { describe, expect, it } from "vitest";
import {
  CARD_EDGE_MARGIN,
  calculateCardWidth,
  calculateMaxCardWidth,
  MIN_CARD_WIDTH,
} from "./translation-card-utils";

describe("translationCard pure functions", () => {
  describe("calculateCardWidth", () => {
    const maxWidth = 800;

    it("returns selection width when within bounds", () => {
      expect(calculateCardWidth(400, maxWidth)).toBe(400);
      expect(calculateCardWidth(500, maxWidth)).toBe(500);
    });

    it("returns MIN_CARD_WIDTH when selection is narrower", () => {
      expect(calculateCardWidth(100, maxWidth)).toBe(MIN_CARD_WIDTH);
      expect(calculateCardWidth(200, maxWidth)).toBe(MIN_CARD_WIDTH);
      expect(calculateCardWidth(0, maxWidth)).toBe(MIN_CARD_WIDTH);
    });

    it("returns maxWidth when selection is wider", () => {
      expect(calculateCardWidth(1000, maxWidth)).toBe(maxWidth);
      expect(calculateCardWidth(900, maxWidth)).toBe(maxWidth);
    });

    it("returns MIN_CARD_WIDTH exactly at boundary", () => {
      expect(calculateCardWidth(MIN_CARD_WIDTH, maxWidth)).toBe(MIN_CARD_WIDTH);
    });

    it("returns maxWidth exactly at boundary", () => {
      expect(calculateCardWidth(maxWidth, maxWidth)).toBe(maxWidth);
    });

    it("handles edge case where maxWidth is less than MIN_CARD_WIDTH", () => {
      // When viewport is very narrow, maxWidth could be less than MIN_CARD_WIDTH
      const narrowMax = 200;
      // Math.min(Math.max(100, 280), 200) = Math.min(280, 200) = 200
      expect(calculateCardWidth(100, narrowMax)).toBe(narrowMax);
    });
  });

  describe("calculateMaxCardWidth", () => {
    it("subtracts CARD_EDGE_MARGIN from viewport width", () => {
      expect(calculateMaxCardWidth(1920)).toBe(1920 - CARD_EDGE_MARGIN);
      expect(calculateMaxCardWidth(1024)).toBe(1024 - CARD_EDGE_MARGIN);
      expect(calculateMaxCardWidth(375)).toBe(375 - CARD_EDGE_MARGIN);
    });

    it("returns correct margin value", () => {
      // Ensure the margin is 32px (16px on each side)
      expect(CARD_EDGE_MARGIN).toBe(32);
    });
  });
});
