import { describe, expect, it } from "vitest";
import { getTranslationSettingsCopy } from "./settings-copy";

describe("shared host settings copy", () => {
  it("uses the same catalog for host locale spellings", () => {
    expect(getTranslationSettingsCopy("zh_CN")).toBe(
      getTranslationSettingsCopy("zh-CN")
    );
    expect(getTranslationSettingsCopy("zh-TW").autoZhEn).toBe("自动中英互译");
    expect(getTranslationSettingsCopy("ja").source).toBe("元の言語");
    expect(getTranslationSettingsCopy("fr")).toBe(
      getTranslationSettingsCopy("en")
    );
  });
});
