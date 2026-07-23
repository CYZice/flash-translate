interface ActiveTermViewTransition {
  transition: ViewTransition | null;
  originalRootTransitionName: string;
  originalRootTransitionNamePriority: string;
}

const activeTransitions = new WeakMap<Document, ActiveTermViewTransition>();
const activeScopedTransitions = new WeakMap<HTMLElement, ViewTransition>();

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

function restoreRootTransitionName(
  document: Document,
  activeTransition: ActiveTermViewTransition
): void {
  const { style } = document.documentElement;
  if (activeTransition.originalRootTransitionName) {
    style.setProperty(
      "view-transition-name",
      activeTransition.originalRootTransitionName,
      activeTransition.originalRootTransitionNamePriority
    );
    return;
  }

  style.removeProperty("view-transition-name");
}

function runDocumentTermViewTransition(
  document: Document,
  update: () => void
): Promise<void> {
  if (typeof document.startViewTransition !== "function") {
    update();
    return Promise.resolve();
  }

  const currentTransition = activeTransitions.get(document);
  currentTransition?.transition?.skipTransition();

  const activeTransition: ActiveTermViewTransition = currentTransition ?? {
    transition: null,
    originalRootTransitionName: document.documentElement.style.getPropertyValue(
      "view-transition-name"
    ),
    originalRootTransitionNamePriority:
      document.documentElement.style.getPropertyPriority(
        "view-transition-name"
      ),
  };

  document.documentElement.style.setProperty(
    "view-transition-name",
    "none",
    "important"
  );

  let updateWasCalled = false;
  let transition: ViewTransition;

  try {
    transition = document.startViewTransition(() => {
      if (activeTransitions.get(document)?.transition !== transition) {
        return;
      }

      updateWasCalled = true;
      update();
    });
  } catch {
    restoreRootTransitionName(document, activeTransition);
    activeTransitions.delete(document);
    if (!updateWasCalled) {
      update();
    }
    return Promise.resolve();
  }

  activeTransition.transition = transition;
  activeTransitions.set(document, activeTransition);

  const restoreStyles = () => {
    if (activeTransitions.get(document)?.transition !== transition) {
      return;
    }

    restoreRootTransitionName(document, activeTransition);
    activeTransitions.delete(document);
  };

  transition.ready.then(restoreStyles, restoreStyles);
  transition.finished.catch(() => undefined);
  return transition.updateCallbackDone;
}

function runScopedTermViewTransition(
  scope: ScopedViewTransitionElement,
  update: () => void
): Promise<void> {
  const startViewTransition = scope.startViewTransition;
  if (!startViewTransition) {
    update();
    return Promise.resolve();
  }

  activeScopedTransitions.get(scope)?.skipTransition();

  let updateWasCalled = false;
  let transition: ViewTransition;

  try {
    transition = startViewTransition.call(scope, {
      callback: () => {
        if (activeScopedTransitions.get(scope) !== transition) {
          return;
        }

        updateWasCalled = true;
        update();
      },
    });
  } catch {
    activeScopedTransitions.delete(scope);
    if (!updateWasCalled) {
      update();
    }
    return Promise.resolve();
  }

  activeScopedTransitions.set(scope, transition);

  const clearActiveTransition = () => {
    if (activeScopedTransitions.get(scope) === transition) {
      activeScopedTransitions.delete(scope);
    }
  };

  transition.ready.then(clearActiveTransition, clearActiveTransition);
  transition.finished.catch(() => undefined);
  return transition.updateCallbackDone;
}

export function runTermViewTransition(
  document: Document,
  scope: HTMLElement | null,
  update: () => void
): Promise<void> {
  if (prefersReducedMotion(document)) {
    update();
    return Promise.resolve();
  }

  const scopedElement = scope as ScopedViewTransitionElement | null;
  if (scopedElement?.startViewTransition) {
    return runScopedTermViewTransition(scopedElement, update);
  }

  return runDocumentTermViewTransition(document, update);
}
