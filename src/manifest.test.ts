import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manifest", () => {
  it("declares the popup page as the extension options page", () => {
    expect((manifest as chrome.runtime.ManifestV3).options_ui).toEqual({
      open_in_tab: true,
      page: "src/popup/index.html",
    });
  });

  it("keeps arbitrary AI hosts optional instead of always granted", () => {
    const manifestV3 = manifest as chrome.runtime.ManifestV3;
    expect(manifestV3.host_permissions).toBeUndefined();
    expect(manifestV3.optional_host_permissions).toEqual([
      "http://*/*",
      "https://*/*",
    ]);
  });
});
