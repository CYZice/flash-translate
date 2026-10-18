import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function createModel() {
  return {
    destroy: vi.fn(),
    translate: vi.fn().mockResolvedValue("Bonjour"),
    detect: vi
      .fn()
      .mockResolvedValue([{ detectedLanguage: "en", confidence: 1 }]),
  };
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("language-pair isolation", () => {
  it("releases one pair without destroying a different pair's model", async () => {
    const models: ReturnType<typeof createModel>[] = [];
    vi.stubGlobal("Translator", {
      availability: async () => "available",
      create: () => {
        const model = createModel();
        models.push(model);
        return Promise.resolve(model);
      },
    });
    const manager = (await import("./translator")).translatorManager;
    const releaseCard = manager.retain("en", "zh");
    const releaseTerm = manager.retain("en", "zh");
    const releaseAssist = manager.retain("zh", "en");
    const card = await manager.getTranslator("en", "zh");
    const assist = await manager.getTranslator("zh", "en");
    expect(card).not.toBe(assist);
    expect(models.every((model) => model.destroy.mock.calls.length === 0)).toBe(
      true
    );
    releaseCard();
    expect(models[0].destroy).not.toHaveBeenCalled();
    releaseTerm();
    expect(models[0].destroy).toHaveBeenCalledTimes(1);
    expect(models[1].destroy).not.toHaveBeenCalled();
    expect(await manager.getTranslator("zh", "en")).toBe(assist);
    releaseAssist();
    expect(models[1].destroy).toHaveBeenCalledTimes(1);
  });

  it("coalesces only identical pairs while creating reverse pairs independently", async () => {
    const forward = deferred<ReturnType<typeof createModel>>();
    const reverse = deferred<ReturnType<typeof createModel>>();
    const create = vi.fn((options: { sourceLanguage: string }) =>
      options.sourceLanguage === "en" ? forward.promise : reverse.promise
    );
    vi.stubGlobal("Translator", {
      availability: async () => "available",
      create,
    });
    const manager = (await import("./translator")).translatorManager;
    const releaseForward = manager.retain("en", "zh");
    const releaseReverse = manager.retain("zh", "en");
    const first = manager.getTranslator("en", "zh");
    const duplicate = manager.getTranslator("en", "zh");
    const second = manager.getTranslator("zh", "en");
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    const reverseModel = createModel();
    reverse.resolve(reverseModel);
    expect(await second).toBe(reverseModel);
    const forwardModel = createModel();
    forward.resolve(forwardModel);
    expect(await first).toBe(forwardModel);
    expect(await duplicate).toBe(forwardModel);
    releaseForward();
    expect(reverseModel.destroy).not.toHaveBeenCalled();
    releaseReverse();
  });

  it("cancels one pair's initialization without aborting another pair", async () => {
    const forward = deferred<ReturnType<typeof createModel>>();
    const reverse = deferred<ReturnType<typeof createModel>>();
    const signals: AbortSignal[] = [];
    vi.stubGlobal("Translator", {
      availability: async () => "available",
      create: (options: { sourceLanguage: string; signal: AbortSignal }) => {
        signals.push(options.signal);
        return options.sourceLanguage === "en"
          ? forward.promise
          : reverse.promise;
      },
    });
    const manager = (await import("./translator")).translatorManager;
    const releaseForward = manager.retain("en", "zh");
    const releaseReverse = manager.retain("zh", "en");
    const first = expect(
      manager.getTranslator("en", "zh")
    ).rejects.toMatchObject({ name: "AbortError" });
    const second = manager.getTranslator("zh", "en");
    await vi.waitFor(() => expect(signals).toHaveLength(2));
    releaseForward();
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    const late = createModel();
    forward.resolve(late);
    await first;
    expect(late.destroy).toHaveBeenCalledTimes(1);
    const alive = createModel();
    reverse.resolve(alive);
    expect(await second).toBe(alive);
    releaseReverse();
  });
});

describe.each(["translator", "detector"] as const)(
  "%s resource lifecycle",
  (kind) => {
    async function setup() {
      const model = createModel();
      const api = {
        availability: vi.fn().mockResolvedValue("available"),
        create: vi
          .fn<
            (options: {
              signal?: AbortSignal;
            }) => Promise<ReturnType<typeof createModel>>
          >()
          .mockResolvedValue(model),
      };
      vi.stubGlobal(
        kind === "translator" ? "Translator" : "LanguageDetector",
        api
      );
      const manager =
        kind === "translator"
          ? (await import("./translator")).translatorManager
          : (await import("./language-detector")).languageDetectorManager;
      const get = () =>
        "getTranslator" in manager
          ? manager.getTranslator("en", "fr")
          : manager.getDetector();
      const retain = () =>
        "getTranslator" in manager
          ? manager.retain("en", "fr")
          : manager.retain();
      return { api, model, manager, get, retain };
    }

    it("releases the last owner's session without interrupting another owner", async () => {
      const { model, get, retain } = await setup();
      const releaseCard = retain();
      const releaseAssist = retain();
      expect(await get()).toBe(model);
      releaseCard();
      releaseCard();
      expect(model.destroy).not.toHaveBeenCalled();
      releaseAssist();
      expect(model.destroy).toHaveBeenCalledTimes(1);
    });

    it("creates a fresh session after closing and reopening", async () => {
      const { api, get, retain } = await setup();
      const release = retain();
      await get();
      release();
      const nextModel = createModel();
      api.create.mockResolvedValueOnce(nextModel);
      const releaseNext = retain();
      expect(await get()).toBe(nextModel);
      releaseNext();
      expect(nextModel.destroy).toHaveBeenCalledTimes(1);
    });

    it("cancels creation and queued consumers when closed before loading starts", async () => {
      const { api, get, retain } = await setup();
      const availability = deferred<string>();
      api.availability.mockReturnValueOnce(availability.promise);
      const release = retain();
      const first = expect(get()).rejects.toMatchObject({ name: "AbortError" });
      const queued = expect(get()).rejects.toMatchObject({
        name: "AbortError",
      });
      release();
      availability.resolve("available");
      await Promise.all([first, queued]);
      expect(api.create).not.toHaveBeenCalled();
    });

    it("destroys a late-created session without disturbing a newer creation", async () => {
      const { api, get, retain } = await setup();
      const oldCreation = deferred<ReturnType<typeof createModel>>();
      const newCreation = deferred<ReturnType<typeof createModel>>();
      api.create
        .mockReturnValueOnce(oldCreation.promise)
        .mockReturnValueOnce(newCreation.promise);
      const releaseOld = retain();
      const oldResult = expect(get()).rejects.toMatchObject({
        name: "AbortError",
      });
      await vi.waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
      const signal = api.create.mock.calls[0][0]?.signal as AbortSignal;
      releaseOld();
      expect(signal.aborted).toBe(true);
      const releaseNew = retain();
      const next = get();
      await vi.waitFor(() => expect(api.create).toHaveBeenCalledTimes(2));
      const oldModel = createModel();
      oldCreation.resolve(oldModel);
      await oldResult;
      expect(oldModel.destroy).toHaveBeenCalledTimes(1);
      const queuedNew = get();
      const nextModel = createModel();
      newCreation.resolve(nextModel);
      expect(await next).toBe(nextModel);
      expect(await queuedNew).toBe(nextModel);
      releaseNew();
    });
  }
);
