import { describe, expect, it } from "vitest";
import { isPointInsideViewportRect } from "./hovered-term";

const RECT = {
  top: 20,
  right: 80,
  bottom: 40,
  left: 30,
  width: 50,
  height: 20,
};

describe("isPointInsideViewportRect", () => {
  it("includes points inside the rectangle and on its boundary", () => {
    expect(isPointInsideViewportRect(RECT, 50, 30)).toBe(true);
    expect(isPointInsideViewportRect(RECT, 30, 20)).toBe(true);
    expect(isPointInsideViewportRect(RECT, 80, 40)).toBe(true);
  });

  it("excludes points outside the rectangle", () => {
    expect(isPointInsideViewportRect(RECT, 29, 30)).toBe(false);
    expect(isPointInsideViewportRect(RECT, 50, 41)).toBe(false);
  });
});
