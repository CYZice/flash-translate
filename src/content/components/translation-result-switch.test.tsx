/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TranslationResultSwitch } from "./translation-result-switch";

const originalChrome = globalThis.chrome;

describe("TranslationResultSwitch", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: { i18n: { getMessage: (key: string) => key } },
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: originalChrome,
    });
  });

  it("shows only the local control when AI is unavailable", () => {
    act(() => {
      root.render(
        <TranslationResultSwitch
          activeView="local"
          aiAvailable={false}
          aiIsLoading={false}
          onViewChange={vi.fn()}
        />
      );
    });

    expect(container.querySelectorAll("button")).toHaveLength(1);
  });

  it("switches to AI on request", () => {
    const onViewChange = vi.fn();
    act(() => {
      root.render(
        <TranslationResultSwitch
          activeView="local"
          aiAvailable
          aiIsLoading={false}
          onViewChange={onViewChange}
        />
      );
    });

    act(() => {
      container
        .querySelector<HTMLButtonElement>('[title="content_resultAi"]')
        ?.click();
    });
    expect(onViewChange).toHaveBeenCalledWith("ai");
  });

  it("renders the AI control as an icon-only button", () => {
    act(() => {
      root.render(
        <TranslationResultSwitch
          activeView="local"
          aiAvailable
          aiIsLoading={false}
          onViewChange={vi.fn()}
        />
      );
    });

    const aiButton = container.querySelector<HTMLButtonElement>(
      '[title="content_resultAi"]'
    );
    expect(aiButton?.querySelector("svg")).not.toBeNull();
    expect(aiButton?.querySelector(".sr-only")?.textContent).toBe(
      "content_resultAi"
    );
  });
});
