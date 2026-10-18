/** @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_USAGE, type TranslationUsage } from "@/shared/translation/usage";
import { UsageStatistics } from "./usage-statistics";

const host = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/storage/usage", () => ({
  getUsage: host.get,
  USAGE_STORAGE_KEY: "usage",
}));
let root: Root;
let container: HTMLDivElement;
let listeners: Set<(changes: unknown, area: string) => void>;
beforeEach(() => {
  listeners = new Set();
  host.get.mockReset();
  vi.stubGlobal("chrome", {
    i18n: { getUILanguage: () => "zh-CN" },
    storage: {
      onChanged: {
        addListener: (fn: (changes: unknown, area: string) => void) =>
          listeners.add(fn),
        removeListener: (fn: (changes: unknown, area: string) => void) =>
          listeners.delete(fn),
      },
    },
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
function update(usage: TranslationUsage): void {
  for (const listener of listeners) {
    listener({ usage: { newValue: usage } }, "local");
  }
}

describe("usage display lifecycle", () => {
  it("shows missing tokens explicitly, updates live, and cleans up its subscription", async () => {
    host.get.mockResolvedValue({ ...EMPTY_USAGE, aiRequests: 1 });
    await act(async () => root.render(<UsageStatistics />));
    expect(container.querySelectorAll("dd")[4].textContent).toBe("—");
    await act(async () =>
      update({
        ...EMPTY_USAGE,
        completedTranslations: 2,
        aiRequests: 2,
        reportedRequests: 1,
        inputTokens: 100,
        outputTokens: 20,
        totalTokens: 120,
      })
    );
    expect(container.querySelectorAll("dd")[4].textContent).toBe("120");
    expect(container.querySelectorAll("dd")[5].textContent).toBe("1");
    act(() => root.unmount());
    expect(listeners.size).toBe(0);
    root = createRoot(container);
  });
  it("does not overwrite a newer storage event with the initial read", async () => {
    let finish: (value: TranslationUsage) => void = () => undefined;
    host.get.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    await act(async () => root.render(<UsageStatistics />));
    await act(async () => {
      update({ ...EMPTY_USAGE, completedTranslations: 3 });
      finish({ ...EMPTY_USAGE });
      await Promise.resolve();
    });
    expect(container.querySelectorAll("dd")[0].textContent).toBe("3");
  });
  it("reports read errors rather than showing zero", async () => {
    host.get.mockRejectedValue(new Error("Storage unavailable"));
    await act(async () => root.render(<UsageStatistics />));
    expect(container.textContent).toBe("无法读取用量统计");
    expect(container.querySelector("dd")).toBeNull();
  });
});
