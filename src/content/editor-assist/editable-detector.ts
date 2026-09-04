const CONTENTEDITABLE_SELECTOR =
  '[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]';
const TEXT_INPUT_TYPE_REGEX = /^(text|search|email|url)$/i;
const SENSITIVE_AUTOCOMPLETE_REGEX =
  /one-time-code|cc-|credit-card|current-password|new-password/i;

function isTextControl(element: HTMLElement): boolean {
  return (
    element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLInputElement &&
      TEXT_INPUT_TYPE_REGEX.test(element.type || "text"))
  );
}

function isEditable(element: HTMLElement): boolean {
  return (
    isTextControl(element) ||
    element.matches(CONTENTEDITABLE_SELECTOR) ||
    element.isContentEditable
  );
}

export function findEditableFromNode(
  node: EventTarget | null
): HTMLElement | null {
  let current = node instanceof HTMLElement ? node : null;
  while (current) {
    if (isEditable(current)) {
      if (
        current instanceof HTMLTextAreaElement ||
        current instanceof HTMLInputElement
      ) {
        return current;
      }
      let root = current;
      while (root.parentElement?.isContentEditable) {
        root = root.parentElement;
      }
      return root;
    }
    current = current.parentElement;
  }
  return null;
}

export function findEditableFromEvent(event: Event): HTMLElement | null {
  for (const node of event.composedPath()) {
    const editable = findEditableFromNode(node);
    if (editable) {
      return editable;
    }
  }
  return findEditableFromNode(event.target);
}

export function isSensitiveEditor(editor: HTMLElement): boolean {
  if (editor instanceof HTMLInputElement && editor.type === "password") {
    return true;
  }
  const autocomplete = editor.getAttribute("autocomplete") ?? "";
  return SENSITIVE_AUTOCOMPLETE_REGEX.test(autocomplete);
}
