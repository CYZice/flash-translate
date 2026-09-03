import { useEffect, useRef, useState } from "react";
import { useTranslator } from "./use-translator";

const INPUT_DEBOUNCE_MS = 400;
const CJK_REGEX = /[\u3400-\u9fff]/;
const BOUNDARY_REGEX = /[。！？!?\n]/;

interface EditorAssistState {
  text: string;
  rect: DOMRect | null;
}

function getEditable(node: Node | null): HTMLElement | null {
  let current: Node | null = node;
  while (current) {
    if (current instanceof HTMLElement && current.isContentEditable) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

function getInputSentence(): EditorAssistState | null {
  const active = document.activeElement;
  if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
    if (active.type === "password") return null;
    const caret = active.selectionStart ?? 0;
    const value = active.value;
    const before = value.slice(0, caret);
    const after = value.slice(caret);
    const startMatch = [...before.matchAll(BOUNDARY_REGEX)].pop();
    const endMatch = after.search(BOUNDARY_REGEX);
    const start = startMatch ? (startMatch.index ?? 0) + 1 : 0;
    const end = endMatch === -1 ? value.length : caret + endMatch + 1;
    const text = value.slice(start, end).trim();
    if (!text || !CJK_REGEX.test(text)) return null;
    return { text, rect: active.getBoundingClientRect() };
  }
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return null;
  }
  const editable = getEditable(selection.anchorNode);
  if (!editable) {
    return null;
  }

  const text = editable.innerText || editable.textContent || "";
  const before = document.createRange();
  before.selectNodeContents(editable);
  before.setEnd(selection.anchorNode as Node, selection.anchorOffset);
  const caretOffset = before.toString().length;
  const startPart = text.slice(0, caretOffset);
  const endPart = text.slice(caretOffset);
  const startMatch = [...startPart.matchAll(BOUNDARY_REGEX)].pop();
  const endMatch = endPart.search(BOUNDARY_REGEX);
  const start = startMatch ? (startMatch.index ?? 0) + 1 : 0;
  const end = endMatch === -1 ? text.length : caretOffset + endMatch + 1;
  const sentence = text.slice(start, end).trim();
  if (!sentence || !CJK_REGEX.test(sentence)) {
    return null;
  }

  const range = document.createRange();
  const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT);
  let cursor = 0;
  let startNode: Node | null = null;
  let endNode: Node | null = null;
  let startOffset = 0;
  let endOffset = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const length = node.textContent?.length ?? 0;
    if (!startNode && start >= cursor && start <= cursor + length) {
      startNode = node;
      startOffset = start - cursor;
    }
    if (end >= cursor && end <= cursor + length) {
      endNode = node;
      endOffset = end - cursor;
      break;
    }
    cursor += length;
  }
  if (!(startNode && endNode)) {
    return null;
  }
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  const rect = range.getBoundingClientRect();
  return { text: sentence, rect: rect.width > 0 && rect.height > 0 ? rect : null };
}

export function useEditorInputAssist(
  enabled: boolean,
  sourceLanguage: string,
  targetLanguage: string
) {
  const [assist, setAssist] = useState<EditorAssistState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composingRef = useRef(false);
  const translation = useTranslator({
    sourceLanguage,
    targetLanguage,
    provider: "chrome-built-in",
    resetKey: `${sourceLanguage}\u0000${targetLanguage}`,
  });

  useEffect(() => {
    if (!enabled) {
      setAssist(null);
      return;
    }
    const schedule = () => {
      if (composingRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const next = getInputSentence();
        setAssist(next);
        if (next) translation.translate(next.text);
      }, INPUT_DEBOUNCE_MS);
    };
    const onCompositionStart = () => {
      composingRef.current = true;
      setAssist(null);
    };
    const onCompositionEnd = () => {
      composingRef.current = false;
      schedule();
    };
    document.addEventListener("input", schedule, true);
    document.addEventListener("compositionstart", onCompositionStart, true);
    document.addEventListener("compositionend", onCompositionEnd, true);
    return () => {
      document.removeEventListener("input", schedule, true);
      document.removeEventListener("compositionstart", onCompositionStart, true);
      document.removeEventListener("compositionend", onCompositionEnd, true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, sourceLanguage, targetLanguage]);

  return { rect: assist?.rect ?? null, text: translation.result, isLoading: translation.isLoading };
}
