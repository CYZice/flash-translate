const activeTransitions = new WeakMap<HTMLElement, ViewTransition>();

interface ScopedViewTransitionElement extends HTMLElement {
  startViewTransition?: (options: {
    callback: ViewTransitionUpdateCallback;
  }) => ViewTransition;
}

function prefersReducedMotion(document: Document): boolean {
  return (
    document.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")
      .matches ?? false
  );
}

export function runTermViewTransition(
  document: Document,
  scope: HTMLElement | null,
  update: () => void
): Promise<void> {
  const scopedElement = scope as ScopedViewTransitionElement | null;
  const startViewTransition = scopedElement?.startViewTransition;

  if (
    prefersReducedMotion(document) ||
    !(scopedElement && startViewTransition)
  ) {
    update();
    return Promise.resolve();
  }

  activeTransitions.get(scopedElement)?.skipTransition();

  let updateWasCalled = false;
  let transition: ViewTransition;

  try {
    transition = startViewTransition.call(scopedElement, {
      callback: () => {
        if (activeTransitions.get(scopedElement) !== transition) {
          return;
        }

        updateWasCalled = true;
        update();
      },
    });
  } catch {
    activeTransitions.delete(scopedElement);
    if (!updateWasCalled) {
      update();
    }
    return Promise.resolve();
  }

  activeTransitions.set(scopedElement, transition);

  const clearActiveTransition = () => {
    if (activeTransitions.get(scopedElement) === transition) {
      activeTransitions.delete(scopedElement);
    }
  };

  transition.ready.then(clearActiveTransition, clearActiveTransition);
  transition.finished.catch(() => undefined);
  return transition.updateCallbackDone;
}
