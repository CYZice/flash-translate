import { afterEach, describe, expect, it, vi } from "vitest";
import { USAGE_STORAGE_KEY } from "@/shared/storage/usage";
import { EMPTY_USAGE } from "@/shared/translation/usage";

afterEach(() => {
  vi.unstubAllGlobals();
});
describe("service-worker usage ownership", () => {
  it("serializes concurrent tab updates without storing source text", async () => {
    vi.resetModules();
    let stored: Record<string, unknown> = {};
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: () => Promise.resolve(stored),
          set: async (data: Record<string, unknown>) => {
            await Promise.resolve();
            stored = data;
          },
        },
      },
    });
    const { recordUsage } = await import("./usage-store");
    await Promise.all(
      Array.from({ length: 24 }, () => recordUsage({ type: "completed" }))
    );
    await Promise.all([
      recordUsage({ type: "ai-started" }),
      recordUsage({
        type: "ai-finished",
        usage: { inputTokens: 9, outputTokens: 1, totalTokens: 10 },
        completed: true,
      }),
    ]);
    expect(stored[USAGE_STORAGE_KEY]).toEqual({
      ...EMPTY_USAGE,
      completedTranslations: 25,
      aiRequests: 1,
      reportedRequests: 1,
      inputTokens: 9,
      outputTokens: 1,
      totalTokens: 10,
    });
  });
  it("allows later writes after a storage failure", async () => {
    vi.resetModules();
    const set = vi
      .fn()
      .mockRejectedValueOnce(new Error("disk unavailable"))
      .mockResolvedValue(undefined);
    vi.stubGlobal("chrome", {
      storage: { local: { get: async () => ({}), set } },
    });
    const { recordUsage } = await import("./usage-store");
    await expect(recordUsage({ type: "completed" })).rejects.toThrow(
      "disk unavailable"
    );
    await recordUsage({ type: "completed" });
    expect(set).toHaveBeenCalledTimes(2);
  });
});
