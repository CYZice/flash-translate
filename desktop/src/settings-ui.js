const form = document.getElementById("settings-form");
const fields = document.getElementById("fields");
const status = document.getElementById("status");
const keyInput = document.getElementById("api-key");
const clearKey = document.getElementById("clear-key");
const testButton = document.getElementById("test");
const autoZhEn = document.getElementById("auto-zh-en");
const fontSize = document.getElementById("font-size");

function updatePreferences() {
  document.getElementById("manual-languages").hidden = autoZhEn.checked;
  document.getElementById("font-size-value").value = fontSize.value;
}

autoZhEn.onchange = updatePreferences;
fontSize.oninput = updatePreferences;

function showStatus(message, state = "") {
  status.hidden = !message;
  status.textContent = message;
  status.dataset.state = state;
}

function readForm() {
  return {
    baseUrl: document.getElementById("base-url").value,
    model: document.getElementById("model").value,
    apiKey: keyInput.value,
    clearApiKey: clearKey.checked,
    sourceLanguage: document.getElementById("source-language").value,
    targetLanguage: document.getElementById("target-language").value,
    autoZhEn: autoZhEn.checked,
    translationFontSize: Number(fontSize.value),
  };
}

function fillForm(settings) {
  document.getElementById("base-url").value = settings.baseUrl;
  document.getElementById("model").value = settings.model;
  document.getElementById("source-language").value = settings.sourceLanguage;
  document.getElementById("target-language").value = settings.targetLanguage;
  autoZhEn.checked = settings.autoZhEn;
  fontSize.value = String(settings.translationFontSize);
  updatePreferences();
  keyInput.value = settings.apiKey;
  clearKey.checked = false;
  clearKey.disabled = !settings.canClearApiKey;
  document.getElementById("clear-key-row").hidden = !settings.canClearApiKey;
}

clearKey.onchange = () => {
  keyInput.disabled = clearKey.checked;
  if (clearKey.checked) {
    keyInput.value = "";
  }
};

form.onsubmit = async (event) => {
  event.preventDefault();
  const input = readForm();
  fields.disabled = true;
  try {
    const result = await window.desktopSettings.save(input);
    if (!result.ok) {
      throw new Error(result.error);
    }
    fillForm(result.settings);
    keyInput.disabled = false;
    showStatus("已保存", "success");
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    fields.disabled = false;
  }
};

testButton.onclick = async () => {
  if (!form.reportValidity()) {
    return;
  }
  const input = readForm();
  fields.disabled = true;
  testButton.textContent = "测试中…";
  showStatus("正在测试…");
  try {
    const result = await window.desktopSettings.test(input);
    if (!result.ok) {
      throw new Error(result.error);
    }
    showStatus("连接成功", "success");
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    fields.disabled = false;
    testButton.textContent = "测试连接";
  }
};

window.desktopSettings
  .read()
  .then((settings) => {
    fillForm(settings);
    fields.disabled = false;
    showStatus(settings.warning || "", settings.warning ? "error" : "");
  })
  .catch((error) => showStatus(`读取设置失败：${error.message}`, "error"));
