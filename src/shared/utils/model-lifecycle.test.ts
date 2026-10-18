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
      return { api, model, manager, get };
    }

    it("releases the last owner's session without interrupting another owner", async () => {
      const { manager, model, get } = await setup();
      const releaseCard = manager.retain();
      const releaseAssist = manager.retain();
      expect(await get()).toBe(model);
      releaseCard();
      releaseCard();
      expect(model.destroy).not.toHaveBeenCalled();
      releaseAssist();
      expect(model.destroy).toHaveBeenCalledTimes(1);
    });

    it("creates a fresh session after closing and reopening", async () => {
      const { manager, api, get } = await setup();
      const release = manager.retain();
      await get();
      release();
      const nextModel = createModel();
      api.create.mockResolvedValueOnce(nextModel);
      const releaseNext = manager.retain();
      expect(await get()).toBe(nextModel);
      releaseNext();
      expect(nextModel.destroy).toHaveBeenCalledTimes(1);
    });

    it("cancels creation and queued consumers when closed before loading starts", async () => {
      const { manager, api, get } = await setup();
      const availability = deferred<string>();
      api.availability.mockReturnValueOnce(availability.promise);
      const release = manager.retain();
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
      const { manager, api, get } = await setup();
      const oldCreation = deferred<ReturnType<typeof createModel>>();
      const newCreation = deferred<ReturnType<typeof createModel>>();
      api.create
        .mockReturnValueOnce(oldCreation.promise)
        .mockReturnValueOnce(newCreation.promise);
      const releaseOld = manager.retain();
      const oldResult = expect(get()).rejects.toMatchObject({
        name: "AbortError",
      });
      await vi.waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
      const signal = api.create.mock.calls[0][0]?.signal as AbortSignal;
      releaseOld();
      expect(signal.aborted).toBe(true);
      const releaseNew = manager.retain();
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
