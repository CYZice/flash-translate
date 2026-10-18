// Language Detector Manager - Singleton wrapper for Chrome Language Detector API
// Follows the same pattern as TranslatorManager

import {
  createDetectorUnavailableError,
  createDetectorUnsupportedError,
  type LanguageDetectionAvailability,
  mapDetectorAvailability,
  type NormalizedLanguageDetectionResult,
  normalizeDetectedLanguage,
  selectBestLanguage,
} from "./language-detector-utils";
import { createPrefixedLogger } from "./logger";

const log = createPrefixedLogger("language-detector");

class LanguageDetectorManager {
  private instance: LanguageDetector | null = null;
  private owners = 0;
  private generation = 0;
  private creationController: AbortController | null = null;
  private isCreating = false;
  private pendingRequests: Array<{
    resolve: (detector: LanguageDetector) => void;
    reject: (error: Error) => void;
  }> = [];

  retain(): () => void {
    this.owners += 1;
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      this.owners -= 1;
      if (this.owners === 0) {
        this.destroy();
      }
    };
  }

  /**
   * Check if the Language Detector API is available
   */
  async checkAvailability(): Promise<LanguageDetectionAvailability> {
    if (typeof LanguageDetector === "undefined") {
      return "unsupported";
    }

    try {
      const result = await LanguageDetector.availability();
      return mapDetectorAvailability(result);
    } catch (error) {
      log.error("Failed to check language detector availability:", error);
      return "unsupported";
    }
  }

  /**
   * Get or create a LanguageDetector instance
   * Implements lazy initialization with request coalescing
   */
  async getDetector(): Promise<LanguageDetector> {
    // Return cached instance if available
    if (this.instance) {
      return this.instance;
    }

    // Queue request if already creating
    if (this.isCreating) {
      return new Promise((resolve, reject) => {
        this.pendingRequests.push({ resolve, reject });
      });
    }

    this.isCreating = true;
    const generation = this.generation;
    const controller = new AbortController();
    this.creationController = controller;

    try {
      if (typeof LanguageDetector === "undefined") {
        throw createDetectorUnsupportedError();
      }

      // Check availability
      const availability = await this.checkAvailability();
      controller.signal.throwIfAborted();

      if (availability === "unsupported") {
        throw createDetectorUnsupportedError();
      }

      if (availability === "unavailable") {
        throw createDetectorUnavailableError();
      }

      // Create detector instance with download progress monitoring
      const detector = await LanguageDetector.create({
        signal: controller.signal,
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

      if (generation !== this.generation) {
        detector.destroy();
        throw new DOMException("Translation closed", "AbortError");
      }

      this.instance = detector;

      // Resolve pending requests
      for (const { resolve } of this.pendingRequests) {
        resolve(detector);
      }
      this.pendingRequests = [];

      return detector;
    } catch (error) {
      // Reject pending requests with properly typed error
      const normalizedError =
        error instanceof Error ? error : new Error(String(error));
      if (generation === this.generation) {
        for (const { reject } of this.pendingRequests) {
          reject(normalizedError);
        }
        this.pendingRequests = [];
      }
      throw normalizedError;
    } finally {
      if (generation === this.generation) {
        this.isCreating = false;
        this.creationController = null;
      }
    }
  }

  /**
   * Detect the language of the given text
   * Returns the best match with confidence score
   */
  async detect(
    text: string,
    signal?: AbortSignal
  ): Promise<NormalizedLanguageDetectionResult> {
    try {
      const detector = await this.getDetector();
      signal?.throwIfAborted();
      const results = await detector.detect(text, { signal });
      signal?.throwIfAborted();
      const best = selectBestLanguage(results);

      // Normalize to supported language code
      const normalizedLanguage = best.detectedLanguage
        ? normalizeDetectedLanguage(best.detectedLanguage)
        : null;

      return {
        detectedLanguage: normalizedLanguage,
        confidence: best.confidence,
      };
    } catch {
      // Return null result on error, let caller handle fallback
      return {
        detectedLanguage: null,
        confidence: 0,
      };
    }
  }

  /**
   * Destroy the cached detector instance and release resources
   */
  destroy(): void {
    this.generation += 1;
    this.creationController?.abort();
    this.creationController = null;
    this.isCreating = false;
    for (const { reject } of this.pendingRequests) {
      reject(new DOMException("Translation closed", "AbortError"));
    }
    this.pendingRequests = [];
    if (this.instance) {
      try {
        this.instance.destroy();
      } catch (error) {
        log.error("Failed to destroy language detector instance:", error);
      } finally {
        this.instance = null;
      }
    }
  }
}

// Singleton instance
export const languageDetectorManager = new LanguageDetectorManager();

// Re-export types for convenience
export type {
  LanguageDetectionAvailability,
  NormalizedLanguageDetectionResult,
} from "./language-detector-utils";
