import { getLanguageEnglishName } from "../constants/languages";
import { buildChatCompletionsUrl, buildModelsUrl } from "../utils/ai-endpoint";
import type { AiReasoningEffort, TranslationInput } from "./config";
import { readTokenUsage, type TokenUsage } from "./usage";

const GPT_5_MODEL_REGEX = /^gpt-5(?:[.-]|$)/i;
const DEEPSEEK_MODEL_REGEX = /^deepseek(?:[.-]|$)/i;
const TRAILING_CARRIAGE_RETURN_REGEX = /\r$/;

export interface OpenAiCompatibleConfig {
  baseUrl: string;
  model: string;
  systemPrompt: string;
  thinkingEnabled?: boolean;
  reasoningEffort?: AiReasoningEffort;
}

function supportsReasoningEffort(model: string): boolean {
  return GPT_5_MODEL_REGEX.test(model.trim());
}

export function getTranslationRequestOptions(
  model: string,
  thinkingEnabled = false,
  reasoningEffort: AiReasoningEffort = "high"
): {
  reasoning_effort?: "none" | AiReasoningEffort;
  thinking?: { type: "enabled" | "disabled" };
} {
  const normalizedModel = model.trim();
  if (DEEPSEEK_MODEL_REGEX.test(normalizedModel)) {
    return thinkingEnabled
      ? { thinking: { type: "enabled" }, reasoning_effort: reasoningEffort }
      : { thinking: { type: "disabled" } };
  }
  return supportsReasoningEffort(normalizedModel)
    ? { reasoning_effort: "none" }
    : {};
}

interface ChatCompletionChunk {
  choices?: Array<{
    delta?: { content?: string | null };
    text?: string | null;
  }>;
  error?: { message?: string };
}

function createHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

function validateConfig(config: OpenAiCompatibleConfig): void {
  if (!config.baseUrl.trim()) {
    throw new Error("Custom AI Base URL is not configured");
  }
  if (!config.model.trim()) {
    throw new Error("Custom AI model is not configured");
  }
}

function buildUserMessage(request: TranslationInput): string {
  const sourceLanguage = getLanguageEnglishName(request.sourceLanguage);
  const targetLanguage = getLanguageEnglishName(request.targetLanguage);
  const payload = {
    task: "Translate only the selected text. Use context only for disambiguation.",
    sourceLanguage,
    targetLanguage,
    selectedText: request.text,
    contextBefore: request.contextBefore,
    contextAfter: request.contextAfter,
  };
  return JSON.stringify(payload, null, 2);
}

function buildMessages(
  request: TranslationInput,
  systemPrompt: string
): Array<{ role: "system" | "user"; content: string }> {
  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (systemPrompt.trim()) {
    messages.push({ role: "system", content: systemPrompt.trim() });
  }
  messages.push({ role: "user", content: buildUserMessage(request) });
  return messages;
}

async function getErrorMessage(response: Response): Promise<string> {
  const body = (await response.text()).trim();
  const detail = body ? `: ${body.slice(0, 500)}` : "";
  return `AI request failed (${response.status} ${response.statusText})${detail}`;
}

async function* readSseData(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex >= 0) {
        const line = buffer
          .slice(0, newlineIndex)
          .replace(TRAILING_CARRIAGE_RETURN_REGEX, "");
        buffer = buffer.slice(newlineIndex + 1);
        if (line.startsWith("data:")) {
          yield line.slice(5).trimStart();
        }
        newlineIndex = buffer.indexOf("\n");
      }
    }

    const finalLine = buffer.replace(TRAILING_CARRIAGE_RETURN_REGEX, "");
    if (finalLine.startsWith("data:")) {
      yield finalLine.slice(5).trimStart();
    }
  } finally {
    reader.releaseLock();
  }
}

export function parseOpenAiSseChunk(
  data: string,
  onUsage?: (usage: TokenUsage) => void
): string | null {
  if (!data || data === "[DONE]") {
    return null;
  }

  let chunk: ChatCompletionChunk;
  try {
    chunk = JSON.parse(data) as ChatCompletionChunk;
  } catch (error) {
    throw new Error("Custom AI returned invalid SSE JSON", {
      cause: error,
    });
  }

  const usage = readTokenUsage(chunk);
  if (usage) {
    onUsage?.(usage);
  }
  if (chunk.error?.message) {
    throw new Error(chunk.error.message);
  }

  const choice = chunk.choices?.[0];
  return choice?.delta?.content ?? choice?.text ?? null;
}

export async function* streamOpenAiTranslation(
  request: TranslationInput,
  config: OpenAiCompatibleConfig,
  apiKey: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
  observer: {
    onRequest?: () => void;
    onUsage?: (usage: TokenUsage) => void;
  } = {}
): AsyncGenerator<string> {
  const httpRequest = buildTranslationHttpRequest(
    request,
    config,
    apiKey,
    true,
    // The official endpoint supports this option. Do not impose it on custom
    // compatible endpoints; consume their usage when supplied, otherwise unknown.
    new URL(config.baseUrl).origin === "https://api.openai.com"
  );
  signal.throwIfAborted();
  observer.onRequest?.();
  const response = await fetchImpl(httpRequest.url, {
    method: "POST",
    headers: httpRequest.headers,
    signal,
    body: httpRequest.body,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
  if (!response.body) {
    throw new Error("Custom AI response did not include a stream body");
  }

  for await (const data of readSseData(response.body)) {
    if (data === "[DONE]") {
      return;
    }
    const delta = parseOpenAiSseChunk(data, observer.onUsage);
    if (delta) {
      yield delta;
    }
  }
}

export async function testOpenAiConnection(
  config: Pick<OpenAiCompatibleConfig, "baseUrl">,
  apiKey: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  if (!config.baseUrl.trim()) {
    throw new Error("Custom AI Base URL is not configured");
  }
  const response = await fetchImpl(buildModelsUrl(config.baseUrl), {
    method: "GET",
    headers: createHeaders(apiKey),
    signal,
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
}

export function buildTranslationHttpRequest(
  request: TranslationInput,
  config: OpenAiCompatibleConfig,
  apiKey: string,
  stream: boolean,
  includeUsage = false
): { url: string; headers: Record<string, string>; body: string } {
  validateConfig(config);
  const headers = createHeaders(apiKey);
  headers.Accept = stream ? "text/event-stream" : "application/json";
  return {
    url: buildChatCompletionsUrl(config.baseUrl),
    headers,
    body: JSON.stringify({
      model: config.model.trim(),
      messages: buildMessages(request, config.systemPrompt),
      stream,
      ...(stream && includeUsage
        ? { stream_options: { include_usage: true } }
        : {}),
      ...getTranslationRequestOptions(
        config.model,
        config.thinkingEnabled,
        config.reasoningEffort
      ),
    }),
  };
}

export function parseOpenAiTranslationResponse(value: unknown): string {
  if (typeof value !== "object" || value === null) {
    throw new Error("AI returned an invalid translation response");
  }
  const response = value as {
    choices?: Array<{ message?: { content?: unknown } }>;
    error?: { message?: string };
  };
  if (response.error?.message) {
    throw new Error(response.error.message);
  }
  const content = response.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("AI returned an empty translation");
  }
  return content;
}
