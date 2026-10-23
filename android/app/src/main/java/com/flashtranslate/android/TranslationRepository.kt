package com.flashtranslate.android

class TranslationRepository {
    private val client = OpenAiStreamClient()

    suspend fun translate(text: String, config: TranslationConfig, onDelta: (String) -> Unit) {
        client.stream(config, text, onDelta)
    }
}
