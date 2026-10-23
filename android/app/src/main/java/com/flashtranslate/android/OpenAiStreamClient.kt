package com.flashtranslate.android

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

class OpenAiStreamClient(private val http: OkHttpClient = OkHttpClient()) {
    suspend fun stream(
        config: TranslationConfig,
        text: String,
        onDelta: (String) -> Unit,
    ) = withContext(Dispatchers.IO) {
        val base = config.baseUrl.trimEnd('/')
        require(base.isNotEmpty()) { "Set the provider base URL in settings." }
        require(config.model.isNotBlank()) { "Set the model name in settings." }

        val payload = JSONObject()
            .put("model", config.model)
            .put("stream", true)
            .put("messages", JSONArray()
                .put(JSONObject()
                    .put("role", "system")
                    .put("content", "Translate the selected text accurately. Return only the translation."))
                .put(JSONObject()
                    .put("role", "user")
                    .put("content", JSONObject()
                        .put("task", "Translate only the selected text.")
                        .put("sourceLanguage", config.sourceLanguage)
                        .put("targetLanguage", config.targetLanguage)
                        .put("selectedText", text)
                        .toString())))

        val request = Request.Builder()
            .url(if (base.endsWith("/chat/completions")) base else "$base/chat/completions")
            .header("Accept", "text/event-stream")
            .header("Content-Type", "application/json")
            .apply { if (config.apiKey.isNotBlank()) header("Authorization", "Bearer ${config.apiKey}") }
            .post(payload.toString().toRequestBody("application/json".toMediaType()))
            .build()

        http.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                val detail = response.body?.string()?.take(500).orEmpty()
                error("Provider request failed (${response.code}): $detail")
            }
            val source = response.body?.charStream()?.buffered()
                ?: error("Provider response did not include a stream body.")
            source.useLines { lines ->
                lines.forEach { line ->
                    if (!line.startsWith("data:")) return@forEach
                    val data = line.removePrefix("data:").trim()
                    if (data.isEmpty() || data == "[DONE]") return@forEach
                    val choices = JSONObject(data).optJSONArray("choices") ?: return@forEach
                    val delta = choices.optJSONObject(0)
                        ?.optJSONObject("delta")
                        ?.optString("content")
                        .orEmpty()
                    if (delta.isNotEmpty()) {
                        withContext(Dispatchers.Main.immediate) { onDelta(delta) }
                    }
                }
            }
        }
    }
}
