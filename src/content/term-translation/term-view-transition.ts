interface ActiveTermViewTransition {
  transition: ViewTransition | null;
  originalRootTransitionName: string;
  originalRootTransitionNamePriority: string;
}

const activeTransitions = new WeakMap<Document, ActiveTermViewTransition>();

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

export function runTermViewTransition(
  document: Document,
  update: () => void
): Promise<void> {
  if (
    typeof document.startViewTransition !== "function" ||
    prefersReducedMotion(document)
  ) {
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
