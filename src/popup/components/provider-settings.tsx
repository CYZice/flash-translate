import { ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ToggleSwitch } from "@/shared/components/toggle-switch";
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
import {
  DEFAULT_AI_CONTEXT_SENTENCE_COUNT,
  getContextAroundSelection,
  MAX_AI_CONTEXT_SENTENCE_COUNT,
  MIN_AI_CONTEXT_SENTENCE_COUNT,
} from "@/shared/utils/ai-context";
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
  "mt-1.5 w-full rounded border border-gray-200 bg-white px-2.5 py-2 text-gray-800 text-xs outline-none transition-colors placeholder:text-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20";

const CONTEXT_PREVIEW_BEFORE =
  "第一句介绍项目背景。第二句补充当前进度。第三句说明关键术语。";
const CONTEXT_PREVIEW_SELECTION = "这个功能会结合上下文优化翻译。";
const CONTEXT_PREVIEW_AFTER =
  "第一句说明输出要求。第二句提示请求长度。第三句给出使用建议。";

export function ContextPreview({ sentenceCount }: { sentenceCount: number }) {
  const { contextBefore, contextAfter } = getContextAroundSelection(
    CONTEXT_PREVIEW_BEFORE,
    CONTEXT_PREVIEW_AFTER,
    sentenceCount
  );

  return (
    <div className="space-y-1.5 rounded border border-gray-100 bg-gray-50 p-2.5 text-xs leading-5">
      {contextBefore && (
        <p className="m-0 text-gray-400">
          <span className="mr-2 text-gray-500">
            {getMessage("popup_ai_contextBefore")}
          </span>
          {contextBefore}
        </p>
      )}
      <p className="m-0 rounded-sm bg-blue-50 px-2 py-1 text-blue-800">
        <span className="mr-2 font-medium text-blue-600">
          {getMessage("popup_ai_contextSelected")}
        </span>
        {CONTEXT_PREVIEW_SELECTION}
      </p>
      {contextAfter && (
        <p className="m-0 text-gray-400">
          <span className="mr-2 text-gray-500">
            {getMessage("popup_ai_contextAfter")}
          </span>
          {contextAfter}
        </p>
      )}
    </div>
  );
}

export function ProviderSettings() {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [contextSentenceCount, setContextSentenceCount] = useState(
    DEFAULT_AI_CONTEXT_SENTENCE_COUNT
  );
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
      setContextSentenceCount(settings.aiContextSentenceCount);
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
        aiContextSentenceCount: contextSentenceCount,
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
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset">
        <Sparkles
          aria-hidden="true"
          className="shrink-0 text-violet-600"
          size={18}
        />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-gray-900 text-xs">
            {getMessage("popup_ai_title")}
          </span>
          <span className="mt-0.5 block text-gray-400 text-xs leading-4">
            {getMessage("popup_ai_description")}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180"
          size={16}
        />
      </summary>

      <div className="space-y-3 border-gray-100 border-t px-4 pt-3 pb-4">
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
            className={`${inputClassName} min-h-20 resize-y`}
            id="ai-system-prompt"
            onChange={(event) => setSystemPrompt(event.target.value)}
            value={systemPrompt}
          />
        </label>

        <div className="space-y-2 border-gray-100 border-t pt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <label
                className="font-medium text-gray-700 text-xs"
                htmlFor="ai-context-sentence-count"
              >
                {getMessage("popup_ai_contextRange")}
              </label>
              <p className="m-0 mt-0.5 text-gray-400 text-xs">
                {getMessage("popup_ai_contextRangeDesc")}
              </p>
            </div>
            <select
              className="h-8 w-24 rounded border border-gray-200 bg-white px-2 text-gray-700 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              id="ai-context-sentence-count"
              onChange={(event) =>
                setContextSentenceCount(Number(event.target.value))
              }
              value={contextSentenceCount}
            >
              {Array.from(
                {
                  length:
                    MAX_AI_CONTEXT_SENTENCE_COUNT -
                    MIN_AI_CONTEXT_SENTENCE_COUNT +
                    1,
                },
                (_, index) => index + MIN_AI_CONTEXT_SENTENCE_COUNT
              ).map((count) => (
                <option key={count} value={count}>
                  {getMessage("popup_ai_contextSentenceOption", String(count))}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="m-0 mb-1.5 font-medium text-gray-500 text-xs">
              {getMessage("popup_ai_contextPreview")}
            </p>
            <ContextPreview sentenceCount={contextSentenceCount} />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_8rem] items-end gap-3 border-gray-100 border-t pt-3">
          <div className="flex min-h-9 items-center justify-between gap-3">
            <label
              className="text-gray-700 text-xs"
              htmlFor="ai-thinking-enabled"
            >
              {getMessage("popup_ai_thinkingEnabled")}
            </label>
            <ToggleSwitch
              checked={thinkingEnabled}
              id="ai-thinking-enabled"
              onChange={() => setThinkingEnabled((enabled) => !enabled)}
            />
          </div>
          <label
            className="block text-gray-600 text-xs"
            htmlFor="ai-reasoning-effort"
          >
            {getMessage("popup_ai_reasoningEffort")}
            <select
              className={cn(
                inputClassName,
                "disabled:bg-gray-50 disabled:text-gray-400"
              )}
              disabled={!thinkingEnabled}
              id="ai-reasoning-effort"
              onChange={(event) =>
                setReasoningEffort(event.target.value as AiReasoningEffort)
              }
              value={reasoningEffort}
            >
              <option value="low">{getMessage("popup_ai_effortLow")}</option>
              <option value="high">{getMessage("popup_ai_effortHigh")}</option>
              <option value="max">{getMessage("popup_ai_effortMax")}</option>
            </select>
          </label>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            className="min-h-8 flex-1 rounded bg-blue-600 px-3 py-1.5 font-medium text-white text-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
            disabled={status.type === "working"}
            onClick={handleSave}
            type="button"
          >
            {getMessage("popup_ai_save")}
          </button>
          <button
            className="min-h-8 flex-1 rounded border border-gray-200 bg-white px-3 py-1.5 font-medium text-gray-700 text-xs transition-colors hover:bg-gray-50 disabled:opacity-50"
            disabled={status.type === "working"}
            onClick={handleTestConnection}
            type="button"
          >
            {getMessage("popup_ai_testConnection")}
          </button>
        </div>

        {status.type !== "idle" && (
          <p aria-live="polite" className={getStatusClassName(status)}>
            {status.message}
          </p>
        )}
      </div>
    </details>
  );
}
