import { useEffect, useState } from "react";
import {
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  SUPPORTED_LANGUAGES,
} from "@/shared/constants/languages";
import { useSettings } from "@/shared/hooks/use-settings";
import { saveSettings } from "@/shared/storage/settings";
import { selectLanguageSettings } from "@/shared/storage/settings-selectors";
import { getMessage } from "@/shared/utils/i18n";
import {
  checkAllPairsToTarget,
  type LanguagePairStatus,
} from "@/shared/utils/translator";
import { SourceLanguageChips } from "./source-language-chips";
import { TargetLanguageChips } from "./target-language-chips";

export function LanguageSettings() {
  const [initialSettings, isLoading] = useSettings(selectLanguageSettings, {
    subscribe: false,
  });

  const [sourceLanguage, setSourceLanguage] = useState<string>(
    DEFAULT_SOURCE_LANGUAGE
  );
  const [targetLanguage, setTargetLanguage] = useState<string>(
    DEFAULT_TARGET_LANGUAGE
  );
  const [pairs, setPairs] = useState<LanguagePairStatus[]>([]);
  const [isLoadingPairs, setIsLoadingPairs] = useState(false);

  // Apply initial settings when loaded
  useEffect(() => {
    if (initialSettings) {
      setSourceLanguage(initialSettings.sourceLanguage);
      setTargetLanguage(initialSettings.targetLanguage);
    }
  }, [initialSettings]);

  // Load pairs when target language changes
  useEffect(() => {
    const loadPairs = async () => {
      setIsLoadingPairs(true);
      const sourceCodes = SUPPORTED_LANGUAGES.map((l) => l.code);
      const statuses = await checkAllPairsToTarget(targetLanguage, sourceCodes);
      setPairs(statuses);
      setIsLoadingPairs(false);
    };
    loadPairs();
  }, [targetLanguage]);

  const handleSourceLanguageChange = async (code: string) => {
    setSourceLanguage(code);
    await saveSettings({ sourceLanguage: code });
  };

  const handleTargetLanguageChange = async (code: string) => {
    setTargetLanguage(code);
    await saveSettings({ targetLanguage: code });
  };

  if (isLoading) {
    return null;
  }

  return (
    <div>
      <div className="px-4 pt-3 pb-1">
        <h2 className="m-0 font-semibold text-gray-900 text-xs">
          {getMessage("popup_section_languages")}
        </h2>
      </div>
      <TargetLanguageChips
        onChangeTargetLanguage={handleTargetLanguageChange}
        targetLanguage={targetLanguage}
      />
      <SourceLanguageChips
        isLoading={isLoadingPairs}
        onPairsChange={setPairs}
        onSourceLanguageChange={handleSourceLanguageChange}
        pairs={pairs}
        sourceLanguage={sourceLanguage}
        targetLanguage={targetLanguage}
      />
    </div>
  );
}
