package com.flashtranslate.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
class SettingsActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val current = ConfigStore.load(this)
        setContent {
            var baseUrl by rememberSaveable { mutableStateOf(current.baseUrl) }
            var model by rememberSaveable { mutableStateOf(current.model) }
            var apiKey by rememberSaveable { mutableStateOf(current.apiKey) }
            var sourceLanguage by rememberSaveable { mutableStateOf(current.sourceLanguage) }
            var targetLanguage by rememberSaveable { mutableStateOf(current.targetLanguage) }

            MaterialTheme {
                Scaffold(
                    topBar = {
                        TopAppBar(
                            title = { Text("Translation settings") },
                            navigationIcon = {
                                IconButton(onClick = ::finish) {
                                    Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Back")
                                }
                            },
                        )
                    },
                ) { padding ->
                    Column(
                        modifier = Modifier.fillMaxSize().padding(padding).padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text("OpenAI-compatible provider", style = MaterialTheme.typography.titleMedium)
                        OutlinedTextField(baseUrl, { baseUrl = it }, Modifier.fillMaxWidth(), label = { Text("Base URL") }, singleLine = true)
                        OutlinedTextField(model, { model = it }, Modifier.fillMaxWidth(), label = { Text("Model") }, singleLine = true)
                        OutlinedTextField(apiKey, { apiKey = it }, Modifier.fillMaxWidth(), label = { Text("API key") }, singleLine = true)
                        OutlinedTextField(sourceLanguage, { sourceLanguage = it }, Modifier.fillMaxWidth(), label = { Text("Source language") }, singleLine = true)
                        OutlinedTextField(targetLanguage, { targetLanguage = it }, Modifier.fillMaxWidth(), label = { Text("Target language") }, singleLine = true)
                        Button(
                            onClick = {
                                ConfigStore.save(this@SettingsActivity, TranslationConfig(baseUrl, model, apiKey, sourceLanguage, targetLanguage))
                                finish()
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text("Save") }
                    }
                }
            }
        }
    }
}
