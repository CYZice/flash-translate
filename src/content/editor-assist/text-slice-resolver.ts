const CJK_REGEX = /[\u3400-\u9fff]/g;
const BOUNDARY_REGEX = /[。！？!?\n]/g;
const TRAILING_PUNCTUATION_REGEX = /[。！？!?]/;
const WHITESPACE_REGEX = /\s/;

export interface TextSlice {
  end: number;
  start: number;
  text: string;
}

export function resolveSentence(text: string, caret: number): TextSlice {
  const safeCaret = Math.max(0, Math.min(caret, text.length));
  const before = text.slice(0, safeCaret);
  const after = text.slice(safeCaret);
  const startMatch = [...before.matchAll(BOUNDARY_REGEX)].at(-1);
  const endMatch = after.search(BOUNDARY_REGEX);
  let start = startMatch ? (startMatch.index ?? 0) + 1 : 0;
  let end = endMatch === -1 ? text.length : safeCaret + endMatch + 1;

  while (start < end && WHITESPACE_REGEX.test(text[start] ?? "")) {
    start += 1;
  }
  while (end > start && WHITESPACE_REGEX.test(text[end - 1] ?? "")) {
    end -= 1;
  }

  return { start, end, text: text.slice(start, end) };
}

export function resolveCjkSlice(text: string, caret: number): TextSlice | null {
  const sentence = resolveSentence(text, caret);
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
  return { start, end, text: text.slice(start, end) };
}
