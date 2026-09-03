import { afterEach, describe, expect, it, vi } from "vitest";
import { getMessage } from "./i18n";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getMessage", () => {
  it("returns the localized message", () => {
    vi.stubGlobal("chrome", {
      i18n: { getMessage: () => "Translated message" },
    });

    expect(getMessage("message_key")).toBe("Translated message");
  });

  it("returns the key when the extension context has been invalidated", () => {
    vi.stubGlobal("chrome", {
      i18n: {
        getMessage: () => {
          throw new Error("Extension context invalidated.");
        },
      },
    });

    expect(getMessage("message_key")).toBe("message_key");
  });
});
