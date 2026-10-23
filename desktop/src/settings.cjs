"use strict";
const fs = require("node:fs");
const path = require("node:path");
const TRAILING_SLASHES = /\/+$/;

const DEFAULTS = {
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-flash",
  sourceLanguage: "auto",
  targetLanguage: "Chinese",
};
const PREFERENCES = {
  autoTranslate: false,
  autoZhEn: true,
  translationFontSize: 18,
};

function normalizeSettings(input) {
  if (!input || typeof input !== "object") {
    throw new Error("设置格式无效。");
  }
  const config = {};
  for (const key of ["autoTranslate", "autoZhEn"]) {
    const value = input[key] ?? PREFERENCES[key];
    if (typeof value !== "boolean") {
      throw new Error("自动翻译设置无效。");
    }
    config[key] = value;
  }
  const fontSize = input.translationFontSize ?? PREFERENCES.translationFontSize;
  if (!Number.isInteger(fontSize) || fontSize < 14 || fontSize > 24) {
    throw new Error("译文字号须为 14–24 的整数。");
  }
  config.translationFontSize = fontSize;
  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    const value = input[key] ?? fallback;
    if (typeof value !== "string" || value.length > 2048) {
      throw new Error("设置内容无效。");
    }
    config[key] = value.trim();
  }
  let url;
  try {
    url = new URL(config.baseUrl);
  } catch (cause) {
    throw new Error("请输入完整的 HTTP 或 HTTPS 接口地址。", { cause });
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "接口地址须使用 HTTP 或 HTTPS，且不能包含密码、查询参数或锚点。"
    );
  }
  if (!config.model) {
    throw new Error("请输入模型名称。");
  }
  if (!config.targetLanguage) {
    throw new Error("请选择目标语言。");
  }
  config.baseUrl = config.baseUrl.replace(TRAILING_SLASHES, "");
  config.sourceLanguage ||= "auto";
  return config;
}

function createSettingsStore(file, encryption) {
  function read() {
    if (!fs.existsSync(file)) {
      return {
        config: { ...DEFAULTS, ...PREFERENCES, apiKey: "" },
        warning: "",
        needsSetup: true,
      };
    }
    let stored;
    let config;
    try {
      stored = JSON.parse(fs.readFileSync(file, "utf8"));
      config = normalizeSettings(stored);
    } catch {
      return {
        config: { ...DEFAULTS, ...PREFERENCES, apiKey: "" },
        warning: "设置文件无法读取，请重新填写并保存。",
        needsSetup: true,
      };
    }
    let apiKey = "";
    let warning = "";
    let keyUnavailable = false;
    if (stored.encryptedApiKey) {
      try {
        apiKey = encryption.decryptString(
          Buffer.from(stored.encryptedApiKey, "base64")
        );
      } catch {
        keyUnavailable = true;
        warning = "已保存的密钥无法解密，请重新输入密钥并保存。";
      }
    }
    return {
      config: { ...config, apiKey },
      warning,
      keyUnavailable,
      needsSetup: false,
    };
  }

  function resolve(input) {
    const saved = read();
    const config = normalizeSettings({
      ...input,
      autoTranslate: input.autoTranslate ?? saved.config.autoTranslate,
      autoZhEn: input.autoZhEn ?? saved.config.autoZhEn,
      translationFontSize:
        input.translationFontSize ?? saved.config.translationFontSize,
    });
    if (
      input.apiKey !== undefined &&
      (typeof input.apiKey !== "string" || input.apiKey.length > 16_384)
    ) {
      throw new Error("API 密钥格式无效。");
    }
    const suppliedKey = input.apiKey?.trim() || "";
    if (saved.keyUnavailable && !suppliedKey && !input.clearApiKey) {
      throw new Error(saved.warning);
    }
    return {
      ...config,
      apiKey: input.clearApiKey ? "" : suppliedKey || saved.config.apiKey,
    };
  }

  function save(input) {
    const { apiKey, ...config } = resolve(input);
    let encryptedApiKey = "";
    if (apiKey) {
      if (!encryption.isEncryptionAvailable()) {
        throw new Error(
          "系统加密不可用，无法保存密钥。请启用系统密钥存储后重试。"
        );
      }
      encryptedApiKey = encryption.encryptString(apiKey).toString("base64");
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.tmp`;
    fs.writeFileSync(
      temporary,
      JSON.stringify({ ...config, encryptedApiKey }, null, 2),
      { mode: 0o600 }
    );
    fs.renameSync(temporary, file);
  }

  return { read, resolve, save };
}

module.exports = { createSettingsStore, normalizeSettings };
