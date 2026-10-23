"use strict";
// Match src/shared/translation/bilingual.ts, including mixed technical text.
const CHINESE_TEXT = /\p{Script=Han}/u;

function resolveTranslationConfig(text, config) {
  if (!config.autoZhEn) {
    return config;
  }
  const chinese = CHINESE_TEXT.test(text);
  return {
    ...config,
    sourceLanguage: chinese ? "Chinese" : "English",
    targetLanguage: chinese ? "English" : "Chinese",
  };
}

module.exports = { resolveTranslationConfig };
