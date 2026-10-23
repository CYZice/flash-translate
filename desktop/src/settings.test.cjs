"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { createSettingsStore, normalizeSettings } = require("./settings.cjs");
const ENCRYPTION_ERROR = /加密/;
const KEY_WARNING = /密钥/;

const encryption = {
  isEncryptionAvailable: () => true,
  encryptString: (value) => Buffer.from(`encrypted:${value}`),
  decryptString: (value) => value.toString().slice("encrypted:".length),
};

function fixture(t, crypto = encryption) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "flash-settings-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "settings.json");
  return { file, store: createSettingsStore(file, crypto) };
}

test("normalizes endpoint and validates required provider fields", () => {
  assert.equal(
    normalizeSettings({
      baseUrl: " http://localhost:11434/v1/ ",
      model: " qwen ",
    }).baseUrl,
    "http://localhost:11434/v1"
  );
  for (const baseUrl of [
    "",
    "file:///tmp",
    "https://user:pass@example.com",
    "bad-url",
  ]) {
    assert.throws(() => normalizeSettings({ baseUrl, model: "qwen" }));
  }
  assert.throws(() =>
    normalizeSettings({ baseUrl: "https://example.com/v1", model: "" })
  );
});

test("first run prefills DeepSeek but still requires setup", (t) => {
  const { store } = fixture(t);
  assert.equal(store.read().config.baseUrl, "https://api.deepseek.com");
  assert.equal(store.read().config.model, "deepseek-flash");
  assert.equal(store.read().needsSetup, true);
  assert.equal(store.read().config.autoZhEn, true);
  assert.equal(store.read().config.translationFontSize, 18);
  assert.equal(store.read().config.targetLanguage, "Chinese");
});

test("persists settings and an encrypted key, retaining blank keys and allowing explicit removal", (t) => {
  const { file, store } = fixture(t);
  const input = {
    baseUrl: "https://example.com/v1",
    model: "test-model",
    apiKey: "secret-api-key",
  };
  store.save(input);
  assert.equal(store.read().config.apiKey, input.apiKey);
  assert.equal(store.read().needsSetup, false);
  assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).apiKey, undefined);
  assert.equal(fs.readFileSync(file, "utf8").includes("secret-api-key"), false);
  store.save({ ...input, apiKey: "", model: "changed" });
  assert.equal(store.read().config.apiKey, input.apiKey);
  store.save({ ...input, apiKey: "", clearApiKey: true });
  assert.equal(store.read().config.apiKey, "");
});

test("retains bilingual mode and font size across provider edits and validates both", (t) => {
  const { store } = fixture(t);
  const provider = {
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-flash",
  };
  store.save({ ...provider, autoZhEn: false, translationFontSize: 24 });
  store.save({ ...provider, model: "changed" });
  assert.equal(store.read().config.autoZhEn, false);
  assert.equal(store.read().config.translationFontSize, 24);
  for (const translationFontSize of [13, 25, 18.5, "18", Number.NaN]) {
    assert.throws(() => store.save({ ...provider, translationFontSize }));
  }
  assert.throws(() => store.save({ ...provider, autoZhEn: "true" }));
});

test("refuses plaintext key storage when secure storage is unavailable", (t) => {
  const { file, store } = fixture(t, {
    ...encryption,
    isEncryptionAvailable: () => false,
  });
  assert.throws(
    () =>
      store.save({
        baseUrl: "https://example.com",
        model: "m",
        apiKey: "secret",
      }),
    ENCRYPTION_ERROR
  );
  assert.equal(fs.existsSync(file), false);
});

test("keeps provider settings when a moved key cannot be decrypted", (t) => {
  const { file, store } = fixture(t);
  store.save({ baseUrl: "https://example.com/v1", model: "m", apiKey: "key" });
  const moved = createSettingsStore(file, {
    ...encryption,
    decryptString() {
      throw new Error("different user");
    },
  });
  assert.equal(moved.read().config.model, "m");
  assert.equal(moved.read().config.apiKey, "");
  assert.match(moved.read().warning, KEY_WARNING);
});

test("can replace a corrupt settings file through the settings form", (t) => {
  const { file, store } = fixture(t);
  fs.writeFileSync(file, "invalid json");
  store.save({ baseUrl: "http://localhost:11434/v1", model: "qwen" });
  assert.equal(store.read().config.model, "qwen");
});

test("persists automatic selection translation and retains it when editing provider fields", (t) => {
  const { store } = fixture(t);
  assert.equal(store.read().config.autoTranslate, false);
  store.save({
    baseUrl: "http://localhost/v1",
    model: "m",
    autoTranslate: true,
  });
  assert.equal(store.read().config.autoTranslate, true);
  store.save({ baseUrl: "http://localhost/v1", model: "next" });
  assert.equal(store.read().config.autoTranslate, true);
  assert.throws(() =>
    store.save({
      baseUrl: "http://localhost/v1",
      model: "m",
      autoTranslate: "true",
    })
  );
});
