import { getUsage, USAGE_STORAGE_KEY } from "@/shared/storage/usage";
import { applyUsageEvent, type UsageEvent } from "@/shared/translation/usage";

let pending: Promise<void> = Promise.resolve();

/** Service-worker ownership serializes updates from all tabs and AI requests. */
export function recordUsage(event: UsageEvent): Promise<void> {
  const work = pending
    .catch(() => undefined)
    .then(async () => {
      const current = await getUsage();
      await chrome.storage.local.set({
        [USAGE_STORAGE_KEY]: applyUsageEvent(current, event),
      });
    });
  pending = work;
  return work;
}
