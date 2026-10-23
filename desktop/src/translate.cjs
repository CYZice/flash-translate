"use strict";
const DEFAULT_SYSTEM_PROMPT =
  "Translate the selected text accurately. Return only the translation, without explanations.";
const TRAILING_SLASHES = /\/+$/;
const TRAILING_CR = /\r$/;

function completionsUrl(baseUrl) {
  const normalized = baseUrl.replace(TRAILING_SLASHES, "");
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
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(TRAILING_CR, "");
        buffer = buffer.slice(newline + 1);
        if (line.startsWith("data:")) {
          yield line.slice(5).trim();
        }
        newline = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
    const finalLine = buffer.replace(TRAILING_CR, "");
    if (finalLine.startsWith("data:")) {
      yield finalLine.slice(5).trim();
    }
  } finally {
    reader.releaseLock();
  }
}

async function* streamTranslation(text, signal, config) {
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
        { role: "system", content: DEFAULT_SYSTEM_PROMPT },
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
    throw new Error(
      `接口请求失败（HTTP ${response.status}），请检查地址、模型和密钥。`
    );
  }
  if (!response.body) {
    throw new Error("AI response did not include a stream body");
  }

  let hasOutput = false;
  for await (const data of readSse(response.body)) {
    if (data === "[DONE]") {
      break;
    }
    if (!data) {
      continue;
    }
    const chunk = JSON.parse(data);
    const delta =
      chunk.choices?.[0]?.delta?.content || chunk.choices?.[0]?.text;
    if (typeof delta === "string" && delta) {
      hasOutput = true;
      yield delta;
    }
  }
  if (!hasOutput) {
    throw new Error("接口未返回译文，请确认模型支持流式 Chat Completions。");
  }
}

module.exports = { streamTranslation };
