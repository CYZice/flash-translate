import { useState } from "react";
import { useSettings } from "@/shared/hooks/use-settings";
import {
  DEFAULT_TRANSLATION_FONT_SIZE,
  MAX_TRANSLATION_FONT_SIZE,
  MIN_TRANSLATION_FONT_SIZE,
  saveSettings,
} from "@/shared/storage/settings";
import { selectDisplaySettings } from "@/shared/storage/settings-selectors";

export function DisplaySettings() {
  const [settings, isLoading] = useSettings(selectDisplaySettings);
  const [draftSize, setDraftSize] = useState<number | null>(null);
  const fontSize =
    draftSize ?? settings?.translationFontSize ?? DEFAULT_TRANSLATION_FONT_SIZE;

  return (
    <div className="px-4 py-3">
      <h2 className="m-0 font-semibold text-gray-900 text-xs">显示设置</h2>
      <div className="mt-3 flex items-center justify-between">
        <label
          className="text-gray-700 text-sm"
          htmlFor="translation-font-size"
        >
          翻译正文大小
        </label>
        <output
          className="text-gray-600 text-xs tabular-nums"
          htmlFor="translation-font-size"
        >
          {fontSize} px
        </output>
      </div>
      <div className="mt-1 flex h-8 items-center gap-3">
        <span aria-hidden="true" className="text-gray-400 text-xs">
          A
        </span>
        <input
          aria-valuetext={`${fontSize} 像素`}
          className="translation-font-slider min-w-0 flex-1"
          disabled={isLoading}
          id="translation-font-size"
          max={MAX_TRANSLATION_FONT_SIZE}
          min={MIN_TRANSLATION_FONT_SIZE}
          step={1}
          style={{
            background: `linear-gradient(to right, #2563eb ${((fontSize - MIN_TRANSLATION_FONT_SIZE) / (MAX_TRANSLATION_FONT_SIZE - MIN_TRANSLATION_FONT_SIZE)) * 100}%, #e5e7eb 0)`,
          }}
          type="range"
          value={fontSize}
          onBlur={(event) => {
            saveSettings({
              translationFontSize: Number(event.currentTarget.value),
            });
          }}
          onChange={(event) => {
            const size = Number(event.target.value);
            setDraftSize(size);
          }}
          onKeyUp={(event) => {
            saveSettings({
              translationFontSize: Number(event.currentTarget.value),
            });
          }}
          onPointerUp={(event) => {
            saveSettings({
              translationFontSize: Number(event.currentTarget.value),
            });
          }}
        />
        <span aria-hidden="true" className="text-gray-400 text-lg">
          A
        </span>
      </div>
    </div>
  );
}
