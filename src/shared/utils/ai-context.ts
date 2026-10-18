export const DEFAULT_AI_CONTEXT_SENTENCE_COUNT = 1;
export const MIN_AI_CONTEXT_SENTENCE_COUNT = 0;
export const MAX_AI_CONTEXT_SENTENCE_COUNT = 3;

const SENTENCE_END_REGEX =
  /[.!?\u3002\uff01\uff1f]+(?:["'\u201d\u2019\uff09\]]*)/g;
const SENTENCE_PUNCTUATION = /[.!?\u3002\uff01\uff1f]/;
const SENTENCE_CLOSER = /["'\u201d\u2019\uff09\]]/;

export function normalizeAiContextSentenceCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return DEFAULT_AI_CONTEXT_SENTENCE_COUNT;
  }
  return Math.min(
    MAX_AI_CONTEXT_SENTENCE_COUNT,
    Math.max(MIN_AI_CONTEXT_SENTENCE_COUNT, value)
  );
}

function normalizeContextText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function findPreviousSentenceEnd(
  text: string,
  before: number
): { start: number; end: number } | null {
  for (let index = before - 1; index >= 0; index--) {
    if (!SENTENCE_PUNCTUATION.test(text[index])) {
      continue;
    }
    let end = index + 1;
    while (end < text.length && SENTENCE_CLOSER.test(text[end])) {
      end++;
    }
    while (index > 0 && SENTENCE_PUNCTUATION.test(text[index - 1])) {
      index--;
    }
    return { start: index, end };
  }
  return null;
}

function getContextBefore(text: string, count: number): string {
  const sentences: string[] = [];
  let end = text.length;
  let cursor = end;
  while (sentences.length < count) {
    const boundary = findPreviousSentenceEnd(text, cursor);
    const sentence = normalizeContextText(text.slice(boundary?.end ?? 0, end));
    if (sentence) {
      sentences.unshift(sentence);
    }
    if (!boundary) {
      break;
    }
    end = boundary.end;
    cursor = boundary.start;
  }
  return sentences.join(" ");
}

export function getAdjacentContext(
  text: string,
  direction: "before" | "after",
  sentenceCount: number
): string {
  const count = normalizeAiContextSentenceCount(sentenceCount);
  if (!text || count === 0) {
    return "";
  }
  if (direction === "before") {
    return getContextBefore(text, count);
  }

  const sentences: string[] = [];
  let start = 0;
  for (const match of text.matchAll(SENTENCE_END_REGEX)) {
    const end = match.index + match[0].length;
    const sentence = normalizeContextText(text.slice(start, end));
    if (sentence) {
      sentences.push(sentence);
    }
    if (sentences.length === count) {
      return sentences.join(" ");
    }
    start = end;
  }
  const trailingText = normalizeContextText(text.slice(start));
  if (trailingText) {
    sentences.push(trailingText);
  }

  return sentences.join(" ");
}

export function getContextAroundSelection(
  contextBefore: string,
  contextAfter: string,
  sentenceCount: number
): { contextBefore: string; contextAfter: string } {
  return {
    contextBefore: getAdjacentContext(contextBefore, "before", sentenceCount),
    contextAfter: getAdjacentContext(contextAfter, "after", sentenceCount),
  };
}
