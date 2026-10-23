"use strict";
const fs = require("node:fs");
const path = require("node:path");

const requestedPlatform = process.argv[2] || process.platform;
const hostPlatform = process.platform;
const requestedNodePlatform =
  requestedPlatform === "windows" ? "win32" : requestedPlatform;
if (requestedNodePlatform !== hostPlatform) {
  throw new Error(
    `请在对应平台构建：当前是 ${hostPlatform}，请求的是 ${requestedPlatform}。`
  );
}
if (hostPlatform !== "win32" && hostPlatform !== "linux") {
  throw new Error("当前仅支持在 Windows 或 Linux 上构建对应的便携版。");
}
const root = path.resolve(__dirname, "..");
const manifest = require("../package.json");
const platform = hostPlatform;
const executableName =
  platform === "win32" ? "FlashTranslate.exe" : "FlashTranslate";
const output = path.join(
  root,
  "dist",
  `FlashTranslate-${manifest.version}-${platform}-${process.arch}`
);
if (fs.existsSync(output)) {
  throw new Error(`输出目录已存在，请先移走旧版本再构建：${output}`);
}
const electronDirectory = path.dirname(require("electron"));
fs.cpSync(electronDirectory, output, { recursive: true });
fs.renameSync(
  path.join(output, platform === "win32" ? "electron.exe" : "electron"),
  path.join(output, executableName)
);

const appDirectory = path.join(output, "resources", "app");
fs.mkdirSync(appDirectory, { recursive: true });
fs.cpSync(path.join(root, "src"), path.join(appDirectory, "src"), {
  recursive: true,
  filter: (file) => !file.endsWith(".test.cjs"),
});
fs.writeFileSync(
  path.join(appDirectory, "package.json"),
  JSON.stringify(
    {
      name: manifest.name,
      version: manifest.version,
      main: manifest.main,
      dependencies: manifest.dependencies,
    },
    null,
    2
  )
);

const copied = new Set();
function copyDependency(name) {
  if (copied.has(name)) {
    return;
  }
  let source = path.dirname(require.resolve(name, { paths: [root] }));
  while (!fs.existsSync(path.join(source, "package.json"))) {
    source = path.dirname(source);
  }
  const dependency = JSON.parse(
    fs.readFileSync(path.join(source, "package.json"), "utf8")
  );
  fs.cpSync(source, path.join(appDirectory, "node_modules", name), {
    recursive: true,
    filter: (file) => {
      const relative = path.relative(source, file).replaceAll("\\", "/");
      if (relative === "node_modules" || relative.startsWith("node_modules/")) {
        return false;
      }
      if (name === "selection-hook" && relative.startsWith("prebuilds/")) {
        return (
          relative === `prebuilds/${platform}-${process.arch}` ||
          relative.startsWith(`prebuilds/${platform}-${process.arch}/`)
        );
      }
      return true;
    },
  });
  copied.add(name);
  for (const child of Object.keys(dependency.dependencies || {})) {
    copyDependency(child);
  }
}
for (const name of Object.keys(manifest.dependencies)) {
  copyDependency(name);
}
fs.mkdirSync(path.join(output, "data"));
fs.copyFileSync(path.join(root, "README.md"), path.join(output, "README.md"));
if (platform === "linux") {
  fs.copyFileSync(
    path.join(root, "src", "assets", "icon.png"),
    path.join(output, "flash-translate.png")
  );
  fs.writeFileSync(
    path.join(output, "FlashTranslate.desktop"),
    `[Desktop Entry]\nType=Application\nName=Flash Translate\nComment=Global selection translation\nExec=sh -c \"cd \\\"$(dirname \\\"%k\\\")\\\" && exec env FLASH_TRANSLATE_PORTABLE=1 ./FlashTranslate\"\nIcon=flash-translate\nTerminal=false\nCategories=Utility;Education;\n`
  );
}
console.log(`便携版已生成：${output}\n运行 ${executableName} 启动，无需安装。`);
