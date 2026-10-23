package com.flashtranslate.android

import android.content.Context

data class TranslationConfig(
    val baseUrl: String,
    val model: String,
    val apiKey: String,
    val sourceLanguage: String,
    val targetLanguage: String,
    val autoZhEn: Boolean,
    val translationFontSize: Int,
)

fun TranslationConfig.resolveFor(text: String): TranslationConfig {
    if (!autoZhEn) return this
    val containsChinese = text.any { it.code in 0x4E00..0x9FFF }
    return copy(
        sourceLanguage = if (containsChinese) "Chinese" else "English",
        targetLanguage = if (containsChinese) "English" else "Chinese",
    )
}

object ConfigStore {
    private const val PREFS = "flash_translate"

    fun load(context: Context): TranslationConfig {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return TranslationConfig(
            baseUrl = prefs.getString("base_url", null)?.trim().orEmpty().ifEmpty { "https://api.deepseek.com" },
            model = prefs.getString("model", null)?.trim().orEmpty().ifEmpty { "deepseek-flash" },
            apiKey = prefs.getString("api_key", "") ?: "",
            sourceLanguage = prefs.getString("source_language", "auto") ?: "auto",
            targetLanguage = prefs.getString("target_language", "Chinese") ?: "Chinese",
            autoZhEn = prefs.getBoolean("auto_zh_en", true),
            translationFontSize = prefs.getInt("translation_font_size", 18).coerceIn(14, 24),
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
            .putBoolean("auto_zh_en", config.autoZhEn)
            .putInt("translation_font_size", config.translationFontSize.coerceIn(14, 24))
            .apply()
    }
}
