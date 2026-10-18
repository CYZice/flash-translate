import type { App } from "obsidian";
import { describe, expect, it, vi } from "vitest";
import { captureSelection } from "./selection";
import { TranslationPreview } from "./translation-modal";
import { TranslationRequestQueue } from "./translation-request-queue";

vi.mock("obsidian", () => ({
  Modal: class {
    contentEl = { empty: vi.fn() };
  },
  ButtonComponent: vi.fn(),
  DropdownComponent: vi.fn(),
}));

describe("translation preview disposal", () => {
  it("cancels obsolete target tasks and returns from close before native HTTP settles", async () => {
    let finish!: (response: { status: number; text: string }) => void;
    const http = vi.fn(
      () =>
        new Promise<{ status: number; text: string }>((resolve) => {
          finish = resolve;
        })
    );
    const queue = new TranslationRequestQueue(http);
    const preview = new TranslationPreview(
      {} as App,
      captureSelection("Hello", "Example.md", 0, 5, 0),
      {
        model: "test",
        targetLanguage: "fr",
        apply: vi.fn(),
        onClose: vi.fn(),
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
      }
    );
    const run = Reflect.get(preview, "runTranslation") as () => Promise<void>;
    const first = run.call(preview);
    Reflect.set(preview, "target", "zh");
    const second = run.call(preview);
    Reflect.set(preview, "target", "en");
    const latest = run.call(preview);
    expect(http).toHaveBeenCalledTimes(1);
    preview.onClose();
    await Promise.all([first, second, latest]);
    expect(Reflect.get(preview, "controller")).toBeNull();
    expect(Reflect.get(preview, "options")).toBeNull();
    finish({ status: 200, text: "Late result" });
    await Promise.resolve();
    expect(http).toHaveBeenCalledTimes(1);
  });

  it.each(["resolve", "reject"])(
    "drops note callbacks, output, and DOM references before a request can %s",
    async (outcome) => {
      let resolve!: (text: string) => void;
      let reject!: (error: Error) => void;
      const request = new Promise<string>((done, fail) => {
        resolve = done;
        reject = fail;
      });
      const onClose = vi.fn();
      const preview = new TranslationPreview(
        {} as App,
        captureSelection("Hello world.", "Example.md", 0, 5, 0),
        {
          model: "test-model",
          targetLanguage: "fr",
          translate: () => request,
          apply: vi.fn(),
          onClose,
        }
      );
      const resultEl = { value: "", disabled: false };
      Reflect.set(preview, "resultEl", resultEl);
      const run = Reflect.get(preview, "runTranslation") as () => Promise<void>;
      const pending = run.call(preview);
      resultEl.value = "Draft translation";
      preview.onClose();
      expect(resultEl.value).toBe("");
      for (const key of ["options", "resultEl", "statusEl", "retry"]) {
        expect(Reflect.get(preview, key)).toBeNull();
      }
      expect(Reflect.get(preview, "sourceText")).toBe("");
      expect(Reflect.get(preview, "actions")).toEqual([]);
      if (outcome === "resolve") {
        resolve("Late translation");
      } else {
        reject(new Error("Late failure"));
      }
      await pending;
      expect(resultEl.value).toBe("");
      preview.onClose();
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  );
});
