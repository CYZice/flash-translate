/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TranslationResultSwitch,
  type TranslationResultView,
} from "./translation-result-switch";

let container: HTMLDivElement;
let root: Root;
const onViewChange = vi.fn();

function render(
  activeView: TranslationResultView,
  aiAvailable = true,
  aiIsLoading = false
) {
  act(() =>
    root.render(
      <TranslationResultSwitch
        activeView={activeView}
        aiAvailable={aiAvailable}
        aiIsLoading={aiIsLoading}
        onViewChange={onViewChange}
      />
    )
  );
  return container.querySelector<HTMLButtonElement>("button");
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("chrome", {
    i18n: {
      getMessage: (key: string, values?: string[]) =>
        values ? `${key}: ${values.join(" → ")}` : key,
    },
  });
  onViewChange.mockClear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("TranslationResultSwitch", () => {
  it("uses a single icon-only button to switch in both directions", () => {
    const button = render("local");
    expect(container.querySelectorAll("button")).toHaveLength(1);
    expect(button?.textContent).toBe("");
    expect(button?.classList.contains("w-7")).toBe(true);
    expect(button?.querySelector(".lucide-languages")).not.toBeNull();
    expect(button?.getAttribute("aria-label")).toContain(
      "Chrome → content_resultAi"
    );
    act(() => button?.click());
    expect(onViewChange).toHaveBeenLastCalledWith("ai");

    const aiButton = render("ai");
    expect(aiButton?.textContent).toBe("");
    expect(aiButton?.querySelector(".lucide-sparkles")).not.toBeNull();
    act(() => aiButton?.click());
    expect(onViewChange).toHaveBeenLastCalledWith("local");
    expect(onViewChange).toHaveBeenCalledTimes(2);
  });

  it("does not switch to an unconfigured AI provider", () => {
    const button = render("local", false);
    expect(button?.disabled).toBe(true);
    act(() => button?.click());
    expect(onViewChange).not.toHaveBeenCalled();
  });

  it("indicates loading without blocking a switch back to Chrome", () => {
    const button = render("ai", true, true);
    expect(button?.getAttribute("aria-busy")).toBe("true");
    expect(button?.disabled).toBe(false);
    act(() => button?.click());
    expect(onViewChange).toHaveBeenCalledWith("local");
  });
});
