# 平台源码地图

Flash Translate 当前保留三条可发布客户端源码，同时保留浏览器与 Obsidian 集成源码。

| 目录 | 平台/用途 | 发布形态 |
| --- | --- | --- |
| `desktop/` | Windows、Linux 桌面版，共用 Electron 主进程与翻译卡片 | Windows 便携版、Linux tar.gz、Debian 包 |
| `android/` | 原生 Android 客户端，Kotlin + Jetpack Compose | APK |
| `src/` | Chrome 扩展 | Chrome 扩展 ZIP / Chrome Web Store |
| `obsidian/` | Obsidian 插件 | Obsidian 插件文件 |
| `docs/archive/` | 已完成的设计、计划和历史评估 | 不参与构建 |

## 构建边界

- Windows 和 Linux 使用 `desktop/`，Linux 不承诺 Windows 的卡片拖拽体验。
- Android 使用 `android/`，通过系统 `ACTION_PROCESS_TEXT` 文本菜单触发，不使用悬浮窗或无障碍服务。
- `dist/`、`desktop/dist/`、`android/.gradle/` 和 `android/app/build/` 都是构建产物或缓存，不属于源码，不提交到 Git。
- 发布包只从对应平台的构建目录生成并上传 Release，不把历史包混入源码目录。

## Android 触发边界

Android 版本已实现标准的 `PROCESS_TEXT` 入口，并额外注册文本分享入口。它能出现在支持 Android 标准文本选择菜单的应用中；使用自定义选择菜单、受保护文本、部分 WebView 或不暴露选中文本的应用不会显示 Flash Translate，这属于系统入口边界，不是 APK 没有启动。
