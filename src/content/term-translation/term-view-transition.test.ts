/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { runTermViewTransition } from "./term-view-transition";

interface DeferredTransition {
  skipTransition: ReturnType<typeof vi.fn>;
  transition: ViewTransition;
}

function createDeferredTransition(): DeferredTransition {
  const skipTransition = vi.fn();

  return {
    skipTransition,
    transition: {
      finished: Promise.resolve(),
      ready: new Promise(() => undefined),
      skipTransition,
      types: new Set<string>() as unknown as ViewTransitionTypeSet,
      updateCallbackDone: Promise.resolve(),
    },
  };
}

describe("runTermViewTransition", () => {
  it("updates immediately when the transition scope is unavailable", () => {
    const update = vi.fn();

    runTermViewTransition(document, null, update);

    expect(update).toHaveBeenCalledOnce();
  });

  it("runs the update inside an element-scoped transition", () => {
    const deferred = createDeferredTransition();
    let transitionUpdate = () => undefined;
    const startViewTransition = vi.fn(
      ({ callback }: { callback: ViewTransitionUpdateCallback }) => {
        transitionUpdate = callback;
        return deferred.transition;
      }
    );
    const scope = Object.assign(document.createElement("div"), {
      startViewTransition,
    });
    const update = vi.fn();

    runTermViewTransition(document, scope, update);
    transitionUpdate();

    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
  });

  it("skips an obsolete transition and applies only the latest update", () => {
    const first = createDeferredTransition();
    const second = createDeferredTransition();
    const updates: ViewTransitionUpdateCallback[] = [];
    const transitions = [first.transition, second.transition];
    const scope = Object.assign(document.createElement("div"), {
      startViewTransition: vi.fn(
        ({ callback }: { callback: ViewTransitionUpdateCallback }) => {
          updates.push(callback);
          const transition = transitions.shift();
          if (!transition) {
            throw new Error("Unexpected transition");
          }
          return transition;
        }
      ),
    });
    const firstUpdate = vi.fn();
    const secondUpdate = vi.fn();

    runTermViewTransition(document, scope, firstUpdate);
    runTermViewTransition(document, scope, secondUpdate);
    updates[0]?.();
    updates[1]?.();

    expect(first.skipTransition).toHaveBeenCalledOnce();
    expect(firstUpdate).not.toHaveBeenCalled();
    expect(secondUpdate).toHaveBeenCalledOnce();
  });
});
