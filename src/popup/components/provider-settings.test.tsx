/**
 * @vitest-environment jsdom
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ContextPreview } from "./provider-settings";

const originalChrome = globalThis.chrome;

describe("ContextPreview", () => {
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

  it("shows only the selected example when context is disabled", () => {
    act(() => root.render(<ContextPreview sentenceCount={0} />));

    expect(container.textContent).toContain("popup_ai_contextSelected");
    expect(container.textContent).not.toContain("popup_ai_contextBefore");
    expect(container.textContent).not.toContain("popup_ai_contextAfter");
  });

  it("updates both sides for the selected sentence count", () => {
    act(() => root.render(<ContextPreview sentenceCount={2} />));

    expect(container.textContent).toContain("第二句补充当前进度。");
    expect(container.textContent).toContain("第三句说明关键术语。");
    expect(container.textContent).toContain("第一句说明输出要求。");
    expect(container.textContent).toContain("第二句提示请求长度。");
    expect(container.textContent).not.toContain("第一句介绍项目背景。");
    expect(container.textContent).not.toContain("第三句给出使用建议。");
  });
});
