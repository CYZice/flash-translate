const DEFAULT_SYSTEM_PROMPT =
  "Translate the selected text accurately. Return only the translation, without explanations.";

function getConfig() {
  return {
    baseUrl: process.env.FLASH_TRANSLATE_AI_BASE_URL || "",
    model: process.env.FLASH_TRANSLATE_AI_MODEL || "",
    apiKey: process.env.FLASH_TRANSLATE_AI_KEY || "",
    sourceLanguage: process.env.FLASH_TRANSLATE_SOURCE_LANGUAGE || "auto",
    targetLanguage: process.env.FLASH_TRANSLATE_TARGET_LANGUAGE || "Chinese",
    systemPrompt: process.env.FLASH_TRANSLATE_AI_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT,
  };
}

function completionsUrl(baseUrl) {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}

async function* readSse(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (line.startsWith("data:")) yield line.slice(5).trim();
        newline = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
    const finalLine = buffer.replace(/\r$/, "");
    if (finalLine.startsWith("data:")) yield finalLine.slice(5).trim();
  } finally {
    reader.releaseLock();
  }
}

async function* streamTranslation(text, signal) {
  const config = getConfig();
  if (!config.baseUrl || !config.model) {
    throw new Error(
      "Set FLASH_TRANSLATE_AI_BASE_URL and FLASH_TRANSLATE_AI_MODEL before using global translation."
    );
  }

  const response = await fetch(completionsUrl(config.baseUrl), {
    method: "POST",
    signal,
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      messages: [
        { role: "system", content: config.systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            task: "Translate only the selected text.",
            sourceLanguage: config.sourceLanguage,
            targetLanguage: config.targetLanguage,
            selectedText: text,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`AI request failed (${response.status}): ${detail}`);
  }
  if (!response.body) throw new Error("AI response did not include a stream body");

  for await (const data of readSse(response.body)) {
    if (!data || data === "[DONE]") continue;
    const chunk = JSON.parse(data);
    const delta = chunk.choices?.[0]?.delta?.content || chunk.choices?.[0]?.text;
    if (delta) yield delta;
  }
}

module.exports = { streamTranslation };
