import type { TermInsightResult } from "./term-insight";

interface TermInsightCacheKey {
  sourceText: string;
  quickTranslation: string;
  sourceLanguage: string;
  targetLanguage: string;
  contextText: string;
  contextTermOffset: number;
}

const DEFAULT_MAX_ENTRIES = 100;
const TERM_INSIGHT_SCHEMA_VERSION = 1;

function serializeKey(key: TermInsightCacheKey): string {
  return JSON.stringify([
    TERM_INSIGHT_SCHEMA_VERSION,
    key.sourceLanguage,
    key.targetLanguage,
    key.sourceText,
    key.quickTranslation,
    key.contextText,
    key.contextTermOffset,
  ]);
}

export class TermInsightCache {
  readonly #entries = new Map<string, TermInsightResult>();
  readonly #maxEntries: number;

  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this.#maxEntries = Math.max(1, maxEntries);
  }

  get(key: TermInsightCacheKey): TermInsightResult | null {
    const serializedKey = serializeKey(key);
    const value = this.#entries.get(serializedKey);
    if (!value) {
      return null;
    }

    this.#entries.delete(serializedKey);
    this.#entries.set(serializedKey, value);
    return value;
  }

  set(key: TermInsightCacheKey, value: TermInsightResult): void {
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
