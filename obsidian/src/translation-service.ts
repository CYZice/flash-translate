import type { TranslationInput } from "../../src/shared/translation/config";
import {
  buildTranslationHttpRequest,
  parseOpenAiTranslationResponse,
} from "../../src/shared/translation/openai-compatible";
import type { ObsidianTranslationSettings } from "./settings";

export type TranslationHttpClient = (request: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  throw: boolean;
}) => Promise<{ status: number; text: string }>;

export async function translateNoteSelection(
  input: TranslationInput,
  settings: ObsidianTranslationSettings,
  apiKey: string,
  request: TranslationHttpClient
): Promise<string> {
  const http = buildTranslationHttpRequest(input, settings, apiKey, false);
  const response = await request({ ...http, method: "POST", throw: false });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Translation request failed (HTTP ${response.status}). Check your endpoint, model, and API key.`
    );
  }
  let body: unknown;
  try {
    body = JSON.parse(response.text);
  } catch (cause) {
    throw new Error("The translation endpoint returned invalid JSON.", {
      cause,
    });
  }
  return parseOpenAiTranslationResponse(body);
}
