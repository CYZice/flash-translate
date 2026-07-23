/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import { isolateContentHost } from "./content-host";

describe("isolateContentHost", () => {
  it("resets page styles on the Shadow DOM host with author-level priority", () => {
    document.head.innerHTML = "<style>div { opacity: 0.8; }</style>";
    const host = document.createElement("div");
    document.body.append(host);

    expect(getComputedStyle(host).opacity).toBe("0.8");

    isolateContentHost(host);

    expect(host.getAttribute("style")).toBe("all: initial !important");
  });
});
