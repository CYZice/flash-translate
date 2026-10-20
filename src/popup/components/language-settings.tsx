import { ToggleSwitch } from "@/shared/components/toggle-switch";
import { SUPPORTED_LANGUAGES } from "@/shared/constants/languages";
import { useSettings } from "@/shared/hooks/use-settings";
import { saveSettings } from "@/shared/storage/settings";
import { selectLanguageSettings } from "@/shared/storage/settings-selectors";
import { getPopupSettingsCopy } from "../utils/settings-copy";

export function LanguageSettings() {
  const copy = getPopupSettingsCopy();
  const [settings] = useSettings(selectLanguageSettings);
  if (!settings) {
    return null;
  }
  return (
    <div className="px-4 py-3">
      <h2 className="m-0 font-semibold text-gray-900 text-xs">
        {copy.languages}
      </h2>
      <div className="flex items-center justify-between gap-3 py-3">
        <div>
          <label className="text-gray-700 text-sm" htmlFor="auto-zh-en">
            {copy.autoZhEn}
          </label>
          <p className="m-0 mt-1 text-gray-500 text-xs">
            {copy.autoZhEnDescription}
          </p>
        </div>
        <ToggleSwitch
          id="auto-zh-en"
          ariaLabel={copy.autoZhEn}
          checked={settings.autoZhEn}
          onChange={() => {
            saveSettings({ autoZhEn: !settings.autoZhEn });
          }}
        />
      </div>
      {!settings.autoZhEn && (
        <div className="grid grid-cols-2 gap-3">
          {(["sourceLanguage", "targetLanguage"] as const).map((field) => (
            <label
              className="text-gray-600 text-xs"
              key={field}
              htmlFor={field}
            >
              {field === "sourceLanguage" ? copy.source : copy.target}
              <select
                className="mt-1.5 h-9 w-full rounded border border-gray-200 bg-white px-2 text-gray-800 text-sm"
                id={field}
                value={settings[field]}
                onChange={(event) => {
                  saveSettings({ [field]: event.target.value });
                }}
              >
                {SUPPORTED_LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.nativeName}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
