// Pure translation execution functions
// Extracted from useTranslator hook for testability and reduced complexity

/**
 * Options for translation execution
 */
export interface TranslationExecutionOptions {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  signal: AbortSignal;
}

/**
 * Result of translation execution
 */
export type TranslationExecutionResult =
  | { type: "success"; result: string }
  | { type: "aborted" }
  | { type: "error"; error: Error };

/**
 * Callbacks for streaming translation progress
 */
export interface StreamingCallbacks {
  onChunk: (result: string) => void;
}

/**
 * Interface for translation functions (dependency injection)
 */
export interface TranslationFunctions {
  translateStreaming: (
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    signal?: AbortSignal
  ) => AsyncIterable<string>;
}

/**
 * Execute streaming translation with abort support
 * Returns cumulative result through onChunk callback
 */
export async function executeStreamingTranslation(
  options: TranslationExecutionOptions,
  translator: TranslationFunctions,
  callbacks: StreamingCallbacks
): Promise<TranslationExecutionResult> {
  const { text, sourceLanguage, targetLanguage, signal } = options;

  try {
    let result = "";
    for await (const chunk of translator.translateStreaming(
      text,
      sourceLanguage,
      targetLanguage,
      signal
    )) {
      if (signal.aborted) {
        return { type: "aborted" };
      }
      result = chunk;
      callbacks.onChunk(result);
    }
    return { type: "success", result };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { type: "aborted" };
    }
    return {
      type: "error",
      error:
        error instanceof Error
          ? error
          : new Error(`Unknown error: ${String(error)}`),
    };
  }
}
