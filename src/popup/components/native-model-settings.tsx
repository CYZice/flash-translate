import { useEffect, useState } from "react";
import { SUPPORTED_LANGUAGES } from "@/shared/constants/languages";
import {
  checkAllPairsToTarget,
  type LanguagePairStatus,
} from "@/shared/utils/translator";
import { getPopupSettingsCopy } from "../utils/settings-copy";
import { SourceLanguageChips } from "./source-language-chips";
import { TargetLanguageChips } from "./target-language-chips";

function ModelLanguages() {
  const [target, setTarget] = useState("en");
  const [source, setSource] = useState("zh");
  const [pairs, setPairs] = useState<LanguagePairStatus[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    checkAllPairsToTarget(
      target,
      SUPPORTED_LANGUAGES.map((language) => language.code)
    ).then((result) => {
      if (active) {
        setPairs(result);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [target]);
  return (
    <>
      <TargetLanguageChips
        targetLanguage={target}
        onChangeTargetLanguage={setTarget}
      />
      <SourceLanguageChips
        targetLanguage={target}
        sourceLanguage={source}
        pairs={pairs}
        isLoading={loading}
        onPairsChange={setPairs}
        onSourceLanguageChange={setSource}
      />
    </>
  );
}

export function NativeModelSettings() {
  const copy = getPopupSettingsCopy();
  const [open, setOpen] = useState(false);
  return (
    <details
      className="py-3"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-gray-600 text-xs">
        {copy.nativeModels}
      </summary>
      {open && <ModelLanguages />}
    </details>
  );
}
