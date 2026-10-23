package com.flashtranslate.android

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.os.Bundle
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.PushPin
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Blue = Color(0xFF2563EB)
private val TextColor = Color(0xFF1F2937)
private val Muted = Color(0xFF9CA3AF)
private val Border = Color(0xFFE5E7EB)

class MainActivity : ComponentActivity() {
    private var drawerPinned = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setGravity(Gravity.BOTTOM)
        window.clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
        window.addFlags(
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
        )

        val selectedText = (
            intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)
                ?: intent.getCharSequenceExtra(Intent.EXTRA_TEXT)
            )?.toString()?.trim().orEmpty()
        setContent {
            TranslationDrawer(
                selectedText = selectedText,
                onClose = ::finish,
                onPinnedChange = { drawerPinned = it },
            )
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            window.setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT)
        }
    }

    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        if (event.action == MotionEvent.ACTION_OUTSIDE && !drawerPinned) {
            finish()
            return true
        }
        return super.dispatchTouchEvent(event)
    }
}

@Composable
private fun TranslationDrawer(
    selectedText: String,
    onClose: () -> Unit,
    onPinnedChange: (Boolean) -> Unit,
) {
    val context = LocalContext.current
    val configuration = LocalConfiguration.current
    val repository = remember { TranslationRepository() }
    var config by remember { mutableStateOf(ConfigStore.load(context)) }
    var output by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(selectedText.isNotEmpty()) }
    var pinned by remember { mutableStateOf(false) }
    var retryToken by remember { mutableIntStateOf(0) }
    val resolvedConfig = config.resolveFor(selectedText)

    BackHandler(onBack = onClose)
    LaunchedEffect(selectedText, retryToken, config) {
        if (selectedText.isEmpty()) {
            loading = false
            error = "没有选中的文字"
            return@LaunchedEffect
        }
        output = ""
        error = null
        loading = true
        try {
            repository.translate(selectedText, resolvedConfig) { delta ->
                output += delta
            }
        } catch (throwable: Throwable) {
            error = throwable.message ?: "翻译失败"
        } finally {
            loading = false
        }
    }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .heightIn(min = 172.dp, max = (configuration.screenHeightDp * 0.72f).dp)
            .border(1.dp, Border, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        color = Color.White,
        tonalElevation = 0.dp,
    ) {
        Column(modifier = Modifier.padding(start = 10.dp, top = 4.dp, end = 8.dp, bottom = 6.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(languageCode(resolvedConfig.sourceLanguage), color = Blue, fontSize = 14.sp)
                    Icon(
                        Icons.AutoMirrored.Outlined.ArrowForward,
                        contentDescription = null,
                        tint = Color(0xFF60A5FA),
                        modifier = Modifier.padding(horizontal = 5.dp).size(14.dp),
                    )
                    Text(languageCode(resolvedConfig.targetLanguage), color = Blue, fontSize = 14.sp)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    DrawerIconButton(
                        onClick = {
                            config = config.copy(autoZhEn = !config.autoZhEn)
                            ConfigStore.save(context, config)
                        },
                        selected = config.autoZhEn,
                        description = if (config.autoZhEn) "关闭自动中英互译" else "开启自动中英互译",
                    ) { Icon(Icons.Outlined.Bolt, contentDescription = null) }
                    DrawerIconButton(
                        onClick = {
                            pinned = !pinned
                            onPinnedChange(pinned)
                        },
                        selected = pinned,
                        description = if (pinned) "取消锁定抽屉" else "锁定抽屉",
                    ) { Icon(Icons.Outlined.PushPin, contentDescription = null) }
                    DrawerIconButton(onClick = onClose, description = "关闭") {
                        Icon(Icons.Outlined.Close, contentDescription = null)
                    }
                }
            }

            Column(
                modifier = Modifier
                    .heightIn(min = 94.dp, max = 380.dp)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 4.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (loading && output.isEmpty()) TranslationLoadingMark()
                if (error != null) {
                    Text(error.orEmpty(), color = Color(0xFFDC2626), fontSize = 14.sp, lineHeight = 22.sp)
                } else if (output.isNotEmpty()) {
                    Text(
                        text = output,
                        color = TextColor,
                        fontSize = config.translationFontSize.sp,
                        lineHeight = (config.translationFontSize * 1.6f).sp,
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(
                    onClick = {
                        val clipboard = context.getSystemService(ClipboardManager::class.java)
                        clipboard.setPrimaryClip(ClipData.newPlainText("Flash Translate", output))
                        Toast.makeText(context, "已复制", Toast.LENGTH_SHORT).show()
                    },
                    enabled = output.isNotBlank(),
                    modifier = Modifier.size(34.dp),
                ) {
                    Icon(Icons.Outlined.ContentCopy, contentDescription = "复制译文", tint = if (output.isNotBlank()) Muted else Color(0xFFD1D5DB))
                }
                IconButton(
                    onClick = { retryToken++ },
                    enabled = selectedText.isNotEmpty() && !loading,
                    modifier = Modifier.size(34.dp),
                ) {
                    Icon(Icons.Outlined.Refresh, contentDescription = "重试", tint = if (!loading && selectedText.isNotEmpty()) Muted else Color(0xFFD1D5DB))
                }
            }
        }
    }
}

@Composable
private fun DrawerIconButton(
    onClick: () -> Unit,
    description: String,
    selected: Boolean = false,
    content: @Composable () -> Unit,
) {
    IconButton(onClick = onClick, modifier = Modifier.size(34.dp)) {
        Box(Modifier.semantics { contentDescription = description }) {
            CompositionLocalProvider(LocalContentColor provides if (selected) Blue else Muted) {
                content()
            }
        }
    }
}

@Composable
private fun TranslationLoadingMark() {
    val transition = rememberInfiniteTransition(label = "translation loading")
    val phase by transition.animateFloat(
        initialValue = 0f,
        targetValue = 64f,
        animationSpec = infiniteRepeatable(tween(1600, easing = LinearEasing), RepeatMode.Restart),
        label = "translation flow",
    )
    Canvas(Modifier.size(width = 30.dp, height = 20.dp)) {
        val path = Path().apply {
            moveTo(size.width / 2, size.height / 2)
            cubicTo(size.width * 0.37f, size.height * 0.06f, size.width * 0.2f, 0f, size.width * 0.1f, size.height / 2)
            cubicTo(size.width * 0.2f, size.height, size.width * 0.37f, size.height * 0.94f, size.width / 2, size.height / 2)
            cubicTo(size.width * 0.63f, size.height * 0.06f, size.width * 0.8f, 0f, size.width * 0.9f, size.height / 2)
            cubicTo(size.width * 0.8f, size.height, size.width * 0.63f, size.height * 0.94f, size.width / 2, size.height / 2)
        }
        val stroke = Stroke(width = 1.7.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
        drawPath(path, color = Color(0xFFE2E8F0), style = stroke)
        drawPath(
            path,
            color = Blue,
            style = Stroke(
                width = 1.7.dp.toPx(),
                cap = StrokeCap.Round,
                join = StrokeJoin.Round,
                pathEffect = PathEffect.dashPathEffect(
                    floatArrayOf(10.dp.toPx(), 52.dp.toPx()),
                    phase * density,
                ),
            ),
        )
    }
}

private fun languageCode(language: String): String = when (language) {
    "Chinese" -> "ZH"
    "Traditional Chinese" -> "ZH-TW"
    "English" -> "EN"
    "Japanese" -> "JA"
    "Korean" -> "KO"
    "French" -> "FR"
    "German" -> "DE"
    "Spanish" -> "ES"
    else -> "AUTO"
}
