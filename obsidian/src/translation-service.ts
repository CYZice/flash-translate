import type { TranslationInput } from "../../src/shared/translation/config";
import {
  buildTranslationHttpRequest,
  parseOpenAiTranslationResponse,
} from "../../src/shared/translation/openai-compatible";
import type { ObsidianTranslationSettings } from "./settings";

export interface TranslationHttpRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  throw: boolean;
}

export interface TranslationHttpResponse {
  status: number;
  body: unknown;
}

export type TranslationHttpClient = (
  request: TranslationHttpRequest,
  signal?: AbortSignal
) => Promise<TranslationHttpResponse>;

export async function translateNoteSelection(
  input: TranslationInput,
  settings: ObsidianTranslationSettings,
  apiKey: string,
  request: TranslationHttpClient,
  signal?: AbortSignal
): Promise<string> {
  signal?.throwIfAborted();
  const http = buildTranslationHttpRequest(input, settings, apiKey, false);
  const response = await request(
    { ...http, method: "POST", throw: false },
    signal
  );
  signal?.throwIfAborted();
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Translation request failed (HTTP ${response.status}). Check your endpoint, model, and API key.`
    );
  }
  return parseOpenAiTranslationResponse(response.body);
}
