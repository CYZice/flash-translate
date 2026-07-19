// Using official @types/dom-chromium-ai types

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
  isSameLanguagePair,
  mapAvailabilityStatus,
  splitTextIntoParagraphs,
} from "./translator-utils";

interface CachedTranslator {
  translator: Translator;
  sourceLanguage: string;
  targetLanguage: string;
}

// Our internal availability status (maps from Availability type)
export type TranslationAvailabilityStatus =
  | "available"
  | "after-download"
  | "unavailable"
  | "unsupported";

class TranslatorManager {
  private instance: CachedTranslator | null = null;
  private isCreating = false;
  private pendingRequests: Array<{
    resolve: (translator: Translator) => void;
    reject: (error: Error) => void;
  }> = [];

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

  async getTranslator(
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<Translator> {
    // Reuse existing instance if same language pair
    if (
      this.instance &&
      isSameLanguagePair(this.instance, sourceLanguage, targetLanguage)
    ) {
      return this.instance.translator;
    }

    // Destroy existing instance if different language pair
    if (this.instance) {
      try {
        this.instance.translator.destroy();
      } catch (error) {
        log.error("Failed to destroy translator instance:", error);
      } finally {
        // Ensure instance reference is cleared even if destroy() throws
        this.instance = null;
      }
    }

    // Queue request if already creating
    if (this.isCreating) {
      return new Promise((resolve, reject) => {
        this.pendingRequests.push({ resolve, reject });
      });
    }

    this.isCreating = true;

    try {
      if (typeof Translator === "undefined") {
        throw createNotAvailableError();
      }

      // Check availability
      const availability = await this.checkAvailability(
        sourceLanguage,
        targetLanguage
      );

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

      this.instance = {
        translator,
        sourceLanguage,
        targetLanguage,
      };

      // Resolve pending requests
      for (const { resolve } of this.pendingRequests) {
        resolve(translator);
      }
      this.pendingRequests = [];

      return translator;
    } catch (error) {
      // Reject pending requests with properly typed error
      const normalizedError =
        error instanceof Error ? error : new Error(String(error));
      for (const { reject } of this.pendingRequests) {
        reject(normalizedError);
      }
      this.pendingRequests = [];
      throw normalizedError;
    } finally {
      this.isCreating = false;
    }
  }

  async *translateStreaming(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): AsyncGenerator<string> {
    const translator = await this.getTranslator(sourceLanguage, targetLanguage);
    const paragraphs = splitTextIntoParagraphs(text);

    if (paragraphs.length === 1) {
      // Single paragraph - stream normally
      yield* readStreamAccumulated(translator.translateStreaming(text));
    } else {
      // Multiple paragraphs - translate each and join with line breaks
      yield* streamMultipleParagraphs(paragraphs, (paragraph) =>
        translator.translateStreaming(paragraph)
      );
    }
  }

  destroy(): void {
    if (this.instance) {
      try {
        this.instance.translator.destroy();
      } catch (error) {
        log.error("Failed to destroy translator instance:", error);
      } finally {
        this.instance = null;
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
