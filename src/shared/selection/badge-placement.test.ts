/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { placeSelectionBadge } from "./badge-placement";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});
describe("selection toolbar collision avoidance", () => {
  it("keeps the preferred endpoint position when free, but shifts beside a host button", () => {
    const badge = document.createElement("button");
    badge.dataset.flashTranslateUi = "badge";
    const host = document.createElement("button");
    document.body.append(host, badge);
    vi.spyOn(host, "getBoundingClientRect").mockReturnValue(
      new DOMRect(107, 126, 30, 30)
    );
    Object.defineProperty(document, "elementsFromPoint", {
      configurable: true,
      value: (x: number, y: number) =>
        x >= 107 && x <= 137 && y >= 126 && y <= 156 ? [badge, host] : [badge],
    });
    const cleanup = placeSelectionBadge(badge, new DOMRect(100, 100, 1, 20));
    expect(badge.style.left).toBe("141px");
    expect(badge.style.top).toBe("126px");
    expect(badge.style.visibility).toBe("visible");
    cleanup();
  });
  it("avoids a toolbar appearing after selection, without polling forever", () => {
    vi.useFakeTimers();
    const badge = document.createElement("button");
    badge.dataset.flashTranslateUi = "badge";
    const host = document.createElement("div");
    host.style.position = "fixed";
    document.body.append(host, badge);
    vi.spyOn(host, "getBoundingClientRect").mockReturnValue(
      new DOMRect(107, 126, 30, 30)
    );
    let visible = false;
    Object.defineProperty(document, "elementsFromPoint", {
      configurable: true,
      value: (x: number) => (visible && x < 138 ? [host, badge] : [badge]),
    });
    const cleanup = placeSelectionBadge(badge, new DOMRect(100, 100, 1, 20));
    expect(badge.style.left).toBe("107px");
    visible = true;
    vi.advanceTimersByTime(120);
    expect(badge.style.left).toBe("141px");
    cleanup();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not treat ordinary note text as a floating control", () => {
    const paragraph = document.createElement("p");
    const badge = document.createElement("button");
    document.body.append(paragraph, badge);
    Object.defineProperty(document, "elementsFromPoint", {
      configurable: true,
      value: () => [paragraph],
    });
    const cleanup = placeSelectionBadge(badge, new DOMRect(100, 100, 1, 20));
    expect(badge.style.left).toBe("107px");
    cleanup();
  });
});
