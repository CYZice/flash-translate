import { afterEach, describe, expect, it, vi } from "vitest";
import { getSettings } from "./settings";

afterEach(() => vi.unstubAllGlobals());
describe("automatic bilingual preference boundary", () => {
  it.each([true, false, "true", 1, null, undefined])(
    "accepts only stored booleans: %s",
    async (autoZhEn) => {
      vi.stubGlobal("chrome", {
        runtime: { id: "test" },
        storage: {
          sync: {
            get: async () => ({ "flash-translate-settings": { autoZhEn } }),
          },
        },
      });
      expect((await getSettings()).autoZhEn).toBe(autoZhEn === true);
    }
  );
});
