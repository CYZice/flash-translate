"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { resolveTranslationConfig } = require("./translation-options.cjs");
const config = {
  autoZhEn: true,
  sourceLanguage: "auto",
  targetLanguage: "French",
  model: "deepseek-flash",
};

test("bilingual mode routes English and formulas to Chinese", () => {
  for (const text of ["Hello", "A", "Consider f(t)=1.", "123 + x^2"]) {
    const resolved = resolveTranslationConfig(text, config);
    assert.equal(resolved.sourceLanguage, "English");
    assert.equal(resolved.targetLanguage, "Chinese");
    assert.equal(resolved.model, config.model);
  }
});
test("bilingual mode matches the extension for Chinese, traditional and mixed technical text", () => {
  for (const text of [
    "你好",
    "鏡面的光斑",
    "Fresnel 近似与 Hermite-Gaussian 模式",
    "𠀀",
  ]) {
    const resolved = resolveTranslationConfig(text, config);
    assert.equal(resolved.sourceLanguage, "Chinese");
    assert.equal(resolved.targetLanguage, "English");
  }
  assert.equal(config.targetLanguage, "French");
});
test("turning bilingual mode off preserves the manual language direction", () => {
  const manual = { ...config, autoZhEn: false };
  assert.equal(resolveTranslationConfig("你好", manual), manual);
});
