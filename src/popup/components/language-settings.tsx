import { useEffect, useState } from "react";
import { ToggleSwitch } from "@/shared/components/toggle-switch";
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
  const [autoZhEn, setAutoZhEn] = useState(false);
  const [isLoadingPairs, setIsLoadingPairs] = useState(false);

  // Apply initial settings when loaded
  useEffect(() => {
    if (initialSettings) {
      setSourceLanguage(initialSettings.sourceLanguage);
      setTargetLanguage(initialSettings.targetLanguage);
      setAutoZhEn(initialSettings.autoZhEn);
    }
  }, [initialSettings]);

  // Load pairs when target language changes
  useEffect(() => {
    if (autoZhEn) {
      setPairs([]);
      setIsLoadingPairs(false);
      return;
    }
    const loadPairs = async () => {
      setIsLoadingPairs(true);
      const sourceCodes = SUPPORTED_LANGUAGES.map((l) => l.code);
      const statuses = await checkAllPairsToTarget(targetLanguage, sourceCodes);
      setPairs(statuses);
      setIsLoadingPairs(false);
    };
    loadPairs();
  }, [targetLanguage, autoZhEn]);

  const handleSourceLanguageChange = async (code: string) => {
    setSourceLanguage(code);
    setAutoZhEn(false);
    await saveSettings({ sourceLanguage: code, autoZhEn: false });
  };

  const handleTargetLanguageChange = async (code: string) => {
    setTargetLanguage(code);
    setAutoZhEn(false);
    await saveSettings({ targetLanguage: code, autoZhEn: false });
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
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <label className="text-gray-700 text-sm" htmlFor="auto-zh-en">
            自动中英互译
          </label>
          <p className="m-0 mt-1 text-gray-500 text-xs">
            含中文译英文，英文译中文。无需语言检测模型。
          </p>
        </div>
        <ToggleSwitch
          id="auto-zh-en"
          ariaLabel="自动中英互译"
          checked={autoZhEn}
          onChange={() => {
            const enabled = !autoZhEn;
            setAutoZhEn(enabled);
            saveSettings({ autoZhEn: enabled });
          }}
        />
      </div>
      {autoZhEn ? (
        <div className="px-4 pb-3 text-blue-700 text-xs">
          EN ⇄ 中文 · 关闭后可手动指定语言
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
