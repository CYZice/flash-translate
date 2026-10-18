import { useEffect, useState } from "react";
import { getUsage, USAGE_STORAGE_KEY } from "@/shared/storage/usage";
import {
  normalizeUsage,
  type TranslationUsage,
} from "@/shared/translation/usage";
import { getUsageRows } from "@/shared/translation/usage-presentation";
import { getPopupSettingsCopy } from "../utils/settings-copy";

export function UsageStatistics() {
  const copy = getPopupSettingsCopy();
  const [usage, setUsage] = useState<TranslationUsage | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let updated = false;
    getUsage().then(
      (value) => {
        if (active && !updated) {
          setUsage(value);
        }
      },
      () => {
        if (active && !updated) {
          setError(true);
        }
      }
    );
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ): void => {
      if (area === "local" && changes[USAGE_STORAGE_KEY]) {
        updated = true;
        setUsage(normalizeUsage(changes[USAGE_STORAGE_KEY].newValue));
        setError(false);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);
  if (error) {
    return <p className="px-4 py-3 text-gray-500 text-xs">{copy.usageError}</p>;
  }
  return (
    <details className="px-4 py-3">
      <summary className="cursor-pointer text-gray-700 text-xs">
        {copy.usage}
        {usage && (
          <span className="ml-3 text-gray-500">
            {copy.completedTranslations}{" "}
            {usage.completedTranslations.toLocaleString()}
          </span>
        )}
      </summary>
      <p className="mt-2 text-gray-500 text-xs">{copy.usageDescription}</p>
      <dl className="m-0 space-y-1 text-xs">
        {usage &&
          getUsageRows(usage, copy).map(({ label, value }) => (
            <div className="flex justify-between gap-3" key={label}>
              <dt className="text-gray-500">{label}</dt>
              <dd className="m-0 text-gray-800 tabular-nums">{value}</dd>
            </div>
          ))}
      </dl>
    </details>
  );
}
