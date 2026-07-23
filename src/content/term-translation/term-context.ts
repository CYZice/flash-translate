export type TermContextStrategy =
  | "neighboring-sentences"
  | "containing-sentence"
  | "character-window";

export interface TermContext {
  text: string;
  termOffset: number;
  strategy: TermContextStrategy;
}

interface ResolveTermContextOptions {
  selectedText: string;
  termOffset: number;
  termLength: number;
  sourceLanguage: string;
  maxCharacters?: number;
}

interface SentenceBoundary {
  start: number;
  end: number;
}

export const DEFAULT_TERM_CONTEXT_MAX_CHARACTERS = 2400;

function createSentenceSegmenter(language: string): Intl.Segmenter {
  try {
    return new Intl.Segmenter(language, { granularity: "sentence" });
  } catch {
    return new Intl.Segmenter(undefined, { granularity: "sentence" });
  }
}

function getSentenceBoundaries(
  text: string,
  language: string
): SentenceBoundary[] {
  return Array.from(
    createSentenceSegmenter(language).segment(text),
    (part) => ({
      start: part.index,
      end: part.index + part.segment.length,
    })
  );
}

function findContainingSentenceIndex(
  boundaries: readonly SentenceBoundary[],
  termOffset: number
): number {
  return boundaries.findIndex(
    (boundary) => boundary.start <= termOffset && termOffset < boundary.end
  );
}

function createCharacterWindow(
  text: string,
  termOffset: number,
  termLength: number,
  maxCharacters: number
): TermContext {
  if (text.length <= maxCharacters) {
    return {
      text,
      termOffset,
      strategy: "character-window",
    };
  }

  const safeTermLength = Math.min(termLength, maxCharacters);
  const surroundingCharacters = maxCharacters - safeTermLength;
  const idealStart = termOffset - Math.floor(surroundingCharacters / 2);
  const maximumStart = Math.max(0, text.length - maxCharacters);
  const start = Math.min(Math.max(0, idealStart), maximumStart);

  return {
    text: text.slice(start, start + maxCharacters),
    termOffset: termOffset - start,
    strategy: "character-window",
  };
}

export function resolveTermContext({
  selectedText,
  termOffset,
  termLength,
  sourceLanguage,
  maxCharacters = DEFAULT_TERM_CONTEXT_MAX_CHARACTERS,
}: ResolveTermContextOptions): TermContext {
  const boundedMaxCharacters = Math.max(termLength, maxCharacters);
  const boundaries = getSentenceBoundaries(selectedText, sourceLanguage);
  const sentenceIndex = findContainingSentenceIndex(boundaries, termOffset);

  if (sentenceIndex < 0) {
    return createCharacterWindow(
      selectedText,
      termOffset,
      termLength,
      boundedMaxCharacters
    );
  }

  const sentence = boundaries[sentenceIndex];
  const previousSentence = boundaries[sentenceIndex - 1];
  const nextSentence = boundaries[sentenceIndex + 1];
  const neighboringStart = previousSentence?.start ?? sentence.start;
  const neighboringEnd = nextSentence?.end ?? sentence.end;

  if (neighboringEnd - neighboringStart <= boundedMaxCharacters) {
    return {
      text: selectedText.slice(neighboringStart, neighboringEnd),
      termOffset: termOffset - neighboringStart,
      strategy: "neighboring-sentences",
    };
  }

  if (sentence.end - sentence.start <= boundedMaxCharacters) {
    return {
      text: selectedText.slice(sentence.start, sentence.end),
      termOffset: termOffset - sentence.start,
      strategy: "containing-sentence",
    };
  }

  const sentenceText = selectedText.slice(sentence.start, sentence.end);
  return createCharacterWindow(
    sentenceText,
    termOffset - sentence.start,
    termLength,
    boundedMaxCharacters
  );
}
