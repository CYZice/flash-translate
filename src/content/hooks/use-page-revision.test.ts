import { describe, expect, it } from "vitest";
import { getNavigationEventTarget, getPageIdentity } from "./use-page-revision";

describe("getNavigationEventTarget", () => {
  it("returns the Navigation API event target when available", () => {
    const navigation = new EventTarget();

    expect(getNavigationEventTarget({ navigation })).toBe(navigation);
  });

  it("returns undefined when the Navigation API is unavailable", () => {
    expect(getNavigationEventTarget({})).toBeUndefined();
  });
});

describe("getPageIdentity", () => {
  it("identifies a page by its origin, path, and query", () => {
    expect(
      getPageIdentity({
        origin: "https://example.com",
        pathname: "/articles/1",
        search: "?language=ja",
      })
    ).toBe("https://example.com/articles/1?language=ja");
  });

  it("distinguishes pages with different query parameters", () => {
    const firstPage = getPageIdentity({
      origin: "https://example.com",
      pathname: "/search",
      search: "?page=1",
    });
    const secondPage = getPageIdentity({
      origin: "https://example.com",
      pathname: "/search",
      search: "?page=2",
    });

    expect(firstPage).not.toBe(secondPage);
  });
});
