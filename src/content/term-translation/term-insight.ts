import type { TermContext } from "./term-context";

export interface TermInsight {
  expression: string;
  contextualMeaning: string;
  coreMeaning: string;
  roleInContext: string;
  partOfSpeech: string;
  isMultiwordExpression: boolean;
}

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

const MAX_INSIGHT_TEXT_LENGTH = 500;
const MAX_EXPRESSION_LENGTH = 160;
const MAX_PART_OF_SPEECH_LENGTH = 80;

function readString(
  value: unknown,
  property: string,
  maximumLength: number
): string {
  if (typeof value !== "string") {
    throw new TermInsightUnavailableError(
      "invalid-response",
      `Prompt API returned a non-string ${property}`
    );
  }

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0 || normalizedValue.length > maximumLength) {
    throw new TermInsightUnavailableError(
      "invalid-response",
      `Prompt API returned an invalid ${property}`
    );
  }

  return normalizedValue;
}

export function parseTermInsight(value: string): TermInsight {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new TermInsightUnavailableError(
      "invalid-response",
      "Prompt API returned invalid JSON"
    );
  }

  if (!(parsed && typeof parsed === "object")) {
    throw new TermInsightUnavailableError(
      "invalid-response",
      "Prompt API returned an invalid result"
    );
  }

  const record = parsed as Record<string, unknown>;
  if (typeof record.isMultiwordExpression !== "boolean") {
    throw new TermInsightUnavailableError(
      "invalid-response",
      "Prompt API returned an invalid multiword flag"
    );
  }

  return {
    expression: readString(
      record.expression,
      "expression",
      MAX_EXPRESSION_LENGTH
    ),
    contextualMeaning: readString(
      record.contextualMeaning,
      "contextualMeaning",
      MAX_INSIGHT_TEXT_LENGTH
    ),
    coreMeaning: readString(
      record.coreMeaning,
      "coreMeaning",
      MAX_INSIGHT_TEXT_LENGTH
    ),
    roleInContext: readString(
      record.roleInContext,
      "roleInContext",
      MAX_INSIGHT_TEXT_LENGTH
    ),
    partOfSpeech: readString(
      record.partOfSpeech,
      "partOfSpeech",
      MAX_PART_OF_SPEECH_LENGTH
    ),
    isMultiwordExpression: record.isMultiwordExpression,
  };
}
