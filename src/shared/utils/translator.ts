// Using official @types/dom-chromium-ai types

import { reportLocalTranslation } from "../storage/usage";
import { createPrefixedLogger } from "./logger";
import {
  readStreamAccumulated,
  streamMultipleParagraphs,
} from "./translator-streaming";

const log = createPrefixedLogger("translator");

import {
  type ChromeAvailability,
  createNotAvailableError,
  createUnavailabilityError,
  createUnsupportedError,
  filterSourceLanguages,
  mapAvailabilityStatus,
  splitTextIntoParagraphs,
} from "./translator-utils";

interface TranslatorSession {
  translator: Translator | null;
  creation: Promise<Translator> | null;
  controller: AbortController | null;
  owners: number;
}

// Our internal availability status (maps from Availability type)
export type TranslationAvailabilityStatus =
  | "available"
  | "after-download"
  | "unavailable"
  | "unsupported";

class TranslatorManager {
  private readonly sessions = new Map<string, TranslatorSession>();

  retain(sourceLanguage: string, targetLanguage: string): () => void {
    const key = this.pairKey(sourceLanguage, targetLanguage);
    const session = this.getSession(key);
    session.owners += 1;
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      session.owners -= 1;
      if (session.owners === 0) {
        this.destroySession(key, session);
      }
    };
  }

  async checkAvailability(
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationAvailabilityStatus> {
    if (typeof Translator === "undefined") {
      return "unsupported";
    }

    try {
      const result = await Translator.availability({
        sourceLanguage,
        targetLanguage,
      });

      return mapAvailabilityStatus(result as ChromeAvailability);
    } catch (error) {
      log.error("Failed to check translator availability:", error);
      return "unsupported";
    }
  }

  getTranslator(
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<Translator> {
    const key = this.pairKey(sourceLanguage, targetLanguage);
    const session = this.getSession(key);
    if (session.translator) {
      return Promise.resolve(session.translator);
    }
    if (!session.creation) {
      const controller = new AbortController();
      session.controller = controller;
      session.creation = this.createTranslator(
        sourceLanguage,
        targetLanguage,
        key,
        session,
        controller.signal
      ).finally(() => {
        session.creation = null;
        session.controller = null;
      });
    }
    return session.creation;
  }

  private async createTranslator(
    sourceLanguage: string,
    targetLanguage: string,
    key: string,
    session: TranslatorSession,
    signal: AbortSignal
  ): Promise<Translator> {
    if (typeof Translator === "undefined") {
      throw createNotAvailableError();
    }

    // Check availability
    const availability = await this.checkAvailability(
      sourceLanguage,
      targetLanguage
    );
    signal.throwIfAborted();

    if (availability === "unsupported") {
      throw createUnsupportedError();
    }

    if (availability === "unavailable") {
      throw createUnavailabilityError(sourceLanguage, targetLanguage);
    }

    // Create translator instance with download progress monitoring
    const translator = await Translator.create({
      sourceLanguage,
      targetLanguage,
      signal,
      monitor(m) {
        const handleProgress = (e: ProgressEvent) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            log.log(`Model download: ${progress.toFixed(1)}%`);
          }
          // Remove listener when download is complete
          if (e.loaded === e.total) {
            m.removeEventListener("downloadprogress", handleProgress);
          }
        };
        m.addEventListener("downloadprogress", handleProgress);
      },
    });

    if (signal.aborted || this.sessions.get(key) !== session) {
      translator.destroy();
      throw new DOMException("Translation closed", "AbortError");
    }

    session.translator = translator;
    return translator;
  }

  async *translateStreaming(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    signal?: AbortSignal
  ): AsyncGenerator<string> {
    const translator = await this.getTranslator(sourceLanguage, targetLanguage);
    signal?.throwIfAborted();
    const paragraphs = splitTextIntoParagraphs(text);

    const stream =
      paragraphs.length === 1
        ? readStreamAccumulated(translator.translateStreaming(text, { signal }))
        : streamMultipleParagraphs(paragraphs, (paragraph) =>
            translator.translateStreaming(paragraph, { signal })
          );
    let hasContent = false;
    for await (const chunk of stream) {
      hasContent ||= Boolean(chunk.trim());
      yield chunk;
    }
    signal?.throwIfAborted();
    if (hasContent) {
      reportLocalTranslation();
    }
  }

  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    signal?: AbortSignal
  ): Promise<string> {
    const translator = await this.getTranslator(sourceLanguage, targetLanguage);
    signal?.throwIfAborted();
    const result = await translator.translate(text, { signal });
    signal?.throwIfAborted();
    if (result.trim()) {
      reportLocalTranslation();
    }
    return result;
  }

  destroy(): void {
    for (const [key, session] of this.sessions) {
      this.destroySession(key, session);
    }
  }

  private pairKey(sourceLanguage: string, targetLanguage: string): string {
    return `${sourceLanguage}\u0000${targetLanguage}`;
  }

  private getSession(key: string): TranslatorSession {
    let session = this.sessions.get(key);
    if (!session) {
      session = {
        translator: null,
        creation: null,
        controller: null,
        owners: 0,
      };
      this.sessions.set(key, session);
    }
    return session;
  }

  private destroySession(key: string, session: TranslatorSession): void {
    if (this.sessions.get(key) !== session) {
      return;
    }
    this.sessions.delete(key);
    session.controller?.abort();
    session.controller = null;
    session.creation = null;
    if (session.translator) {
      try {
        session.translator.destroy();
      } catch (error) {
        log.error("Failed to destroy translator instance:", error);
      } finally {
        session.translator = null;
      }
    }
  }
}

// Singleton instance
export const translatorManager = new TranslatorManager();

// Language pair availability info
export interface LanguagePairStatus {
  sourceLanguage: string;
  targetLanguage: string;
  status: TranslationAvailabilityStatus;
}

// Check availability for all source languages to a specific target
export async function checkAllPairsToTarget(
  targetLanguage: string,
  sourceLanguages: string[]
): Promise<LanguagePairStatus[]> {
  const filteredLanguages = filterSourceLanguages(
    sourceLanguages,
    targetLanguage
  );
  const results = await Promise.all(
    filteredLanguages.map(async (sourceLanguage) => {
      const status = await translatorManager.checkAvailability(
        sourceLanguage,
        targetLanguage
      );
      return { sourceLanguage, targetLanguage, status };
    })
  );
  return results;
}
