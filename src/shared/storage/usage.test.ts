import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCAL_TRANSLATION_COMPLETED, reportLocalTranslation } from "./usage";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("native translation usage message", () => {
  it("sends only a numeric completion event", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("chrome", { runtime: { sendMessage } });
    await reportLocalTranslation();
    expect(sendMessage).toHaveBeenCalledWith({
      type: LOCAL_TRANSLATION_COMPLETED,
    });
  });
  it("does not fail translation when the extension context closes", async () => {
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: () => Promise.reject(new Error("Context invalidated")),
      },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(reportLocalTranslation()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });
  it("reports a rejected statistics write without failing translation", async () => {
    vi.stubGlobal("chrome", {
      runtime: { sendMessage: async () => ({ ok: false }) },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(reportLocalTranslation()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });
});
