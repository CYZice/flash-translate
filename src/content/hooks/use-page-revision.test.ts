import { describe, expect, it } from "vitest";
import { getPageIdentity } from "./use-page-revision";

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
