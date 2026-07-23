interface TermTranslationCacheKey {
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

const DEFAULT_MAX_ENTRIES = 200;

function serializeKey(key: TermTranslationCacheKey): string {
  return JSON.stringify([
    key.sourceLanguage,
    key.targetLanguage,
    key.sourceText,
  ]);
}

export class TermTranslationCache {
  readonly #entries = new Map<string, string>();
  readonly #maxEntries: number;

  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this.#maxEntries = Math.max(1, maxEntries);
  }

  get(key: TermTranslationCacheKey): string | null {
    const serializedKey = serializeKey(key);
    const value = this.#entries.get(serializedKey);
    if (value === undefined) {
      return null;
    }

    this.#entries.delete(serializedKey);
    this.#entries.set(serializedKey, value);
    return value;
  }

  set(key: TermTranslationCacheKey, value: string): void {
    const serializedKey = serializeKey(key);
    this.#entries.delete(serializedKey);
    this.#entries.set(serializedKey, value);

    while (this.#entries.size > this.#maxEntries) {
      const oldestKey = this.#entries.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.#entries.delete(oldestKey);
    }
  }
}
