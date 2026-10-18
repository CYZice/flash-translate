export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface TranslationUsage extends TokenUsage {
  completedTranslations: number;
  aiRequests: number;
  reportedRequests: number;
}

export type UsageEvent =
  | { type: "completed" }
  | { type: "ai-started" }
  | { type: "ai-finished"; usage: TokenUsage | null; completed?: boolean };

export const EMPTY_USAGE: TranslationUsage = {
  completedTranslations: 0,
  aiRequests: 0,
  reportedRequests: 0,
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
};

/** One HTTP attempt; usage chunks are cumulative snapshots, not token deltas. */
export class AiUsageTracker {
  private active = false;
  private usage: TokenUsage | null = null;
  private readonly record: (event: UsageEvent) => void | Promise<void>;

  constructor(record: (event: UsageEvent) => void | Promise<void>) {
    this.record = record;
  }

  readonly onRequest = (): void => {
    this.active = true;
    this.record({ type: "ai-started" });
  };

  readonly onUsage = (usage: TokenUsage): void => {
    if (this.active) {
      this.usage = usage;
    }
  };

  finish(completed = false): void | Promise<void> {
    if (!this.active) {
      return;
    }
    this.active = false;
    const usage = this.usage;
    this.usage = null;
    return this.record({ type: "ai-finished", usage, completed });
  }
}

function isCounter(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** Provider-reported Chat Completions usage only; never estimate missing tokens. */
export function readTokenUsage(body: unknown): TokenUsage | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const usage = (body as Record<string, unknown>).usage;
  if (typeof usage !== "object" || usage === null) {
    return null;
  }
  const data = usage as Record<string, unknown>;
  if (
    !(
      isCounter(data.prompt_tokens) &&
      isCounter(data.completion_tokens) &&
      isCounter(data.total_tokens)
    )
  ) {
    return null;
  }
  return {
    inputTokens: data.prompt_tokens,
    outputTokens: data.completion_tokens,
    totalTokens: data.total_tokens,
  };
}

export function normalizeUsage(value: unknown): TranslationUsage {
  const result = { ...EMPTY_USAGE };
  if (typeof value !== "object" || value === null) {
    return result;
  }
  const data = value as Record<string, unknown>;
  for (const key of Object.keys(result) as (keyof TranslationUsage)[]) {
    if (isCounter(data[key])) {
      result[key] = data[key];
    }
  }
  result.reportedRequests = Math.min(
    result.reportedRequests,
    result.aiRequests
  );
  return result;
}

export function applyUsageEvent(
  current: TranslationUsage,
  event: UsageEvent
): TranslationUsage {
  const next = { ...current };
  if (event.type === "completed") {
    next.completedTranslations += 1;
  } else if (event.type === "ai-started") {
    next.aiRequests += 1;
  } else {
    if (event.completed) {
      next.completedTranslations += 1;
    }
    if (event.usage) {
      next.reportedRequests += 1;
      next.inputTokens += event.usage.inputTokens;
      next.outputTokens += event.usage.outputTokens;
      next.totalTokens += event.usage.totalTokens;
    }
  }
  return next;
}
