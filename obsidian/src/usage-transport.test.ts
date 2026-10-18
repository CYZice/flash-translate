import { describe, expect, it, vi } from "vitest";
import {
  applyUsageEvent,
  EMPTY_USAGE,
  type UsageEvent,
} from "../../src/shared/translation/usage";
import { TranslationRequestQueue } from "./translation-request-queue";
import { UsageTransport } from "./usage-transport";

const input = {
  url: "http://localhost/v1/chat/completions",
  method: "POST",
  body: "selected text",
  headers: {},
  throw: false,
};
describe("Obsidian native usage", () => {
  it("detaches the plugin owner on unload instead of writing late data into a reloaded plugin", async () => {
    const record = vi.fn();
    let finish: (value: { status: number; json: unknown }) => void = () =>
      undefined;
    const transport = new UsageTransport(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
      record
    );
    const active = transport.request(input);
    expect(record).toHaveBeenCalledOnce();
    transport.dispose();
    expect(Reflect.get(transport, "record")).toBeNull();
    const json = vi.fn(() => ({
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }));
    finish({
      status: 200,
      get json() {
        return json();
      },
    });
    await active;
    expect(record).toHaveBeenCalledOnce();
    expect(json).not.toHaveBeenCalled();
  });
  it("accounts for actual late HTTP usage, not cancelled waiting requests or UI completions", async () => {
    const events: UsageEvent[] = [];
    let finish: (value: { status: number; json: unknown }) => void = () =>
      undefined;
    const native = vi.fn(
      () =>
        new Promise<{ status: number; json: unknown }>((resolve) => {
          finish = resolve;
        })
    );
    const queue = new TranslationRequestQueue(
      new UsageTransport(native, (event) => {
        events.push(event);
      }).request
    );
    const controller = new AbortController();
    const active = queue
      .request(input, controller.signal)
      .catch((error: Error) => error.name);
    const waiting = queue
      .request({ ...input, body: "waiting" })
      .catch((error: Error) => error.name);
    controller.abort();
    queue.dispose();
    expect(await active).toBe("AbortError");
    expect(await waiting).toBe("AbortError");
    expect(events).toEqual([{ type: "ai-started" }]);
    finish({
      status: 200,
      json: {
        choices: [{ message: { content: "Late translation" } }],
        usage: { prompt_tokens: 30, completion_tokens: 5, total_tokens: 35 },
      },
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(native).toHaveBeenCalledOnce();
    expect(events.reduce(applyUsageEvent, { ...EMPTY_USAGE })).toEqual({
      ...EMPTY_USAGE,
      aiRequests: 1,
      reportedRequests: 1,
      inputTokens: 30,
      outputTokens: 5,
      totalTokens: 35,
    });
  });
  it("reads JSON once rather than retaining duplicate response parses", async () => {
    const json = vi.fn(() => ({
      choices: [{ message: { content: "Hello" } }],
    }));
    const native = vi.fn(async () => ({
      status: 200,
      get json() {
        return json();
      },
    }));
    const events: UsageEvent[] = [];
    const transport = new UsageTransport(native, (event) => {
      events.push(event);
    });
    expect(await transport.request(input)).toMatchObject({
      status: 200,
      body: { choices: [{ message: { content: "Hello" } }] },
    });
    expect(json).toHaveBeenCalledOnce();
    expect(events.at(-1)).toEqual({
      type: "ai-finished",
      usage: null,
      completed: false,
    });
  });
  it("records unknown usage on HTTP and network errors without parsing error-page JSON", async () => {
    const record = vi.fn();
    const transport = new UsageTransport(
      async () => ({
        status: 401,
        get json() {
          throw new Error("HTML");
        },
      }),
      record
    );
    expect(await transport.request(input)).toEqual({ status: 401, body: null });
    expect(record).toHaveBeenLastCalledWith({
      type: "ai-finished",
      usage: null,
      completed: false,
    });
    const failed = new UsageTransport(
      () => Promise.reject(new Error("Network error")),
      record
    );
    await expect(failed.request(input)).rejects.toThrow("Network error");
    expect(record).toHaveBeenLastCalledWith({
      type: "ai-finished",
      usage: null,
      completed: false,
    });
  });
});
