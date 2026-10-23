package com.flashtranslate.android

import android.content.Context

data class TranslationConfig(
    val baseUrl: String,
    val model: String,
    val apiKey: String,
    val sourceLanguage: String,
    val targetLanguage: String,
)

object ConfigStore {
    private const val PREFS = "flash_translate"

    fun load(context: Context): TranslationConfig {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return TranslationConfig(
            baseUrl = prefs.getString("base_url", "") ?: "",
            model = prefs.getString("model", "") ?: "",
            apiKey = prefs.getString("api_key", "") ?: "",
            sourceLanguage = prefs.getString("source_language", "auto") ?: "auto",
            targetLanguage = prefs.getString("target_language", "Chinese") ?: "Chinese",
        )
    }

    fun save(context: Context, config: TranslationConfig) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString("base_url", config.baseUrl.trim())
            .putString("model", config.model.trim())
            .putString("api_key", config.apiKey.trim())
            .putString("source_language", config.sourceLanguage.trim().ifEmpty { "auto" })
            .putString("target_language", config.targetLanguage.trim().ifEmpty { "Chinese" })
            .apply()
    }
}
