package com.flashtranslate.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll

private val languages = listOf(
    "auto" to "自动识别",
    "Chinese" to "简体中文",
    "Traditional Chinese" to "繁體中文",
    "English" to "英语",
    "Japanese" to "日语",
    "Korean" to "韩语",
    "French" to "法语",
    "German" to "德语",
    "Spanish" to "西班牙语",
)

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
            var autoZhEn by rememberSaveable { mutableStateOf(current.autoZhEn) }
            var fontSize by rememberSaveable { mutableStateOf(current.translationFontSize.toFloat()) }

            MaterialTheme {
                Scaffold(
                    topBar = {
                        TopAppBar(
                            title = { Text("翻译设置") },
                            navigationIcon = {
                                IconButton(onClick = ::finish) {
                                    Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "返回")
                                }
                            },
                        )
                    },
                ) { padding ->
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(padding)
                            .padding(horizontal = 20.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        OutlinedTextField(
                            value = baseUrl,
                            onValueChange = { baseUrl = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("接口地址") },
                            singleLine = true,
                        )
                        OutlinedTextField(
                            value = model,
                            onValueChange = { model = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("模型") },
                            singleLine = true,
                        )
                        OutlinedTextField(
                            value = apiKey,
                            onValueChange = { apiKey = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("API 密钥") },
                            singleLine = true,
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("自动中英互译", style = MaterialTheme.typography.bodyLarge)
                            Switch(checked = autoZhEn, onCheckedChange = { autoZhEn = it })
                        }
                        if (!autoZhEn) {
                            LanguagePicker("原文", sourceLanguage, { sourceLanguage = it }, allowAuto = true)
                            LanguagePicker("译文", targetLanguage, { targetLanguage = it }, allowAuto = false)
                        }
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                                Text("字号", style = MaterialTheme.typography.bodyLarge)
                                Text("${fontSize.toInt()}", modifier = Modifier.padding(start = 8.dp), style = MaterialTheme.typography.bodySmall)
                            }
                            Slider(value = fontSize, onValueChange = { fontSize = it }, valueRange = 14f..24f, steps = 9)
                        }
                        Button(
                            onClick = {
                                ConfigStore.save(
                                    this@SettingsActivity,
                                    TranslationConfig(baseUrl, model, apiKey, sourceLanguage, targetLanguage, autoZhEn, fontSize.toInt()),
                                )
                                finish()
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text("保存") }
                    }
                }
            }
        }
    }
}

@Composable
private fun LanguagePicker(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    allowAuto: Boolean,
) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    val options = languages.filter { allowAuto || it.first != "auto" }
    val currentLabel = options.firstOrNull { it.first == value }?.second ?: value
    Box {
        OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(label)
                Text(currentLabel)
            }
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { (code, name) ->
                DropdownMenuItem(
                    text = { Text(name) },
                    onClick = {
                        onValueChange(code)
                        expanded = false
                    },
                )
            }
        }
    }
}
