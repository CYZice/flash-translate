package com.flashtranslate.android

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setFinishOnTouchOutside(true)
        window.setGravity(Gravity.BOTTOM)
        window.setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT)

        val selectedText = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString()?.trim().orEmpty()
        setContent {
            TranslationDrawer(selectedText = selectedText, onClose = ::finish)
        }
    }
}

@androidx.compose.runtime.Composable
private fun TranslationDrawer(selectedText: String, onClose: () -> Unit) {
    val context = LocalContext.current
    val repository = remember { TranslationRepository(context) }
    var output by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(selectedText.isNotEmpty()) }

    BackHandler(onBack = onClose)
    LaunchedEffect(selectedText) {
        if (selectedText.isEmpty()) {
            loading = false
            error = "No text was selected."
            return@LaunchedEffect
        }
        output = ""
        error = null
        loading = true
        try {
            repository.translate(selectedText) { delta ->
                output += delta
            }
        } catch (throwable: Throwable) {
            error = throwable.message ?: "Translation failed."
        } finally {
            loading = false
        }
    }

    Surface(
        modifier = Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 8.dp, vertical = 8.dp).heightIn(min = 220.dp, max = 520.dp),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(28.dp),
        color = Color(0xFF1B1B1F),
        tonalElevation = 12.dp,
    ) {
        Column(modifier = Modifier.padding(start = 20.dp, top = 16.dp, end = 12.dp, bottom = 14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.AutoAwesome, contentDescription = null, tint = Color(0xFF8AB4FF), modifier = Modifier.size(18.dp))
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { context.startActivity(Intent(context, SettingsActivity::class.java)) }) {
                    Icon(Icons.Outlined.Settings, contentDescription = "Settings", tint = Color(0xFFB6B6C2))
                }
            }
            Column(modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (loading && output.isEmpty()) {
                    CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color(0xFF8AB4FF), strokeWidth = 2.dp)
                }
                Text(
                    text = error ?: output.ifEmpty { if (loading) "Translating…" else "Nothing to translate." },
                    color = if (error == null) Color(0xFFF5F5F7) else Color(0xFFFFA7A7),
                    fontSize = 16.sp,
                    lineHeight = 25.sp,
                    fontWeight = FontWeight.Normal,
                )
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                IconButton(
                    enabled = output.isNotBlank(),
                    onClick = {
                        val clipboard = context.getSystemService(ClipboardManager::class.java)
                        clipboard.setPrimaryClip(ClipData.newPlainText("Flash Translate", output))
                        Toast.makeText(context, "Copied", Toast.LENGTH_SHORT).show()
                    },
                ) {
                    Icon(Icons.Outlined.ContentCopy, contentDescription = "Copy translation", tint = if (output.isNotBlank()) Color(0xFFB6CFFF) else Color(0xFF666672))
                }
            }
        }
    }
}
