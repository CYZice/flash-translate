import type {
  TranslationHttpClient,
  TranslationHttpRequest,
  TranslationHttpResponse,
} from "./translation-service";

type Outcome =
  | { ok: true; response: TranslationHttpResponse }
  | { ok: false; error: unknown };

interface RequestJob {
  input: TranslationHttpRequest | null;
  signal?: AbortSignal;
  onAbort: (() => void) | null;
  complete: ((outcome: Outcome) => void) | null;
}

function cancelled(): DOMException {
  return new DOMException("Translation cancelled", "AbortError");
}

/** Holds the transport slot until requestUrl actually settles, even after UI cancellation. */
export class TranslationRequestQueue {
  private readonly http: TranslationHttpClient;
  private active: RequestJob | null = null;
  private pending: RequestJob | null = null;
  private disposed = false;

  constructor(http: TranslationHttpClient) {
    this.http = http;
  }

  readonly request: TranslationHttpClient = (input, signal) => {
    if (this.disposed || signal?.aborted) {
      return Promise.reject(cancelled());
    }
    return new Promise((resolve, reject) => {
      const job: RequestJob = {
        input,
        signal,
        onAbort: null,
        complete: (outcome) => {
          if (outcome.ok) {
            resolve(outcome.response);
          } else {
            reject(outcome.error);
          }
        },
      };
      job.onAbort = () => this.cancel(job);
      signal?.addEventListener("abort", job.onAbort, { once: true });
      if (this.pending) {
        this.cancel(this.pending);
      }
      if (this.active) {
        this.pending = job;
      } else {
        this.start(job);
      }
    });
  };

  dispose(): void {
    this.disposed = true;
    if (this.pending) {
      this.cancel(this.pending);
    }
    if (this.active) {
      this.cancel(this.active);
    }
  }

  private cancel(job: RequestJob): void {
    if (this.pending === job) {
      this.pending = null;
    }
    this.complete(job, { ok: false, error: cancelled() });
  }

  private complete(job: RequestJob, outcome: Outcome): void {
    const complete = job.complete;
    job.complete = null;
    job.input = null;
    if (job.onAbort) {
      job.signal?.removeEventListener("abort", job.onAbort);
    }
    job.onAbort = null;
    job.signal = undefined;
    complete?.(outcome);
  }

  private async start(job: RequestJob): Promise<void> {
    this.active = job;
    const input = job.input;
    job.input = null;
    try {
      if (input && job.complete) {
        const response = await this.http(input);
        this.complete(job, { ok: true, response });
      }
    } catch (error) {
      this.complete(job, { ok: false, error });
    } finally {
      this.active = null;
      const next = this.pending;
      this.pending = null;
      if (next) {
        this.start(next);
      }
    }
  }
}
