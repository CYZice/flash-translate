import { useEffect, useRef, useState } from "react";
import { useTranslator } from "./use-translator";

const INPUT_DEBOUNCE_MS = 400;
const CJK_REGEX = /[\u3400-\u9fff]/g;
const BOUNDARY_REGEX = /[。！？!?\n]/g;
const TRAILING_PUNCTUATION_REGEX = /[。！？!?]/;
const WHITESPACE_REGEX = /\s/;

interface EditorAssistState {
  text: string;
  rect: DOMRect | null;
}

export function getSentenceSlice(value: string, caret: number) {
  const safeCaret = Math.max(0, Math.min(caret, value.length));
  const before = value.slice(0, safeCaret);
  const after = value.slice(safeCaret);
  const startMatch = [...before.matchAll(BOUNDARY_REGEX)].at(-1);
  const endMatch = after.search(BOUNDARY_REGEX);
  let start = startMatch ? (startMatch.index ?? 0) + 1 : 0;
  let end = endMatch === -1 ? value.length : safeCaret + endMatch + 1;

  while (start < end && WHITESPACE_REGEX.test(value[start] ?? "")) {
    start += 1;
  }
  while (end > start && WHITESPACE_REGEX.test(value[end - 1] ?? "")) {
    end -= 1;
  }

  return { start, end, text: value.slice(start, end) };
}

export function getCjkTranslationSlice(value: string, caret: number) {
  const sentence = getSentenceSlice(value, caret);
  const cjkMatches = [...sentence.text.matchAll(CJK_REGEX)];
  const firstMatch = cjkMatches[0];
  const lastMatch = cjkMatches.at(-1);
  if (!(firstMatch && lastMatch)) {
    return null;
  }

  const startOffset = firstMatch.index ?? 0;
  let endOffset = (lastMatch.index ?? 0) + lastMatch[0].length;
  while (
    endOffset < sentence.text.length &&
    TRAILING_PUNCTUATION_REGEX.test(sentence.text[endOffset] ?? "")
  ) {
    endOffset += 1;
  }

  const start = sentence.start + startOffset;
  const end = sentence.start + endOffset;

  return { start, end, text: value.slice(start, end) };
}

function getEditable(node: Node | null): HTMLElement | null {
  let current: Node | null = node;
  while (current) {
    if (
      current instanceof HTMLElement &&
      (current.isContentEditable ||
        current.getAttribute("contenteditable") === "true")
    ) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

function getTextControlSentence(
  active: HTMLTextAreaElement | HTMLInputElement
): EditorAssistState | null {
  if (active.type === "password") {
    return null;
  }
  const caret = active.selectionStart ?? 0;
  const sentence = getCjkTranslationSlice(active.value, caret);
  if (!sentence) {
    return null;
  }
  return { text: sentence.text, rect: active.getBoundingClientRect() };
}

function getContentEditableSentence(
  selection: Selection
): EditorAssistState | null {
  const editable = getEditable(selection.anchorNode);
  if (!editable) {
    return null;
  }

  const text = editable.innerText || editable.textContent || "";
  const before = document.createRange();
  before.selectNodeContents(editable);
  before.setEnd(selection.anchorNode as Node, selection.anchorOffset);
  const caretOffset = Math.min(before.toString().length, text.length);
  const sentence = getCjkTranslationSlice(text, caretOffset);
  if (!sentence) {
    return null;
  }
  const { start, end } = sentence;

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
    return {
      text: sentence.text,
      rect: selection.getRangeAt(0).getBoundingClientRect(),
    };
  }
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  const rect = range.getBoundingClientRect();
  return {
    text: sentence.text,
    rect:
      rect.width > 0 && rect.height > 0
        ? rect
        : selection.getRangeAt(0).getBoundingClientRect(),
  };
}

function getInputSentence(): EditorAssistState | null {
  const active = document.activeElement;
  if (
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLInputElement
  ) {
    return getTextControlSentence(active);
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return null;
  }
  return getContentEditableSentence(selection);
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
    // Input assistance always reverses the main translation direction.
    // Example: main en -> zh becomes input zh -> en.
    sourceLanguage: targetLanguage,
    targetLanguage: sourceLanguage,
    provider: "chrome-built-in",
    resetKey: `${targetLanguage}\u0000${sourceLanguage}`,
  });

  useEffect(() => {
    if (enabled) {
      console.info("[flash-translate][input-assist] enabled", {
        sourceLanguage: targetLanguage,
        targetLanguage: sourceLanguage,
      });
    }
  }, [enabled, sourceLanguage, targetLanguage]);

  useEffect(() => {
    if (!enabled) {
      setAssist(null);
      translation.reset();
      return;
    }

    const clearAssist = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setAssist(null);
      translation.reset();
    };

    const schedule = () => {
      if (composingRef.current) {
        return;
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      // Hide the previous hint immediately while the editor changes. This
      // includes send actions that clear ChatGPT's contenteditable composer.
      setAssist(null);
      translation.reset();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const next = getInputSentence();
        setAssist(next);
        if (next) {
          console.info("[flash-translate][input-assist] detected", {
            text: next.text,
            sourceLanguage: targetLanguage,
            targetLanguage: sourceLanguage,
          });
          translation.translate(next.text).catch(() => undefined);
        } else {
          console.debug(
            "[flash-translate][input-assist] input received, no Chinese sentence found"
          );
        }
      }, INPUT_DEBOUNCE_MS);
    };
    const onCompositionStart = () => {
      composingRef.current = true;
      clearAssist();
    };
    const onCompositionEnd = () => {
      composingRef.current = false;
      schedule();
    };
    document.addEventListener("input", schedule, true);
    document.addEventListener("compositionstart", onCompositionStart, true);
    document.addEventListener("compositionend", onCompositionEnd, true);
    document.addEventListener("focusout", clearAssist, true);
    return () => {
      document.removeEventListener("input", schedule, true);
      document.removeEventListener(
        "compositionstart",
        onCompositionStart,
        true
      );
      document.removeEventListener("compositionend", onCompositionEnd, true);
      document.removeEventListener("focusout", clearAssist, true);
      clearAssist();
    };
  }, [
    enabled,
    sourceLanguage,
    targetLanguage,
    translation.translate,
  ]);

  useEffect(() => {
    if (translation.error) {
      console.error("[flash-translate][input-assist] translation failed", {
        sourceLanguage: targetLanguage,
        targetLanguage: sourceLanguage,
        error: translation.error,
        availability: translation.availability,
      });
    }
  }, [
    translation.error,
    translation.availability,
    sourceLanguage,
    targetLanguage,
  ]);

  return {
    rect: assist?.rect ?? null,
    text: translation.result,
    isLoading: translation.isLoading,
    error: translation.error?.message ?? null,
  };
}
