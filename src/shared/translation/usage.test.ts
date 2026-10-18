import { describe, expect, it, vi } from "vitest";
import { getTranslationSettingsCopy } from "./settings-copy";
import {
  AiUsageTracker,
  applyUsageEvent,
  EMPTY_USAGE,
  normalizeUsage,
  readTokenUsage,
  type UsageEvent,
} from "./usage";
import { getUsageRows } from "./usage-presentation";

const tokens = { inputTokens: 100, outputTokens: 20, totalTokens: 120 };
describe("local aggregate usage", () => {
  it.each([
    null,
    {},
    { usage: null },
    { usage: { prompt_tokens: 1, completion_tokens: -1, total_tokens: 0 } },
    { usage: { prompt_tokens: 1.5, completion_tokens: 1, total_tokens: 2 } },
    { usage: { prompt_tokens: 1, completion_tokens: 1 } },
  ])("does not invent tokens for missing or invalid reports", (body) => {
    expect(readTokenUsage(body)).toBeNull();
  });
  it("accepts actual zero usage, and does not add cached/reasoning detail tokens twice", () => {
    expect(
      readTokenUsage({
        usage: {
          prompt_tokens: 100,
          completion_tokens: 20,
          total_tokens: 120,
          prompt_tokens_details: { cached_tokens: 50 },
          completion_tokens_details: { reasoning_tokens: 10 },
        },
      })
    ).toEqual(tokens);
    expect(
      readTokenUsage({
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      })
    ).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
  });
  it("persists only counters and validates loaded values", () => {
    const usage = normalizeUsage({
      ...EMPTY_USAGE,
      aiRequests: 2,
      reportedRequests: 5,
      inputTokens: "100",
      outputTokens: -1,
      totalTokens: Number.POSITIVE_INFINITY,
      text: "private",
      history: ["private"],
    });
    expect(usage).toEqual({
      ...EMPTY_USAGE,
      aiRequests: 2,
      reportedRequests: 2,
    });
  });
  it("uses the final cumulative snapshot once, including when UI is cancelled", () => {
    const events: UsageEvent[] = [];
    const tracker = new AiUsageTracker((event) => {
      events.push(event);
    });
    tracker.onRequest();
    tracker.onUsage({ inputTokens: 90, outputTokens: 10, totalTokens: 100 });
    tracker.onUsage(tokens);
    tracker.finish(false);
    tracker.finish(true);
    tracker.onUsage(tokens);
    const total = events.reduce(applyUsageEvent, { ...EMPTY_USAGE });
    expect(total).toEqual({
      ...tokens,
      completedTranslations: 0,
      aiRequests: 1,
      reportedRequests: 1,
    });
    expect(events).toHaveLength(2);
  });
  it("does not count requests cancelled before transport starts, and distinguishes unknown usage from zero", () => {
    const record = vi.fn();
    const tracker = new AiUsageTracker(record);
    tracker.finish();
    expect(record).not.toHaveBeenCalled();
    const missing = applyUsageEvent(
      applyUsageEvent({ ...EMPTY_USAGE }, { type: "ai-started" }),
      { type: "ai-finished", usage: null, completed: true }
    );
    const rows = getUsageRows(missing, getTranslationSettingsCopy("en"));
    expect(
      rows.find((row) => row.label === "Reported total tokens")?.value
    ).toBe("—");
    expect(
      rows.find((row) => row.label === "AI requests without reported usage")
        ?.value
    ).toBe("1");
    expect(missing.completedTranslations).toBe(1);
  });
});
