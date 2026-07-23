import { describe, expect, it } from "vitest";
import {
  type ExclusionPattern,
  enableExclusionPattern,
  isLanguageMatch,
  isUrlExcluded,
  normalizeLanguageCode,
  shouldSkipTranslation,
} from "./settings";

describe("enableExclusionPattern", () => {
  it("prepends a new enabled pattern", () => {
    const patterns: ExclusionPattern[] = [
      { id: "existing", pattern: "https://other.com", enabled: true },
    ];

    expect(
      enableExclusionPattern(patterns, "https://example.com", "new")
    ).toEqual([
      { id: "new", pattern: "https://example.com", enabled: true },
      ...patterns,
    ]);
  });

  it("enables an existing disabled pattern without adding a duplicate", () => {
    const patterns: ExclusionPattern[] = [
      { id: "existing", pattern: "https://example.com", enabled: false },
      { id: "other", pattern: "https://other.com", enabled: true },
    ];

    expect(
      enableExclusionPattern(patterns, "https://example.com", "unused")
    ).toEqual([
      { id: "existing", pattern: "https://example.com", enabled: true },
      patterns[1],
    ]);
  });

  it("returns the original patterns when the site is already excluded", () => {
    const patterns: ExclusionPattern[] = [
      { id: "existing", pattern: "https://example.com", enabled: true },
    ];

    expect(
      enableExclusionPattern(patterns, "https://example.com", "unused")
    ).toBe(patterns);
  });
});

describe("normalizeLanguageCode", () => {
  it("returns lowercase primary language code", () => {
    expect(normalizeLanguageCode("en")).toBe("en");
    expect(normalizeLanguageCode("EN")).toBe("en");
    expect(normalizeLanguageCode("ja")).toBe("ja");
  });

  it("extracts primary code from hyphenated locale", () => {
    expect(normalizeLanguageCode("ja-JP")).toBe("ja");
    expect(normalizeLanguageCode("en-US")).toBe("en");
    expect(normalizeLanguageCode("zh-CN")).toBe("zh");
    expect(normalizeLanguageCode("zh-TW")).toBe("zh");
  });

  it("extracts primary code from underscore locale", () => {
    expect(normalizeLanguageCode("ja_JP")).toBe("ja");
    expect(normalizeLanguageCode("en_US")).toBe("en");
  });

  it("handles mixed case with locale", () => {
    expect(normalizeLanguageCode("EN-US")).toBe("en");
    expect(normalizeLanguageCode("JA-jp")).toBe("ja");
  });
});

describe("isLanguageMatch", () => {
  it("returns false when pageLanguage is null", () => {
    expect(isLanguageMatch(null, "ja")).toBe(false);
  });

  it("returns true when languages match exactly", () => {
    expect(isLanguageMatch("ja", "ja")).toBe(true);
    expect(isLanguageMatch("en", "en")).toBe(true);
  });

  it("returns true when normalized languages match", () => {
    expect(isLanguageMatch("ja-JP", "ja")).toBe(true);
    expect(isLanguageMatch("ja", "ja-JP")).toBe(true);
    expect(isLanguageMatch("en-US", "en-GB")).toBe(true);
  });

  it("returns false when languages differ", () => {
    expect(isLanguageMatch("ja", "en")).toBe(false);
    expect(isLanguageMatch("zh-CN", "ja")).toBe(false);
  });

  it("handles case insensitivity", () => {
    expect(isLanguageMatch("JA", "ja")).toBe(true);
    expect(isLanguageMatch("en", "EN")).toBe(true);
  });
});

describe("shouldSkipTranslation", () => {
  it("returns false when skipSameLanguage is false", () => {
    expect(shouldSkipTranslation("ja", false, "ja")).toBe(false);
    expect(shouldSkipTranslation("ja", false, "en")).toBe(false);
  });

  it("returns false when pageLanguage is null", () => {
    expect(shouldSkipTranslation("ja", true, null)).toBe(false);
  });

  it("returns true when languages match and skip is enabled", () => {
    expect(shouldSkipTranslation("ja", true, "ja")).toBe(true);
    expect(shouldSkipTranslation("ja", true, "ja-JP")).toBe(true);
  });

  it("returns false when languages differ", () => {
    expect(shouldSkipTranslation("ja", true, "en")).toBe(false);
    expect(shouldSkipTranslation("en", true, "ja")).toBe(false);
  });
});

describe("isUrlExcluded", () => {
  const patterns: ExclusionPattern[] = [
    { id: "1", pattern: "https://example.com/admin", enabled: true },
    { id: "2", pattern: "https://test.com", enabled: false },
    { id: "3", pattern: "https://blocked.com", enabled: true },
  ];

  it("returns true when URL matches an enabled pattern", () => {
    expect(isUrlExcluded("https://example.com/admin/users", patterns)).toBe(
      true
    );
    expect(isUrlExcluded("https://blocked.com/page", patterns)).toBe(true);
  });

  it("returns false when URL matches a disabled pattern", () => {
    expect(isUrlExcluded("https://test.com/page", patterns)).toBe(false);
  });

  it("returns false when URL does not match any pattern", () => {
    expect(isUrlExcluded("https://other.com", patterns)).toBe(false);
  });

  it("returns false for empty patterns array", () => {
    expect(isUrlExcluded("https://example.com", [])).toBe(false);
  });

  it("matches URL prefix correctly", () => {
    expect(isUrlExcluded("https://example.com/admin", patterns)).toBe(true);
    expect(isUrlExcluded("https://example.com/other", patterns)).toBe(false);
  });

  it("prevents false positives with similar domain names", () => {
    // Should NOT match example.com.evil.com when pattern is example.com
    const domainPatterns: ExclusionPattern[] = [
      { id: "1", pattern: "https://example.com", enabled: true },
    ];
    expect(isUrlExcluded("https://example.com.evil.com", domainPatterns)).toBe(
      false
    );
    expect(
      isUrlExcluded("https://example.com.evil.com/page", domainPatterns)
    ).toBe(false);
  });

  it("matches URLs with query parameters", () => {
    expect(isUrlExcluded("https://example.com/admin?page=1", patterns)).toBe(
      true
    );
    expect(isUrlExcluded("https://blocked.com?query=test", patterns)).toBe(
      true
    );
  });

  it("matches exact pattern without trailing content", () => {
    const exactPatterns: ExclusionPattern[] = [
      { id: "1", pattern: "https://example.com/page", enabled: true },
    ];
    expect(isUrlExcluded("https://example.com/page", exactPatterns)).toBe(true);
    expect(isUrlExcluded("https://example.com/page/", exactPatterns)).toBe(
      true
    );
    expect(isUrlExcluded("https://example.com/page2", exactPatterns)).toBe(
      false
    );
  });
});
