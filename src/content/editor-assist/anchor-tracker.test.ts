import { describe, expect, it } from "vitest";
import { areAnchorRectsEqual } from "./anchor-tracker";
import type { RectLike } from "./types";

const RECT: RectLike = {
  bottom: 30,
  height: 10,
  left: 10,
  right: 40,
  top: 20,
  width: 30,
  x: 10,
  y: 20,
};

describe("areAnchorRectsEqual", () => {
  it("keeps an unchanged anchor from scheduling another update", () => {
    expect(areAnchorRectsEqual(RECT, { ...RECT })).toBe(true);
  });

  it("detects a meaningful anchor position change", () => {
    expect(areAnchorRectsEqual(RECT, { ...RECT, top: 21, y: 21 })).toBe(false);
  });
});
