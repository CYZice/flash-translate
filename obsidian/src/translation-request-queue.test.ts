import { describe, expect, it, vi } from "vitest";
import { TranslationRequestQueue } from "./translation-request-queue";
import type {
  TranslationHttpRequest,
  TranslationHttpResponse,
} from "./translation-service";

function setup() {
  const calls: {
    input: TranslationHttpRequest;
    resolve: (value: TranslationHttpResponse) => void;
    reject: (error: Error) => void;
  }[] = [];
  const http = vi.fn(
    (request: TranslationHttpRequest) =>
      new Promise<TranslationHttpResponse>((resolve, reject) => {
        calls.push({ input: request, resolve, reject });
      })
  );
  return { calls, http, queue: new TranslationRequestQueue(http) };
}

function input(body = "first"): TranslationHttpRequest {
  return {
    url: "https://provider.example/v1/chat/completions",
    method: "POST",
    headers: {},
    body,
    throw: false,
  };
}

describe("Obsidian request concurrency", () => {
  it("allows one real request and retains only the latest waiting payload", async () => {
    const { queue, http, calls } = setup();
    const activeController = new AbortController();
    const active = queue
      .request(input(), activeController.signal)
      .catch((error: Error) => error.name);
    const waiting = ["second", "third", "fourth", "latest"].map((body) =>
      queue.request(input(body)).catch((error: Error) => error.name)
    );
    activeController.abort();
    expect(await active).toBe("AbortError");
    expect(http).toHaveBeenCalledTimes(1);
    // Logical cancellation must not release a still-running native transport slot.
    calls[0].resolve({ status: 200, text: "obsolete" });
    await Promise.resolve();
    expect(http).toHaveBeenCalledTimes(2);
    expect(calls[1].input.body).toBe("latest");
    calls[1].resolve({ status: 200, text: "Latest translation" });
    expect(await Promise.all(waiting)).toEqual([
      "AbortError",
      "AbortError",
      "AbortError",
      { status: 200, text: "Latest translation" },
    ]);
  });

  it("removes an aborted waiting task without sending it", async () => {
    const { queue, http, calls } = setup();
    const active = queue.request(input());
    const controller = new AbortController();
    const waiting = expect(
      queue.request(input("waiting"), controller.signal)
    ).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await waiting;
    calls[0].resolve({ status: 200, text: "First" });
    await active;
    expect(http).toHaveBeenCalledTimes(1);
  });

  it("disposes active UI callbacks and all waiting work without claiming to abort HTTP", async () => {
    const { queue, http, calls } = setup();
    const active = expect(queue.request(input())).rejects.toMatchObject({
      name: "AbortError",
    });
    const waiting = expect(
      queue.request(input("waiting"))
    ).rejects.toMatchObject({ name: "AbortError" });
    queue.dispose();
    await Promise.all([active, waiting]);
    expect(Reflect.get(queue, "active")).toMatchObject({
      complete: null,
      input: null,
      onAbort: null,
      signal: undefined,
    });
    expect(Reflect.get(queue, "pending")).toBeNull();
    await expect(queue.request(input("after unload"))).rejects.toMatchObject({
      name: "AbortError",
    });
    calls[0].resolve({ status: 200, text: "Late" });
    await Promise.resolve();
    expect(http).toHaveBeenCalledTimes(1);
  });

  it("consumes late transport failure and then runs the newest request", async () => {
    const { queue, http, calls } = setup();
    const controller = new AbortController();
    const active = expect(
      queue.request(input(), controller.signal)
    ).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await active;
    const next = queue.request(input("next"));
    calls[0].reject(new Error("Late network failure"));
    await Promise.resolve();
    expect(http).toHaveBeenCalledTimes(2);
    calls[1].resolve({ status: 200, text: "Next" });
    expect(await next).toEqual({ status: 200, text: "Next" });
  });

  it("rejects an already-cancelled task without opening a connection", async () => {
    const { queue, http } = setup();
    const controller = new AbortController();
    controller.abort();
    await expect(
      queue.request(input(), controller.signal)
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(http).not.toHaveBeenCalled();
  });
});
