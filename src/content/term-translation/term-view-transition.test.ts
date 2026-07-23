/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { runTermViewTransition } from "./term-view-transition";

interface DeferredTransition {
  resolveReady: () => void;
  skipTransition: ReturnType<typeof vi.fn>;
  transition: ViewTransition;
}

const originalStartViewTransition = document.startViewTransition;

function createDeferredTransition(): DeferredTransition {
  let resolveReady: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });
  const skipTransition = vi.fn();

  return {
    resolveReady,
    skipTransition,
    transition: {
      finished: Promise.resolve(),
      ready,
      skipTransition,
      types: new Set<string>() as unknown as ViewTransitionTypeSet,
      updateCallbackDone: Promise.resolve(),
    },
  };
}

afterEach(() => {
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: originalStartViewTransition,
  });
  document.documentElement.style.removeProperty("view-transition-name");
});

describe("runTermViewTransition", () => {
  it("updates immediately when the API is unavailable", () => {
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: undefined,
    });
    const update = vi.fn();

    runTermViewTransition(document, update);

    expect(update).toHaveBeenCalledOnce();
  });

  it("suppresses the root transition while capturing the named term UI", async () => {
    const deferred = createDeferredTransition();
    let transitionUpdate = () => undefined;
    document.documentElement.style.setProperty(
      "view-transition-name",
      "page-shell"
    );
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: vi.fn((update: ViewTransitionUpdateCallback) => {
        transitionUpdate = update;
        return deferred.transition;
      }),
    });
    const update = vi.fn();

    runTermViewTransition(document, update);

    expect(
      document.documentElement.style.getPropertyValue("view-transition-name")
    ).toBe("none");

    transitionUpdate();
    expect(update).toHaveBeenCalledOnce();

    deferred.resolveReady();
    await deferred.transition.ready;
    await Promise.resolve();

    expect(
      document.documentElement.style.getPropertyValue("view-transition-name")
    ).toBe("page-shell");
  });

  it("skips an obsolete transition and applies only the latest update", () => {
    const first = createDeferredTransition();
    const second = createDeferredTransition();
    const updates: ViewTransitionUpdateCallback[] = [];
    const transitions = [first.transition, second.transition];
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: vi.fn((update: ViewTransitionUpdateCallback) => {
        updates.push(update);
        const transition = transitions.shift();
        if (!transition) {
          throw new Error("Unexpected transition");
        }
        return transition;
      }),
    });
    const firstUpdate = vi.fn();
    const secondUpdate = vi.fn();

    runTermViewTransition(document, firstUpdate);
    runTermViewTransition(document, secondUpdate);
    updates[0]?.();
    updates[1]?.();

    expect(first.skipTransition).toHaveBeenCalledOnce();
    expect(firstUpdate).not.toHaveBeenCalled();
    expect(secondUpdate).toHaveBeenCalledOnce();
  });
});
