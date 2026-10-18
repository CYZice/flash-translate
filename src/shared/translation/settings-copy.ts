const LOCALE_SEPARATOR = /[-_]/;
const en = {
  languages: "Languages",
  behavior: "Translation behavior",
  advanced: "Advanced settings",
  nativeModels: "Chrome built-in language packs",
  nativeModelsDescription:
    "Manage local models here. These controls do not change translation languages.",
  secretDescription:
    "Choose an Obsidian secret. Only its reference is saved. Leave empty for a local service without authentication.",
  ai: "AI translation",
  aiDescription: "Use your own compatible translation service",
  autoZhEn: "Automatic Chinese ↔ English",
  autoZhEnDescription:
    "Text containing Chinese → English; otherwise → Chinese. Uses a local character rule, not a language-detection model.",
  automaticLanguages:
    "EN ⇄ 中文 · Manual languages are inactive. Choosing a language in the card returns to manual mode.",
  source: "Source language",
  target: "Target language",
  autoSource: "Auto detect (AI)",
  trigger: "After selecting text",
  triggerDescription:
    "A pinned card updates in place on new selections. The button alone sends no translation request.",
  badge: "Click translation icon",
  immediate: "Translate immediately",
  commandOnly: "Command only",
  baseUrl: "API base URL",
  baseUrlDescription:
    "Include /v1 if required by your provider. Selected text and configured context are sent only when translating.",
  apiKey: "API key",
  apiKeyPlaceholder: "Optional for a local service",
  model: "Model",
  modelDescription:
    "Use the exact model ID provided by your service or local server.",
  systemPrompt: "System prompt",
  contextRange: "Context range",
  contextDescription:
    "Sentences before and after the selection, per side. Set to 0 to send only selected text.",
  thinking: "Deep thinking",
  reasoningEffort: "Reasoning effort",
  effortLow: "Low",
  effortHigh: "High",
  effortMax: "Maximum",
  automaticDetectionNote:
    "Chinese ↔ English uses a local character rule; language detection is inactive.",
  automaticSkipNote:
    "Chinese ↔ English translates selections in either direction, without skipping by page language.",
};

type SettingsCopy = typeof en;

const zh: SettingsCopy = {
  languages: "语言",
  behavior: "翻译行为",
  advanced: "高级设置",
  nativeModels: "Chrome 内置语言包",
  nativeModelsDescription: "在这里管理本地模型，不改变翻译语言设置。",
  secretDescription:
    "选择 Obsidian 密钥，仅保存其引用。本地服务不需要验证时可留空。",
  ai: "AI 翻译",
  aiDescription: "使用自己的兼容翻译接口",
  autoZhEn: "自动中英互译",
  autoZhEnDescription:
    "含中文译英文，否则译中文。使用本地字符规则，无需语言检测模型。",
  automaticLanguages:
    "EN ⇄ 中文 · 手动语言暂不生效；在卡片中选择语言会退出互译模式。",
  source: "源语言",
  target: "目标语言",
  autoSource: "自动识别（AI）",
  trigger: "选中文本后",
  triggerDescription:
    "钉住的卡片会在新选区出现时原位更新。仅显示图标不会发送翻译请求。",
  badge: "点击翻译图标",
  immediate: "立即翻译",
  commandOnly: "仅通过命令翻译",
  baseUrl: "接口地址",
  baseUrlDescription:
    "按服务要求包含 /v1。仅在翻译时发送选中文本和指定范围的上下文。",
  apiKey: "API 密钥",
  apiKeyPlaceholder: "本地服务可不填",
  model: "模型",
  modelDescription: "填写服务商或本地模型服务提供的完整模型 ID。",
  systemPrompt: "系统提示词",
  contextRange: "上下文范围",
  contextDescription: "选中文本前后各读取的句数。设为 0 时只发送选中文本。",
  thinking: "深度思考",
  reasoningEffort: "推理强度",
  effortLow: "低",
  effortHigh: "高",
  effortMax: "最高",
  automaticDetectionNote: "中英互译使用本地字符规则，暂不使用语言检测。",
  automaticSkipNote: "中英互译始终双向翻译选中文本，不按网页语言跳过。",
};

const ja: SettingsCopy = {
  languages: "言語",
  behavior: "翻訳の動作",
  advanced: "詳細設定",
  nativeModels: "Chrome 内蔵言語パック",
  nativeModelsDescription:
    "ローカルモデルを管理します。翻訳言語の設定は変更しません。",
  secretDescription:
    "Obsidian のシークレットを選択します。参照のみを保存します。認証不要のローカルサービスでは空欄にできます。",
  ai: "AI 翻訳",
  aiDescription: "独自の互換翻訳サービスを使用",
  autoZhEn: "中国語と英語の自動相互翻訳",
  autoZhEnDescription:
    "漢字を含むテキストは英語に、それ以外は中国語に翻訳します。言語検出モデルは不要です。",
  automaticLanguages:
    "EN ⇄ 中文 · 手動の言語設定は無効です。カードで言語を選ぶと手動モードに戻ります。",
  source: "元の言語",
  target: "翻訳先の言語",
  autoSource: "自動検出（AI）",
  trigger: "テキスト選択後",
  triggerDescription:
    "固定したカードは新しい選択範囲に合わせて同じ位置で更新されます。アイコンの表示だけではリクエストしません。",
  badge: "翻訳アイコンをクリック",
  immediate: "すぐに翻訳",
  commandOnly: "コマンドのみ",
  baseUrl: "API ベース URL",
  baseUrlDescription:
    "必要に応じて /v1 を含めてください。選択したテキストと設定した前後の文は翻訳時にのみ送信されます。",
  apiKey: "API キー",
  apiKeyPlaceholder: "ローカルサービスでは省略可能",
  model: "モデル",
  modelDescription:
    "サービスまたはローカルサーバーが指定する正確なモデル ID を入力してください。",
  systemPrompt: "システムプロンプト",
  contextRange: "コンテキストの範囲",
  contextDescription:
    "選択範囲の前後それぞれの文数です。0 にすると選択したテキストのみを送信します。",
  thinking: "深い思考",
  reasoningEffort: "推論の強度",
  effortLow: "低",
  effortHigh: "高",
  effortMax: "最大",
  automaticDetectionNote:
    "中国語と英語の相互翻訳では文字ルールを使用し、言語検出は行いません。",
  automaticSkipNote:
    "相互翻訳ではページの言語に関係なく、選択したテキストを翻訳します。",
};

/** Identical settings copy in both hosts; no dependency on either runtime. */
export function getTranslationSettingsCopy(locale: string): SettingsCopy {
  const language = locale.toLowerCase().split(LOCALE_SEPARATOR)[0];
  if (language === "zh") {
    return zh;
  }
  return language === "ja" ? ja : en;
}
