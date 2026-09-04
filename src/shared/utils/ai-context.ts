export const DEFAULT_AI_CONTEXT_SENTENCE_COUNT = 1;
export const MIN_AI_CONTEXT_SENTENCE_COUNT = 0;
export const MAX_AI_CONTEXT_SENTENCE_COUNT = 3;

const SENTENCE_END_REGEX =
  /[.!?\u3002\uff01\uff1f]+(?:["'\u201d\u2019\uff09\]]*)/g;

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

export function getAdjacentContext(
  text: string,
  direction: "before" | "after",
  sentenceCount: number
): string {
  const normalized = normalizeContextText(text);
  const count = normalizeAiContextSentenceCount(sentenceCount);
  if (!normalized || count === 0) {
    return "";
  }

  const sentences: string[] = [];
  let start = 0;
  for (const match of normalized.matchAll(SENTENCE_END_REGEX)) {
    const end = match.index + match[0].length;
    const sentence = normalized.slice(start, end).trim();
    if (sentence) {
      sentences.push(sentence);
    }
    start = end;
  }
  const trailingText = normalized.slice(start).trim();
  if (trailingText) {
    sentences.push(trailingText);
  }

  const selectedSentences =
    direction === "after" ? sentences.slice(0, count) : sentences.slice(-count);
  return selectedSentences.join(" ");
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
