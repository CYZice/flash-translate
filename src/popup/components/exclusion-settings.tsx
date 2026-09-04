import { Plus } from "lucide-react";
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
    <div className="px-4 py-3">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="m-0 font-semibold text-gray-900 text-xs">
          {getMessage("popup_exclusion_title")}
        </h2>
      </div>

      {/* Add current site button */}
      {currentTabUrl && (
        <button
          className={cn(
            "mb-2 flex min-h-9 w-full items-center gap-2 rounded border border-dashed px-2.5 py-2 text-left text-sm transition-colors",
            isCurrentSiteExcluded
              ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
              : "border-blue-300 text-blue-600 hover:border-blue-400 hover:bg-blue-50"
          )}
          disabled={isCurrentSiteExcluded}
          onClick={handleAddCurrentSite}
          type="button"
        >
          <Plus aria-hidden="true" size={15} />
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
        <div className="divide-y divide-gray-100 border-gray-100 border-t">
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
