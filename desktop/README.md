# Flash Translate desktop companion

This is the lightweight Windows-first global selection layer. It uses the MIT-licensed `selection-hook` native module to detect selected text in other applications, then displays a small Electron toolbar.

```bash
npm install
npm start
```

Configure the existing OpenAI-compatible provider through environment variables before starting:

```powershell
$env:FLASH_TRANSLATE_AI_BASE_URL = "http://localhost:11434/v1"
$env:FLASH_TRANSLATE_AI_MODEL = "qwen2.5:7b"
$env:FLASH_TRANSLATE_AI_KEY = ""
$env:FLASH_TRANSLATE_SOURCE_LANGUAGE = "auto"
$env:FLASH_TRANSLATE_TARGET_LANGUAGE = "Chinese"
npm start
```

The desktop companion is the single global selection path. It does not distinguish browser pages, Obsidian notes, or other applications. The browser extension and Obsidian plugin can remain installed during migration, but they are no longer required for global selection translation.
