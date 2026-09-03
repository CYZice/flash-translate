import { useEffect, useState } from "react";
import {
  AI_TEST_CONNECTION_MESSAGE,
  type AiTestConnectionResponse,
} from "@/shared/constants/ai-translation";
import { getAiApiKey, saveAiApiKey } from "@/shared/storage/ai-api-key";
import {
  type AiReasoningEffort,
  getSettings,
  saveSettings,
} from "@/shared/storage/settings";
import { getAiHostPermissionPattern } from "@/shared/utils/ai-endpoint";
import { getMessage } from "@/shared/utils/i18n";

type Status =
  | { type: "idle" }
  | { type: "working"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

function getStatusClassName(status: Status): string {
  switch (status.type) {
    case "error":
      return "text-red-500 text-xs";
    case "success":
      return "text-green-600 text-xs";
    default:
      return "text-gray-400 text-xs";
  }
}

const inputClassName =
  "mt-1 w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-gray-700 text-xs outline-none focus:border-blue-400";

export function ProviderSettings() {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [reasoningEffort, setReasoningEffort] =
    useState<AiReasoningEffort>("high");
  const [status, setStatus] = useState<Status>({ type: "idle" });

  useEffect(() => {
    const initialize = async () => {
      const [settings, storedApiKey] = await Promise.all([
        getSettings(),
        getAiApiKey(),
      ]);
      setBaseUrl(settings.aiBaseUrl);
      setApiKey(storedApiKey);
      setModel(settings.aiModel);
      setSystemPrompt(settings.aiSystemPrompt);
      setThinkingEnabled(settings.aiThinkingEnabled);
      setReasoningEffort(settings.aiReasoningEffort);
    };
    initialize();
  }, []);

  const persistSettings = async () => {
    await Promise.all([
      saveSettings({
        aiBaseUrl: baseUrl.trim(),
        aiModel: model.trim(),
        aiSystemPrompt: systemPrompt,
        aiThinkingEnabled: thinkingEnabled,
        aiReasoningEffort: reasoningEffort,
      }),
      saveAiApiKey(apiKey),
    ]);
  };

  const requestHostPermission = (): Promise<boolean> => {
    if (!baseUrl.trim()) {
      return Promise.resolve(true);
    }
    const originPattern = getAiHostPermissionPattern(baseUrl);
    return chrome.permissions.request({ origins: [originPattern] });
  };

  const handleSave = async () => {
    setStatus({ type: "working", message: getMessage("popup_ai_saving") });
    try {
      const permissionGranted = await requestHostPermission();
      await persistSettings();
      if (!permissionGranted) {
        setStatus({
          type: "error",
          message: getMessage("popup_ai_hostPermissionDenied"),
        });
        return;
      }
      setStatus({ type: "success", message: getMessage("popup_ai_saved") });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleTestConnection = async () => {
    setStatus({ type: "working", message: getMessage("popup_ai_testing") });
    try {
      const permissionGranted = await requestHostPermission();
      if (!permissionGranted) {
        setStatus({
          type: "error",
          message: getMessage("popup_ai_hostPermissionDenied"),
        });
        return;
      }
      await persistSettings();
      const response = (await chrome.runtime.sendMessage({
        type: AI_TEST_CONNECTION_MESSAGE,
      })) as AiTestConnectionResponse;
      setStatus({
        type: response.ok ? "success" : "error",
        message: response.ok
          ? getMessage("popup_ai_connectionSuccess")
          : response.message,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <div className="px-3 py-3">
      <div className="mb-2">
        <p className="font-medium text-gray-700 text-sm">AI enhanced translation</p>
        <p className="mt-0.5 text-gray-400 text-xs">Chrome handles the default translation. AI is used only when you request an enhanced result.</p>
      </div>

        <div className="space-y-2.5 border-gray-100 border-t pt-2.5">
          <label className="block text-gray-600 text-xs" htmlFor="ai-base-url">
            {getMessage("popup_ai_baseUrl")}
            <input
              autoCapitalize="off"
              autoComplete="off"
              className={inputClassName}
              id="ai-base-url"
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://example.com/v1"
              spellCheck={false}
              type="url"
              value={baseUrl}
            />
          </label>

          <label className="block text-gray-600 text-xs" htmlFor="ai-api-key">
            {getMessage("popup_ai_apiKey")}
            <input
              autoCapitalize="off"
              autoComplete="off"
              className={inputClassName}
              id="ai-api-key"
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={getMessage("popup_ai_apiKeyPlaceholder")}
              spellCheck={false}
              type="password"
              value={apiKey}
            />
          </label>

          <label className="block text-gray-600 text-xs" htmlFor="ai-model">
            {getMessage("popup_ai_model")}
            <input
              autoCapitalize="off"
              autoComplete="off"
              className={inputClassName}
              id="ai-model"
              onChange={(event) => setModel(event.target.value)}
              placeholder="gpt-5.6"
              spellCheck={false}
              type="text"
              value={model}
            />
          </label>

          <label
            className="block text-gray-600 text-xs"
            htmlFor="ai-system-prompt"
          >
            {getMessage("popup_ai_systemPrompt")}
            <textarea
              className={`${inputClassName} min-h-28 resize-y`}
              id="ai-system-prompt"
              onChange={(event) => setSystemPrompt(event.target.value)}
              value={systemPrompt}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label
              className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-gray-600 text-xs"
              htmlFor="ai-thinking-enabled"
            >
              <input
                checked={thinkingEnabled}
                id="ai-thinking-enabled"
                onChange={(event) => setThinkingEnabled(event.target.checked)}
                type="checkbox"
              />
              <span>开启思考模式</span>
            </label>
            <label
              className="block text-gray-600 text-xs"
              htmlFor="ai-reasoning-effort"
            >
              思考强度
              <select
                className={inputClassName}
                disabled={!thinkingEnabled}
                id="ai-reasoning-effort"
                onChange={(event) =>
                  setReasoningEffort(event.target.value as AiReasoningEffort)
                }
                value={reasoningEffort}
              >
                <option value="low">Low</option>
                <option value="high">High</option>
                <option value="max">Max</option>
              </select>
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              className="flex-1 rounded-md bg-gray-900 px-3 py-1.5 font-medium text-white text-xs hover:bg-gray-800 disabled:opacity-50"
              disabled={status.type === "working"}
              onClick={handleSave}
              type="button"
            >
              {getMessage("popup_ai_save")}
            </button>
            <button
              className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-700 text-xs hover:bg-gray-50 disabled:opacity-50"
              disabled={status.type === "working"}
              onClick={handleTestConnection}
              type="button"
            >
              {getMessage("popup_ai_testConnection")}
            </button>
          </div>

          {status.type !== "idle" && (
            <p
              className={getStatusClassName(status)}
            >
              {status.message}
            </p>
          )}
        </div>
    </div>
  );
}
