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

  it("injects input assistance into HTTPS pages and local development apps", () => {
    const manifestV3 = manifest as chrome.runtime.ManifestV3;
    expect(manifestV3.content_scripts?.[0]?.matches).toEqual([
      "https://*/*",
      "http://127.0.0.1/*",
      "http://localhost/*",
    ]);
  });

  it("declares the quick translation context menu and side panel", () => {
    const manifestV3 = manifest as chrome.runtime.ManifestV3;
    expect(manifestV3.permissions).toContain("contextMenus");
    expect(manifestV3.permissions).toContain("sidePanel");
    expect(manifestV3.side_panel).toEqual({
      default_path: "src/sidepanel/index.html",
    });
  });
});
