import {
  AiUsageTracker,
  readTokenUsage,
  type UsageEvent,
} from "../../src/shared/translation/usage";
import type {
  TranslationHttpClient,
  TranslationHttpRequest,
} from "./translation-service";

interface JsonResponse {
  status: number;
  readonly json: unknown;
}

/** Run inside the native transport slot, so cancelled UI tasks still report usage. */
export class UsageTransport {
  private readonly http: (
    input: TranslationHttpRequest
  ) => Promise<JsonResponse>;
  private record: ((event: UsageEvent) => void) | null;

  constructor(
    http: (input: TranslationHttpRequest) => Promise<JsonResponse>,
    record: (event: UsageEvent) => void
  ) {
    this.http = http;
    this.record = record;
  }

  private readonly emit = (event: UsageEvent): void => {
    this.record?.(event);
  };

  dispose(): void {
    this.record = null;
  }

  readonly request: TranslationHttpClient = async (input) => {
    const tracker = new AiUsageTracker(this.emit);
    tracker.onRequest();
    try {
      const response = await this.http(input);
      if (!this.record) {
        return { status: response.status, body: null };
      }
      let body: unknown = null;
      if (response.status >= 200 && response.status < 300) {
        try {
          body = response.json;
        } catch (cause) {
          throw new Error("The translation endpoint returned invalid JSON.", {
            cause,
          });
        }
      }
      const usage = readTokenUsage(body);
      if (usage) {
        tracker.onUsage(usage);
      }
      return { status: response.status, body };
    } finally {
      tracker.finish();
    }
  };
}
