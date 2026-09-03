import {
  AI_TRANSLATION_PORT_NAME,
  type AiTranslationPortMessage,
  type AiTranslationRequest,
} from "@/shared/constants/ai-translation";
import type { TranslationFunctions } from "../hooks/translator-executor";

type QueueItem =
  | AiTranslationPortMessage
  | { type: "aborted" }
  | { type: "disconnected"; message: string };

function createAbortError(): DOMException {
  return new DOMException("Translation aborted", "AbortError");
}

class PortMessageQueue {
  private items: QueueItem[] = [];
  private pendingResolve: ((item: QueueItem) => void) | null = null;

  push(item: QueueItem): void {
    if (this.pendingResolve) {
      const resolve = this.pendingResolve;
      this.pendingResolve = null;
      resolve(item);
      return;
    }
    this.items.push(item);
  }

  next(): Promise<QueueItem> {
    const item = this.items.shift();
    if (item) {
      return Promise.resolve(item);
    }
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
    });
  }
}

class OpenAiCompatibleTranslator implements TranslationFunctions {
  async *translateStreaming(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    signal?: AbortSignal,
    context?: { contextBefore: string; contextAfter: string }
  ): AsyncGenerator<string> {
    if (signal?.aborted) {
      throw createAbortError();
    }

    const port = chrome.runtime.connect({ name: AI_TRANSLATION_PORT_NAME });
    const queue = new PortMessageQueue();
    let completed = false;

    const onMessage = (message: AiTranslationPortMessage) => {
      queue.push(message);
    };
    const onDisconnect = () => {
      if (completed) {
        return;
      }
      if (signal?.aborted) {
        queue.push({ type: "aborted" });
        return;
      }
      queue.push({
        type: "disconnected",
        message: chrome.runtime.lastError?.message ?? "AI connection closed",
      });
    };
    const onAbort = () => {
      queue.push({ type: "aborted" });
      try {
        port.disconnect();
      } catch {
        // Port may already be disconnected.
      }
    };

    port.onMessage.addListener(onMessage);
    port.onDisconnect.addListener(onDisconnect);
    signal?.addEventListener("abort", onAbort, { once: true });

    const request: AiTranslationRequest = {
      type: "start",
      text,
      sourceLanguage,
      targetLanguage,
      contextBefore: context?.contextBefore ?? "",
      contextAfter: context?.contextAfter ?? "",
    };

    try {
      port.postMessage(request);

      while (true) {
        const message = await queue.next();
        if (message.type === "chunk") {
          yield message.result;
          continue;
        }
        if (message.type === "done") {
          completed = true;
          return;
        }
        if (message.type === "aborted") {
          throw createAbortError();
        }
        if (message.type === "error") {
          throw new Error(message.message);
        }
        throw new Error(message.message);
      }
    } finally {
      completed = true;
      signal?.removeEventListener("abort", onAbort);
      port.onMessage.removeListener(onMessage);
      port.onDisconnect.removeListener(onDisconnect);
      try {
        port.disconnect();
      } catch {
        // Port may already be disconnected.
      }
    }
  }
}

export const openAiCompatibleTranslator = new OpenAiCompatibleTranslator();
