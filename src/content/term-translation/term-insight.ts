import type { TermContext } from "./term-context";

export interface TermInsight {
  contextualMeaning: string;
}

export type TermInsightProgress = Partial<TermInsight>;

export interface TermInsightResult {
  sourceText: string;
  quickTranslation: string;
  sourceLanguage: string;
  targetLanguage: string;
  context: TermContext;
  insight: TermInsight;
}

export type TermInsightUnavailableReason =
  | "unsupported-api"
  | "unsupported-language"
  | "model-unavailable"
  | "activation-required"
  | "context-too-large"
  | "invalid-response";

export class TermInsightUnavailableError extends Error {
  readonly reason: TermInsightUnavailableReason;

  constructor(reason: TermInsightUnavailableReason, message: string) {
    super(message);
    this.name = "TermInsightUnavailableError";
    this.reason = reason;
  }
}

const MAX_INSIGHT_TEXT_LENGTH = 300;
const JAPANESE_CHARACTER_PATTERN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const LATIN_CHARACTER_PATTERN = /[A-Za-z]/;

function isLikelyRequestedLanguage(
  value: string,
  targetLanguage: string
): boolean {
  if (targetLanguage === "ja") {
    return JAPANESE_CHARACTER_PATTERN.test(value);
  }
  return LATIN_CHARACTER_PATTERN.test(value);
}

function normalizeInsightText(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > MAX_INSIGHT_TEXT_LENGTH) {
    throw new TermInsightUnavailableError(
      "invalid-response",
      "Prompt API returned an invalid contextual meaning"
    );
  }
  return normalized;
}

export function parseTermInsight(
  value: string,
  targetLanguage: string
): TermInsight {
  const contextualMeaning = normalizeInsightText(value);
  if (!isLikelyRequestedLanguage(contextualMeaning, targetLanguage)) {
    throw new TermInsightUnavailableError(
      "invalid-response",
      "Prompt API returned the contextual meaning in an unexpected language"
    );
  }
  return { contextualMeaning };
}

export function parseTermInsightProgress(
  value: string,
  targetLanguage: string
): TermInsightProgress {
  const contextualMeaning = value.trim();
  if (
    contextualMeaning.length === 0 ||
    contextualMeaning.length > MAX_INSIGHT_TEXT_LENGTH ||
    !isLikelyRequestedLanguage(contextualMeaning, targetLanguage)
  ) {
    return {};
  }
  return { contextualMeaning };
}
