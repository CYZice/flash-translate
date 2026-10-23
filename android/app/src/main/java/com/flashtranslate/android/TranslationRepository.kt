package com.flashtranslate.android

import android.content.Context

class TranslationRepository(context: Context) {
    private val appContext = context.applicationContext
    private val client = OpenAiStreamClient()

    suspend fun translate(text: String, onDelta: (String) -> Unit) {
        client.stream(ConfigStore.load(appContext), text, onDelta)
    }
}
