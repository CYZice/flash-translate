import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { CopyButton } from "@/content/components/copy-button";
import { LanguageSelector } from "@/content/components/language-selector";
import { TranslationContent } from "@/content/components/translation-content";
import {
  TranslationResultSwitch,
  type TranslationResultView,
} from "@/content/components/translation-result-switch";
import { useLanguageDetection } from "@/content/hooks/use-language-detection";
import { useTranslator } from "@/content/hooks/use-translator";
import { Button } from "@/shared/components/button";
import { useSettings } from "@/shared/hooks/use-settings";
import {
  getQuickTranslationStorageKey,
  isQuickTranslationRequest,
  isQuickTranslationRequestFresh,
  type QuickTranslationRequest,
} from "@/shared/quick-translation";
import { saveSettings } from "@/shared/storage/settings";
import { selectContentAppSettings } from "@/shared/storage/settings-selectors";
import { getMessage } from "@/shared/utils/i18n";

export default function App() {
  const [windowId, setWindowId] = useState<number | null>(null);
  const [request, setRequest] = useState<QuickTranslationRequest | null>(null);
  const [settings, settingsLoading] = useSettings(selectContentAppSettings);

  useEffect(() => {
    chrome.windows.getCurrent((currentWindow) => {
      if (currentWindow.id !== undefined) {
        setWindowId(currentWindow.id);
      }
    });
  }, []);

  useEffect(() => {
    if (windowId === null) {
      return;
    }

    const key = getQuickTranslationStorageKey(windowId);
    const readRequest = () => {
      chrome.storage.session.get(key, (values) => {
        const candidate = values[key];
        setRequest(
          isQuickTranslationRequest(candidate) &&
            isQuickTranslationRequestFresh(candidate)
            ? candidate
            : null
        );
      });
    };

    readRequest();
    const handleStorageChange = (
      changes: { [storageKey: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === "session" && changes[key]) {
        readRequest();
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [windowId]);

  if (settingsLoading || !settings) {
    return (
      <div className="panel-state">{getMessage("content_translating")}</div>
    );
  }

  if (!request) {
    return (
      <div className="panel-state">
        <p>{getMessage("quickTranslation_empty")}</p>
        <Button
          onClick={() => chrome.runtime.openOptionsPage()}
          variant="default"
        >
          {getMessage("content_openDetailedSettings")}
        </Button>
      </div>
    );
  }

  return <QuickTranslationCard request={request} settings={settings} />;
}

interface QuickTranslationCardProps {
  request: QuickTranslationRequest;
  settings: ReturnType<typeof selectContentAppSettings>;
}

function QuickTranslationCard({
  request,
  settings,
}: QuickTranslationCardProps) {
  const [activeView, setActiveView] = useState<TranslationResultView>("local");
  const [sourceOverride, setSourceOverride] = useState<string | null>(null);
  const autoDetectEnabled = settings.autoDetectLanguage;
  const detection = useLanguageDetection({
    text: request.text,
    enabled: autoDetectEnabled,
    fallbackLanguage: settings.sourceLanguage,
  });
  const sourceLanguage =
    sourceOverride ??
    (autoDetectEnabled
      ? detection.effectiveSourceLanguage
      : settings.sourceLanguage);
  const localTranslation = useTranslator({
    sourceLanguage,
    targetLanguage: settings.targetLanguage,
    provider: "chrome-built-in",
    resetKey: `${request.requestId}\u0000${sourceLanguage}\u0000${settings.targetLanguage}`,
  });
  const aiTranslation = useTranslator({
    sourceLanguage,
    targetLanguage: settings.targetLanguage,
    provider: "custom-ai",
    resetKey: `${request.requestId}\u0000${sourceLanguage}\u0000${settings.targetLanguage}`,
  });

  useEffect(() => {
    if (!detection.isDetecting) {
      localTranslation.translate(request.text);
    }
  }, [detection.isDetecting, localTranslation.translate, request.text]);

  const aiAvailable = Boolean(
    settings.aiBaseUrl.trim() && settings.aiModel.trim()
  );
  const currentTranslation =
    activeView === "ai" ? aiTranslation : localTranslation;

  const startAiTranslation = () => {
    setActiveView("ai");
    aiTranslation.translate(request.text, {
      contextBefore: "",
      contextAfter: "",
    });
  };

  return (
    <main className="panel-root">
      <header className="panel-header">
        <LanguageSelector
          isAutoDetected={autoDetectEnabled && sourceOverride === null}
          isDetecting={detection.isDetecting}
          onSourceChange={(lang) => {
            if (autoDetectEnabled) {
              setSourceOverride(lang);
            } else {
              saveSettings({ sourceLanguage: lang });
            }
          }}
          onTargetChange={(lang) => saveSettings({ targetLanguage: lang })}
          sourceLanguage={sourceLanguage}
          targetLanguage={settings.targetLanguage}
        />
        <div className="panel-actions">
          <TranslationResultSwitch
            activeView={activeView}
            aiAvailable={aiAvailable}
            aiIsLoading={aiTranslation.isLoading}
            onViewChange={(view) => {
              if (
                view === "ai" &&
                !aiTranslation.result &&
                !aiTranslation.isLoading
              ) {
                startAiTranslation();
                return;
              }
              setActiveView(view);
            }}
          />
          <Button
            aria-label={getMessage("content_openDetailedSettings")}
            onClick={() => chrome.runtime.openOptionsPage()}
            tooltip={getMessage("content_openDetailedSettings")}
            variant="default"
          >
            <Settings size={14} />
          </Button>
        </div>
      </header>
      <section className="source-text">{request.text}</section>
      <section className="result-area">
        <TranslationContent
          availability={currentTranslation.availability}
          error={currentTranslation.error}
          isLoading={currentTranslation.isLoading || detection.isDetecting}
          result={currentTranslation.result}
          sourceLanguage={sourceLanguage}
          targetLanguage={settings.targetLanguage}
        />
        <CopyButton text={currentTranslation.result} />
      </section>
    </main>
  );
}
