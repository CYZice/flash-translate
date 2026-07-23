import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  type ExclusionPattern,
  enableExclusionPattern,
  generatePatternId,
  getSettings,
  saveSettings,
} from "@/shared/storage/settings";
import { getMessage } from "@/shared/utils/i18n";
import { useCurrentTabUrl } from "../hooks/use-current-tab-url";
import { ExclusionPatternItem } from "./exclusion-pattern-item";

export function ExclusionSettings() {
  const currentTabUrl = useCurrentTabUrl();
  const [patterns, setPatterns] = useState<ExclusionPattern[]>([]);

  // Load patterns from storage on mount
  useEffect(() => {
    const loadPatterns = async () => {
      const settings = await getSettings();
      setPatterns(settings.exclusionPatterns || []);
    };
    loadPatterns();
  }, []);

  const savePatterns = async (newPatterns: ExclusionPattern[]) => {
    setPatterns(newPatterns);
    await saveSettings({ exclusionPatterns: newPatterns });
  };

  const isCurrentSiteExcluded = currentTabUrl
    ? patterns.some((p) => p.pattern === currentTabUrl && p.enabled)
    : false;

  const handleAddCurrentSite = () => {
    if (!currentTabUrl || isCurrentSiteExcluded) {
      return;
    }

    savePatterns(
      enableExclusionPattern(patterns, currentTabUrl, generatePatternId())
    );
  };

  const handlePatternChange = (updated: ExclusionPattern) => {
    savePatterns(patterns.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDelete = (id: string) => {
    savePatterns(patterns.filter((p) => p.id !== id));
  };

  const formatUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "");
    } catch {
      return url;
    }
  };

  return (
    <div className="px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-gray-700 text-sm">
          {getMessage("popup_exclusion_title")}
        </span>
      </div>

      {/* Add current site button */}
      {currentTabUrl && (
        <button
          className={cn(
            "mb-2 flex w-full items-center gap-2 rounded border border-dashed px-3 py-2 text-left text-sm",
            isCurrentSiteExcluded
              ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
              : "border-blue-300 text-blue-600 hover:border-blue-400 hover:bg-blue-50"
          )}
          disabled={isCurrentSiteExcluded}
          onClick={handleAddCurrentSite}
          type="button"
        >
          <span className="text-lg leading-none">+</span>
          <span className="flex-1 truncate">{formatUrl(currentTabUrl)}</span>
          {isCurrentSiteExcluded && (
            <span className="shrink-0 text-gray-400 text-xs">
              {getMessage("popup_exclusion_excluded")}
            </span>
          )}
        </button>
      )}

      {/* Existing patterns */}
      {patterns.length === 0 ? (
        <p className="py-2 text-left text-gray-400 text-xs">
          {getMessage("popup_exclusion_noSites")}
        </p>
      ) : (
        <div className="space-y-1.5">
          {patterns.map((pattern) => (
            <ExclusionPatternItem
              key={pattern.id}
              onDelete={() => handleDelete(pattern.id)}
              onPatternChange={handlePatternChange}
              pattern={pattern}
            />
          ))}
        </div>
      )}
    </div>
  );
}
