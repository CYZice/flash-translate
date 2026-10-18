import { getTranslationSettingsCopy } from "@/shared/translation/settings-copy";

export function getPopupSettingsCopy() {
  return getTranslationSettingsCopy(chrome.i18n.getUILanguage());
}
