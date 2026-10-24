# Electron 单 Overlay 窗口设计

## 目标

在现有 Electron 桌面版中，把常驻的“选中后翻译按钮窗口”和“翻译结果窗口”合并为一个 overlay `BrowserWindow`。选中文本时显示小按钮，点击后在同一个窗口切换为翻译卡片；设置窗口仍按需创建。这样减少一个常驻 Renderer，不改变 Linux、Android 或现有发布版的运行方式。

同时修复 Windows 便携版的可执行文件元数据，使任务管理器、窗口和任务栏显示 `Flash Translate`，而不是 Electron。

## 保留行为

- 选中文本后显示单独的翻译按钮。
- 点击按钮后显示当前纯白翻译卡片。
- 固定后卡片不因外部窗口获得焦点而自动关闭；未固定卡片仍按现有规则失焦关闭。
- 保留流式翻译、自动中英互译、复制、重试、关闭、字体大小和右下角拖拽缩放。
- GPU、Electron runtime、Linux 和 Android 不作改动。

## 实现边界

- `main.cjs` 只保留 `overlayWindow` 一套窗口状态；按钮态和结果态通过同一页面状态切换。
- `toolbar.html` 与 `result.html` 的视觉内容合并到 `overlay.html`，共用一个 preload 和一个 renderer。
- preload 暴露的行为接口保持语义不变，调用方从“按钮窗口/结果窗口”改为 overlay 状态。
- 只在 overlay 真实显示结果时启用结果窗口的尺寸、拖拽和固定行为。
- Windows 便携构建在复制 Electron runtime 后对 `FlashTranslate.exe` 写入 ProductName、FileDescription、OriginalFilename 和 CompanyName；这属于构建步骤，不增加运行时依赖。

## 验收

- 桌面测试通过，且新增测试证明按钮态和结果态共用同一个窗口生命周期。
- UI 检查通过：按钮态可点击，结果态可流式更新、复制、重试、固定和拖拽缩放。
- 构建后的 Windows 文件元数据显示 `Flash Translate`。
- 构建产物中不再创建或加载独立 toolbar BrowserWindow。
