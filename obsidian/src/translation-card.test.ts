/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TranslationCard,
  type TranslationCardContent,
} from "./translation-card";
import { TranslationRequestQueue } from "./translation-request-queue";

vi.mock("obsidian", () => ({ setIcon: vi.fn() }));

const anchor = {
  left: 100,
  right: 200,
  top: 100,
  bottom: 120,
  width: 100,
  height: 20,
};
const cards: TranslationCard[] = [];
function preview(
  content: Partial<TranslationCardContent> = {},
  onClose = vi.fn()
): TranslationCard {
  const card = new TranslationCard(document, onClose);
  cards.push(card);
  card.update(
    {
      text: "Hello",
      model: "test",
      sourceLanguage: "auto",
      targetLanguage: "fr",
      translate: async () => "Bonjour",
      ...content,
    },
    anchor
  );
  return card;
}
function button(label: string): HTMLButtonElement {
  return required(document.querySelector(`button[aria-label="${label}"]`));
}
afterEach(() => {
  for (const card of cards.splice(0)) {
    card.close();
  }
  document.body.replaceChildren();
  Reflect.deleteProperty(navigator, "clipboard");
  vi.restoreAllMocks();
});

describe("non-modal translation card", () => {
  it("renders note actions as labelled icons in the same compact footer", async () => {
    preview({ apply: vi.fn() });
    await Promise.resolve();
    const footer = document.querySelector(".flash-translate-footer");
    for (const label of [
      "Retry",
      "Copy translation",
      "Insert below",
      "Replace selection",
    ]) {
      const action = button(label);
      expect(action.classList.contains("flash-translate-icon")).toBe(true);
      expect(action.textContent).toBe("");
      expect(action.title).toBe(label);
      expect(footer?.contains(action)).toBe(true);
    }
    expect(button("Retry").hidden).toBe(true);
  });
  it("has no modal, settings, or edit actions for rendered output", async () => {
    preview();
    await Promise.resolve();
    expect(document.querySelector('[role="region"]')).not.toBeNull();
    expect(
      document.querySelector('[role="dialog"],.modal-container')
    ).toBeNull();
    expect(document.querySelector("textarea")?.value).toBe("Bonjour");
    expect(document.querySelector(".flash-translate-edits")).toBeNull();
    expect(document.querySelector('[aria-label="Settings"]')).toBeNull();
  });

  it("preserves pinned coordinates and resized dimensions on a different selection", () => {
    const card = preview();
    button("Pin position").click();
    const root = required(
      document.querySelector<HTMLElement>(".flash-translate-card")
    );
    Object.assign(root.style, {
      left: "120px",
      top: "80px",
      width: "420px",
      height: "300px",
    });
    card.update(
      {
        text: "Next",
        model: "test",
        sourceLanguage: "en",
        targetLanguage: "zh",
        translate: async () => "下一个",
      },
      { ...anchor, left: 600, right: 700 }
    );
    const next = required(
      document.querySelector<HTMLElement>(".flash-translate-card")
    );
    expect(document.querySelectorAll(".flash-translate-card")).toHaveLength(1);
    expect(card.isPinned).toBe(true);
    expect([
      next.style.left,
      next.style.top,
      next.style.width,
      next.style.height,
    ]).toEqual(["120px", "80px", "420px", "300px"]);
    expect(button("Pin position").getAttribute("aria-pressed")).toBe("true");
  });

  it("can move from its header without moving when the target select receives arrows", () => {
    preview();
    const root = required(
      document.querySelector<HTMLElement>(".flash-translate-card")
    );
    const header = required(
      document.querySelector<HTMLElement>(".flash-translate-header")
    );
    const left = Number.parseFloat(root.style.left);
    header.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(Number.parseFloat(root.style.left)).toBe(left + 10);
    required(document.querySelector("select")).dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(Number.parseFloat(root.style.left)).toBe(left + 10);
  });

  it("applies edited output only when an edit callback exists and keeps failed edits visible", async () => {
    const apply = vi.fn().mockImplementationOnce(() => {
      throw new Error("The note changed");
    });
    preview({ apply });
    await Promise.resolve();
    required(document.querySelector("textarea")).value = "Edited";
    button("Insert below").click();
    expect(apply).toHaveBeenCalledWith("Edited", "insert");
    expect(document.querySelector('[role="status"]')?.textContent).toBe(
      "The note changed"
    );
    button("Replace selection").click();
    expect(apply).toHaveBeenLastCalledWith("Edited", "replace");
    expect(document.querySelector(".flash-translate-card")).toBeNull();
  });

  it("cancels obsolete targets and closes before the native transport settles", async () => {
    let finish!: (response: { status: number; text: string }) => void;
    const http = vi.fn(
      () =>
        new Promise<{ status: number; text: string }>((resolve) => {
          finish = resolve;
        })
    );
    const queue = new TranslationRequestQueue(http);
    const card = preview({
      translate: async (target, signal) =>
        (
          await queue.request(
            {
              url: "https://provider.example",
              method: "POST",
              body: target,
              headers: {},
              throw: false,
            },
            signal
          )
        ).text,
    });
    const select = required(document.querySelector("select"));
    for (const target of ["zh", "en"]) {
      select.value = target;
      select.dispatchEvent(new Event("change"));
    }
    expect(http).toHaveBeenCalledTimes(1);
    card.close();
    await Promise.resolve();
    expect(Reflect.get(card, "controller")).toBeNull();
    expect(Reflect.get(card, "options")).toBeNull();
    finish({ status: 200, text: "Late" });
    await Promise.resolve();
    expect(http).toHaveBeenCalledTimes(1);
  });

  it.each(["resolve", "reject"])(
    "clears text, callbacks, DOM and listeners before a late %s",
    async (outcome) => {
      let resolve!: (text: string) => void;
      let reject!: (error: Error) => void;
      const request = new Promise<string>((done, fail) => {
        resolve = done;
        reject = fail;
      });
      const onClose = vi.fn();
      const remove = vi.spyOn(window, "removeEventListener");
      const card = preview(
        { translate: () => request, apply: vi.fn() },
        onClose
      );
      const result = required(document.querySelector("textarea"));
      result.value = "Draft";
      card.close();
      for (const key of [
        "root",
        "options",
        "resultEl",
        "statusEl",
        "retry",
        "controller",
        "drag",
      ]) {
        expect(Reflect.get(card, key)).toBeNull();
      }
      expect(Reflect.get(card, "actions")).toEqual([]);
      expect(result.value).toBe("");
      expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
      if (outcome === "resolve") {
        resolve("Late");
      } else {
        reject(new Error("Late"));
      }
      await Promise.resolve();
      expect(result.value).toBe("");
      card.close();
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  );

  it("never lets an obsolete result overwrite the new selection", async () => {
    let finish!: (value: string) => void;
    const card = preview({
      translate: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    });
    card.update(
      {
        text: "Next",
        model: "test",
        sourceLanguage: "auto",
        targetLanguage: "fr",
        translate: async () => "Current",
      },
      anchor
    );
    await Promise.resolve();
    finish("Old");
    await Promise.resolve();
    expect(document.querySelector("textarea")?.value).toBe("Current");
  });

  it("keeps the chosen target language across new selections", async () => {
    const card = preview();
    const target = required(document.querySelector("select"));
    target.value = "zh";
    target.dispatchEvent(new Event("change"));
    const translate = vi.fn(async () => "新内容");
    card.update(
      {
        text: "Next",
        model: "test",
        sourceLanguage: "auto",
        targetLanguage: "fr",
        translate,
      },
      anchor
    );
    await Promise.resolve();
    expect(document.querySelector("select")?.value).toBe("zh");
    expect(translate).toHaveBeenCalledWith("zh", expect.any(AbortSignal));
  });

  it("restores the configured target when leaving automatic bilingual mode", () => {
    const card = preview({ autoZhEn: true, targetLanguage: "zh" });
    card.update(
      {
        text: "Next",
        model: "test",
        sourceLanguage: "auto",
        targetLanguage: "fr",
        autoZhEn: false,
        translate: async () => "Suite",
      },
      anchor
    );
    expect(document.querySelector("select")?.value).toBe("fr");
  });

  it("explains clipboard failures without closing the result", async () => {
    preview();
    await Promise.resolve();
    button("Copy translation").click();
    await Promise.resolve();
    expect(document.querySelector('[role="status"]')?.textContent).toBe(
      "Select and copy the translation manually."
    );
    expect(document.querySelector("textarea")?.value).toBe("Bonjour");
  });

  it("copies the edited output and ignores clipboard completion after close", async () => {
    let finish!: () => void;
    const writeText = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const card = preview();
    await Promise.resolve();
    required(document.querySelector("textarea")).value = "Edited output";
    button("Copy translation").click();
    expect(writeText).toHaveBeenCalledWith("Edited output");
    card.close();
    finish();
    await Promise.resolve();
    expect(Reflect.get(card, "statusEl")).toBeNull();
    expect(document.querySelector(".flash-translate-card")).toBeNull();
  });
});

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing test fixture");
  }
  return value;
}
