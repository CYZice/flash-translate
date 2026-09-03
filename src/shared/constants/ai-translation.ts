export const AI_TRANSLATION_PORT_NAME = "flash-translate-ai-translation";
export const AI_TEST_CONNECTION_MESSAGE = "flash-translate-ai-test-connection";

export interface AiTranslationRequest {
  type: "start";
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  contextBefore: string;
  contextAfter: string;
}

export type AiTranslationPortMessage =
  | { type: "chunk"; result: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface AiTestConnectionMessage {
  type: typeof AI_TEST_CONNECTION_MESSAGE;
}

export interface AiTestConnectionResponse {
  ok: boolean;
  message: string;
}

export function isAiTranslationRequest(
  value: unknown
): value is AiTranslationRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const message = value as Record<string, unknown>;
  return (
    message.type === "start" &&
    typeof message.text === "string" &&
    typeof message.sourceLanguage === "string" &&
    typeof message.targetLanguage === "string" &&
    typeof message.contextBefore === "string" &&
    typeof message.contextAfter === "string"
  );
}

export function isAiTestConnectionMessage(
  value: unknown
): value is AiTestConnectionMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>).type === AI_TEST_CONNECTION_MESSAGE
  );
}
