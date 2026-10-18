import type { App } from "obsidian";
import { describe, expect, it, vi } from "vitest";
import { captureSelection } from "./selection";
import { TranslationPreview } from "./translation-modal";

vi.mock("obsidian", () => ({
  Modal: class {
    contentEl = { empty: vi.fn() };
  },
  ButtonComponent: vi.fn(),
  DropdownComponent: vi.fn(),
}));

describe("translation preview disposal", () => {
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
