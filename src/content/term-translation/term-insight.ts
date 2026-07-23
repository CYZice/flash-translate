import type { TermContext } from "./term-context";

export interface TermInsight {
  expression: string;
  contextualMeaning: string;
  coreMeaning: string;
  roleInContext: string;
  partOfSpeech: string;
  isMultiwordExpression: boolean;
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

const MAX_INSIGHT_TEXT_LENGTH = 500;
const MAX_EXPRESSION_LENGTH = 160;
const MAX_PART_OF_SPEECH_LENGTH = 80;
const STREAMED_STRING_PROPERTIES = {
  expression: MAX_EXPRESSION_LENGTH,
  contextualMeaning: MAX_INSIGHT_TEXT_LENGTH,
  coreMeaning: MAX_INSIGHT_TEXT_LENGTH,
  roleInContext: MAX_INSIGHT_TEXT_LENGTH,
  partOfSpeech: MAX_PART_OF_SPEECH_LENGTH,
} as const;
const WHITESPACE_PATTERN = /\s/;
const MULTIWORD_PROPERTY_PATTERN = /"isMultiwordExpression"\s*:\s*(true|false)/;

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

function findCompletedJsonStringEnd(
  value: string,
  stringStart: number
): number | null {
  let escaped = false;
  for (let index = stringStart + 1; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character !== '"') {
      continue;
    }
    return index;
  }
  return null;
}

function parseCompletedJsonString(
  value: string,
  stringStart: number,
  stringEnd: number,
  maximumLength: number
): string | null {
  try {
    const parsed = JSON.parse(value.slice(stringStart, stringEnd + 1));
    if (typeof parsed !== "string") {
      return null;
    }
    const normalized = parsed.trim();
    if (normalized.length === 0 || normalized.length > maximumLength) {
      return null;
    }
    return normalized;
  } catch {
    return null;
  }
}

function readCompletedJsonString(
  value: string,
  property: string,
  maximumLength: number
): string | null {
  const propertyIndex = value.indexOf(`"${property}"`);
  const colonIndex = value.indexOf(":", propertyIndex + property.length + 2);
  if (propertyIndex === -1 || colonIndex === -1) {
    return null;
  }

  let stringStart = colonIndex + 1;
  while (WHITESPACE_PATTERN.test(value[stringStart] ?? "")) {
    stringStart += 1;
  }
  if (value[stringStart] !== '"') {
    return null;
  }

  const stringEnd = findCompletedJsonStringEnd(value, stringStart);
  return stringEnd === null
    ? null
    : parseCompletedJsonString(value, stringStart, stringEnd, maximumLength);
}

export function parseTermInsightProgress(value: string): TermInsightProgress {
  const progress: TermInsightProgress = {};

  for (const [property, maximumLength] of Object.entries(
    STREAMED_STRING_PROPERTIES
  )) {
    const parsed = readCompletedJsonString(value, property, maximumLength);
    if (parsed !== null) {
      progress[property as keyof typeof STREAMED_STRING_PROPERTIES] = parsed;
    }
  }

  const multiwordMatch = value.match(MULTIWORD_PROPERTY_PATTERN);
  if (multiwordMatch) {
    progress.isMultiwordExpression = multiwordMatch[1] === "true";
  }

  return progress;
}
