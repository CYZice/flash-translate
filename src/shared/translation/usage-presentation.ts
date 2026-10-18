import type { getTranslationSettingsCopy } from "./settings-copy";
import type { TranslationUsage } from "./usage";

export function getUsageRows(
  usage: TranslationUsage,
  copy: ReturnType<typeof getTranslationSettingsCopy>
): { label: string; value: string }[] {
  const token = (value: number): string =>
    usage.aiRequests > 0 && usage.reportedRequests === 0
      ? "—"
      : value.toLocaleString();
  return [
    {
      label: copy.completedTranslations,
      value: usage.completedTranslations.toLocaleString(),
    },
    { label: copy.aiRequests, value: usage.aiRequests.toLocaleString() },
    { label: copy.inputTokens, value: token(usage.inputTokens) },
    { label: copy.outputTokens, value: token(usage.outputTokens) },
    { label: copy.totalTokens, value: token(usage.totalTokens) },
    {
      label: copy.missingUsage,
      value: (usage.aiRequests - usage.reportedRequests).toLocaleString(),
    },
  ];
}
