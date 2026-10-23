const result = document.getElementById("result");
const copyButton = document.getElementById("copy");
const autoButton = document.getElementById("auto");
const pinButton = document.getElementById("pin");
const notice = document.getElementById("notice");
const loading = document.getElementById("loading");
let translationState = "loading";

function updateLoading() {
  loading.hidden =
    translationState !== "loading" || Boolean(result.textContent);
  result.parentElement.setAttribute(
    "aria-busy",
    String(translationState === "loading")
  );
}
const languageCodes = {
  auto: "AUTO",
  Chinese: "ZH",
  "Traditional Chinese": "ZH-TW",
  English: "EN",
  Japanese: "JA",
  Korean: "KO",
  French: "FR",
  German: "DE",
  Spanish: "ES",
};

function setAuto(enabled) {
  autoButton.setAttribute("aria-pressed", String(enabled));
  autoButton.title = enabled ? "关闭自动划词翻译" : "开启自动划词翻译";
  autoButton.setAttribute("aria-label", autoButton.title);
}

function setPinned(pinned) {
  pinButton.setAttribute("aria-pressed", String(pinned));
  pinButton.title = pinned ? "取消钉住" : "钉住";
  pinButton.setAttribute(
    "aria-label",
    pinned ? "取消钉住翻译卡片" : "钉住翻译卡片"
  );
  pinButton
    .querySelector('[data-icon="pin"]')
    .toggleAttribute("hidden", pinned);
  pinButton
    .querySelector('[data-icon="pin-off"]')
    .toggleAttribute("hidden", !pinned);
}

window.selectionDesktop.onSelectionResult((text) => {
  result.textContent = text;
  notice.textContent = "";
  updateLoading();
});
window.selectionDesktop.onTranslationState((state) => {
  result.dataset.state = state;
  translationState = state;
  updateLoading();
  copyButton.disabled = state === "error" || !result.textContent;
});
window.selectionDesktop.onResultLanguages(
  ({ source, target, autoTranslate }) => {
    document.getElementById("source").textContent =
      languageCodes[source] || source;
    document.getElementById("source").title = source;
    document.getElementById("target").textContent =
      languageCodes[target] || target;
    document.getElementById("target").title = target;
    setAuto(autoTranslate);
  }
);
window.selectionDesktop.onResultPinState(setPinned);
window.selectionDesktop.onResultPreferences(({ translationFontSize }) => {
  document.documentElement.style.setProperty(
    "--translation-font-size",
    `${translationFontSize}px`
  );
});
window.selectionDesktop.onAutoTranslateState(setAuto);
pinButton.onclick = async () =>
  setPinned(await window.selectionDesktop.toggleResultPin());
autoButton.onclick = async () => {
  const response = await window.selectionDesktop.toggleAutoTranslate();
  if (response.ok) {
    setAuto(response.enabled);
  } else {
    notice.textContent = response.error;
  }
};
copyButton.onclick = async () => {
  if (await window.selectionDesktop.copyResult()) {
    notice.textContent = "已复制";
    setTimeout(() => {
      notice.textContent = "";
    }, 1500);
  }
};
document.getElementById("retry").onclick = () =>
  window.selectionDesktop.retry();
document.getElementById("close").onclick = () =>
  window.selectionDesktop.hideResult();
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    window.selectionDesktop.hideResult();
  }
});
