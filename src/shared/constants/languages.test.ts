import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  getAllLanguageCodes,
  getLanguageByCode,
  getLanguageDisplayName,
  getLanguageEnglishName,
  getLanguageNativeName,
  getLanguageUpperCode,
  getRepresentativeSourceLanguage,
  SUPPORTED_LANGUAGES,
} from "./languages";

describe("Chinese-English defaults", () => {
  it("prefers Chinese as the source and English as the target", () => {
    expect(DEFAULT_SOURCE_LANGUAGE).toBe("zh");
    expect(DEFAULT_TARGET_LANGUAGE).toBe("en");
    expect(SUPPORTED_LANGUAGES.slice(0, 2).map((lang) => lang.code)).toEqual([
      "zh",
      "en",
    ]);
  });

  it("uses Chinese as the representative source for target availability", () => {
    expect(getRepresentativeSourceLanguage("en")).toBe("zh");
    expect(getRepresentativeSourceLanguage("zh")).toBe("en");
    expect(getRepresentativeSourceLanguage("ja")).toBe("zh");
  });
});

describe("getLanguageByCode", () => {
  it("returns language object for valid code", () => {
    const en = getLanguageByCode("en");
    expect(en).toEqual({
      code: "en",
      name: "English",
      nativeName: "English",
    });

    const ja = getLanguageByCode("ja");
    expect(ja).toEqual({
      code: "ja",
      name: "Japanese",
      nativeName: "日本語",
    });
  });

  it("returns undefined for invalid code", () => {
    expect(getLanguageByCode("invalid")).toBeUndefined();
    expect(getLanguageByCode("")).toBeUndefined();
  });

  it("finds all supported languages", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(getLanguageByCode(lang.code)).toEqual(lang);
    }
  });
});

describe("getLanguageDisplayName", () => {
  it("returns formatted display name for valid code", () => {
    expect(getLanguageDisplayName("en")).toBe("English (English)");
    expect(getLanguageDisplayName("ja")).toBe("日本語 (Japanese)");
    expect(getLanguageDisplayName("zh")).toBe("中文 (Chinese)");
  });

  it("returns code as-is for invalid code", () => {
    expect(getLanguageDisplayName("invalid")).toBe("invalid");
    expect(getLanguageDisplayName("xyz")).toBe("xyz");
  });
});

describe("SUPPORTED_LANGUAGES", () => {
  it("contains expected languages", () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toContain("en");
    expect(codes).toContain("ja");
    expect(codes).toContain("zh");
    expect(codes).toContain("ko");
    expect(codes).toContain("es");
    expect(codes).toContain("fr");
    expect(codes).toContain("de");
  });

  it("has unique codes", () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it("all languages have required fields", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(lang.code).toBeTruthy();
      expect(lang.name).toBeTruthy();
      expect(lang.nativeName).toBeTruthy();
    }
  });
});

describe("getLanguageUpperCode", () => {
  it("returns uppercase language code", () => {
    expect(getLanguageUpperCode("en")).toBe("EN");
    expect(getLanguageUpperCode("ja")).toBe("JA");
    expect(getLanguageUpperCode("zh")).toBe("ZH");
  });

  it("handles already uppercase input", () => {
    expect(getLanguageUpperCode("EN")).toBe("EN");
    expect(getLanguageUpperCode("JA")).toBe("JA");
  });

  it("handles mixed case input", () => {
    expect(getLanguageUpperCode("En")).toBe("EN");
    expect(getLanguageUpperCode("jA")).toBe("JA");
  });
});

describe("getLanguageNativeName", () => {
  it("returns native name for valid code", () => {
    expect(getLanguageNativeName("en")).toBe("English");
    expect(getLanguageNativeName("ja")).toBe("日本語");
    expect(getLanguageNativeName("zh")).toBe("中文");
    expect(getLanguageNativeName("ko")).toBe("한국어");
  });

  it("returns code as fallback for invalid code", () => {
    expect(getLanguageNativeName("invalid")).toBe("invalid");
    expect(getLanguageNativeName("xyz")).toBe("xyz");
  });
});

describe("getLanguageEnglishName", () => {
  it("returns English name for valid code", () => {
    expect(getLanguageEnglishName("en")).toBe("English");
    expect(getLanguageEnglishName("ja")).toBe("Japanese");
    expect(getLanguageEnglishName("zh")).toBe("Chinese");
    expect(getLanguageEnglishName("ko")).toBe("Korean");
  });

  it("returns code as fallback for invalid code", () => {
    expect(getLanguageEnglishName("invalid")).toBe("invalid");
    expect(getLanguageEnglishName("xyz")).toBe("xyz");
  });
});

describe("getAllLanguageCodes", () => {
  it("returns array of all language codes", () => {
    const codes = getAllLanguageCodes();
    expect(codes).toContain("en");
    expect(codes).toContain("ja");
    expect(codes).toContain("zh");
    expect(codes).toContain("ko");
  });

  it("returns same length as SUPPORTED_LANGUAGES", () => {
    const codes = getAllLanguageCodes();
    expect(codes.length).toBe(SUPPORTED_LANGUAGES.length);
  });

  it("returns only codes, not objects", () => {
    const codes = getAllLanguageCodes();
    for (const code of codes) {
      expect(typeof code).toBe("string");
    }
  });
});
