import {
  AI_TRANSLATION_PORT_NAME,
  type AiTestConnectionResponse,
  isAiTranslationRequest,
} from "@/shared/constants/ai-translation";
import { getAiApiKey } from "@/shared/storage/ai-api-key";
import { getSettings } from "@/shared/storage/settings";
import { getAiHostPermissionPattern } from "@/shared/utils/ai-endpoint";
import {
  streamOpenAiTranslation,
  testOpenAiConnection,
} from "./openai-compatible";

async function assertHostPermission(baseUrl: string): Promise<void> {
  const originPattern = getAiHostPermissionPattern(baseUrl);
  const granted = await chrome.permissions.contains({
    origins: [originPattern],
  });
  if (!granted) {
    throw new Error(
      `Host access is not granted for ${new URL(baseUrl).origin}. Open Flash Translate settings and save or test the Custom AI connection.`
    );
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function registerAiTranslationPortHandler(): void {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== AI_TRANSLATION_PORT_NAME) {
      return;
    }

    let abortController: AbortController | null = null;
    let disconnected = false;

    const safePostMessage = (message: unknown) => {
      if (disconnected) {
        return;
      }
      try {
        port.postMessage(message);
      } catch {
        disconnected = true;
        abortController?.abort();
      }
    };

    port.onDisconnect.addListener(() => {
      disconnected = true;
      abortController?.abort();
      abortController = null;
    });

    port.onMessage.addListener((message: unknown) => {
      if (!isAiTranslationRequest(message)) {
        return;
      }

      abortController?.abort();
      const controller = new AbortController();
      abortController = controller;

      const run = async () => {
        try {
          const [settings, apiKey] = await Promise.all([
            getSettings(),
            getAiApiKey(),
          ]);
          await assertHostPermission(settings.aiBaseUrl);

          const request = message;

          let accumulated = "";
          for await (const delta of streamOpenAiTranslation(
            request,
            {
              baseUrl: settings.aiBaseUrl,
              model: settings.aiModel,
              systemPrompt: settings.aiSystemPrompt,
              thinkingEnabled: settings.aiThinkingEnabled,
              reasoningEffort: settings.aiReasoningEffort,
            },
            apiKey,
            controller.signal
          )) {
            accumulated += delta;
            safePostMessage({ type: "chunk", result: accumulated });
          }

          safePostMessage({ type: "done" });
        } catch (error) {
          if (!isAbortError(error)) {
            safePostMessage({ type: "error", message: getErrorMessage(error) });
          }
        } finally {
          if (abortController === controller) {
            abortController = null;
          }
        }
      };

      run().catch((error: unknown) => {
        if (!isAbortError(error)) {
          safePostMessage({ type: "error", message: getErrorMessage(error) });
        }
      });
    });
  });
}

export async function handleAiTestConnection(): Promise<AiTestConnectionResponse> {
  const controller = new AbortController();
  try {
    const [settings, apiKey] = await Promise.all([
      getSettings(),
      getAiApiKey(),
    ]);
    await assertHostPermission(settings.aiBaseUrl);
    await testOpenAiConnection(
      { baseUrl: settings.aiBaseUrl },
      apiKey,
      controller.signal
    );
    return { ok: true, message: "Connection successful" };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}
