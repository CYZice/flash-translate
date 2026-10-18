const mirrorByDocument = new WeakMap<Document, HTMLDivElement>();

function getMirror(document: Document): HTMLDivElement {
  const existing = mirrorByDocument.get(document);
  if (existing?.isConnected) {
    return existing;
  }
  const mirror = document.createElement("div");
  mirror.setAttribute("aria-hidden", "true");
  Object.assign(mirror.style, {
    position: "absolute",
    left: "-100000px",
    top: "0",
    visibility: "hidden",
    pointerEvents: "none",
    whiteSpace: "pre-wrap",
  });
  document.body.append(mirror);
  mirrorByDocument.set(document, mirror);
  return mirror;
}

/** Native controls expose offsets, not DOM ranges. Reuse an empty layout mirror. */
export function measureTextControlOffset(
  editor: HTMLInputElement | HTMLTextAreaElement,
  textOffset: number
): DOMRect | null {
  let mirror: HTMLDivElement | null = null;
  try {
    mirror = getMirror(editor.ownerDocument);
    const styles = editor.ownerDocument.defaultView?.getComputedStyle(editor);
    if (!styles) {
      return null;
    }
    const properties = [
      "boxSizing",
      "fontFamily",
      "fontSize",
      "fontStyle",
      "fontWeight",
      "letterSpacing",
      "lineHeight",
      "paddingBottom",
      "paddingLeft",
      "paddingRight",
      "paddingTop",
      "textAlign",
      "textIndent",
      "textTransform",
      "wordSpacing",
      "borderBottomWidth",
      "borderLeftWidth",
      "borderRightWidth",
      "borderTopWidth",
      "direction",
      "tabSize",
    ] as const;
    for (const property of properties) {
      mirror.style[property] = styles[property];
    }
    const borderWidth =
      Number.parseFloat(styles.borderLeftWidth) +
      Number.parseFloat(styles.borderRightWidth);
    const paddingWidth =
      Number.parseFloat(styles.paddingLeft) +
      Number.parseFloat(styles.paddingRight);
    const width =
      styles.boxSizing === "border-box"
        ? editor.clientWidth + borderWidth
        : editor.clientWidth - paddingWidth;
    mirror.style.width = `${width}px`;
    mirror.style.whiteSpace =
      editor.tagName === "TEXTAREA" &&
      (editor as HTMLTextAreaElement).wrap !== "off"
        ? "pre-wrap"
        : "pre";
    mirror.style.overflowWrap =
      editor.tagName === "TEXTAREA" ? "break-word" : "normal";
    mirror.textContent = "";
    const marker = editor.ownerDocument.createElement("span");
    mirror.append(
      editor.ownerDocument.createTextNode(editor.value.slice(0, textOffset)),
      marker,
      editor.ownerDocument.createTextNode(editor.value.slice(textOffset))
    );
    const mirrorRect = mirror.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    return new DOMRect(
      editorRect.left + markerRect.left - mirrorRect.left - editor.scrollLeft,
      editorRect.top + markerRect.top - mirrorRect.top - editor.scrollTop,
      1,
      markerRect.height || Number.parseFloat(styles.lineHeight) || 16
    );
  } catch {
    return null;
  } finally {
    mirror?.replaceChildren();
  }
}

export function getTextControlFocusRect(
  editor: HTMLInputElement | HTMLTextAreaElement
): DOMRect {
  const offset =
    editor.selectionDirection === "backward"
      ? editor.selectionStart
      : editor.selectionEnd;
  return (
    measureTextControlOffset(editor, offset ?? 0) ??
    editor.getBoundingClientRect()
  );
}
