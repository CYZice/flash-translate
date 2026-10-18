export type AiReasoningEffort = "low" | "high" | "max";

export const DEFAULT_AI_SYSTEM_PROMPT =
  "Translate the selected text into natural, accurate target-language text. Use the preceding and following sentences only to resolve context and terminology. Output only the translation.";

export interface TranslationInput {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  contextBefore: string;
  contextAfter: string;
}
