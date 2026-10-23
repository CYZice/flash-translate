"""Stage the Linux desktop application and package it with native dpkg-deb."""

import argparse
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEPENDENCIES = (
    "libasound2 | libasound2t64, libatk1.0-0 | libatk1.0-0t64, "
    "libatk-bridge2.0-0 | libatk-bridge2.0-0t64, libatspi2.0-0 | libatspi2.0-0t64, "
    "libcairo2, libcups2 | libcups2t64, libdbus-1-3, libdrm2, libevdev2, "
    "libexpat1, libgbm1, libgcc-s1, libglib2.0-0 | libglib2.0-0t64, "
    "libgtk-3-0 | libgtk-3-0t64, libnspr4, libnss3, libpango-1.0-0, "
    "libstdc++6 (>= 11), libudev1, libwayland-client0, libx11-6, libx11-xcb1, "
    "libxcb1, libxcomposite1, libxdamage1, libxext6, libxfixes3, "
    "libxkbcommon0, libxrandr2, libxss1, libxtst6"
)
LAUNCHER = """[Desktop Entry]
Type=Application
Name=Flash Translate
Comment=Global selection translation
Exec=/opt/flash-translate/FlashTranslate
Icon=flash-translate
Terminal=false
Categories=Utility;Education;
StartupWMClass=Flash Translate
"""
POSTINST = """#!/bin/sh
set -e
if [ "$1" = configure ]; then
  chown root:root /opt/flash-translate/chrome-sandbox
  chmod 4755 /opt/flash-translate/chrome-sandbox
  if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database /usr/share/applications
  fi
fi
"""
POSTRM = """#!/bin/sh
set -e
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database /usr/share/applications
fi
"""


def copy(source, destination):
    if source.is_dir():
        shutil.copytree(source, destination, symlinks=True)
    else:
        shutil.copy2(source, destination, follow_symlinks=False)


def glibc_requirement(binaries):
    versions = [(2, 31)]
    for binary in binaries:
        output = subprocess.check_output(
            ["readelf", "--version-info", str(binary)], text=True
        )
        versions.extend(
            tuple(map(int, version.split(".")))
            for version in re.findall(r"\bGLIBC_(\d+\.\d+)\b", output)
        )
    return ".".join(map(str, max(versions)))


def build(runtime, native_module, revision):
    manifest = json.loads((ROOT / "package.json").read_text())
    version = f"{manifest['version']}-{revision}"
    output = ROOT / "dist" / f"flash-translate_{version}_amd64.deb"
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite {output}")
    architecture = subprocess.check_output(["dpkg", "--print-architecture"], text=True).strip()
    if architecture != "amd64":
        raise ValueError("This package currently targets amd64 only")
    if (runtime / "FlashTranslate").read_bytes()[:4] != b"\x7fELF":
        raise ValueError("Supply a Linux runtime, not a Windows portable build")

    with tempfile.TemporaryDirectory(prefix="flash-translate-deb-") as temporary:
        stage = Path(temporary) / "package"
        application = stage / "opt/flash-translate"
        application.mkdir(parents=True)
        for item in runtime.iterdir():
            if item.name not in {"data", "resources", "FlashTranslate.desktop", "README.md"}:
                copy(item, application / item.name)
        resources = application / "resources"
        resources.mkdir()
        for item in (runtime / "resources").iterdir():
            if item.name != "app":
                copy(item, resources / item.name)
        app = resources / "app"
        app.mkdir()
        shutil.copytree(ROOT / "src", app / "src", ignore=shutil.ignore_patterns("*.test.cjs"))
        shutil.copytree(runtime / "resources/app/node_modules", app / "node_modules", symlinks=True)
        (app / "package.json").write_text(json.dumps({
            key: manifest[key] for key in ("name", "version", "main", "dependencies")
        }, indent=2) + "\n")
        hook = app / "node_modules/selection-hook"
        if native_module:
            if native_module.read_bytes()[:4] != b"\x7fELF":
                raise ValueError("The native module must be a Linux ELF binary")
            target = hook / "build/Release/selection-hook.node"
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(native_module, target)
        native_binary = hook / "build/Release/selection-hook.node"
        if not native_binary.is_file():
            native_binary = hook / "prebuilds/linux-x64/selection-hook.node"
        minimum_glibc = glibc_requirement([application / "FlashTranslate", native_binary])

        launcher = stage / "usr/share/applications/flash-translate.desktop"
        launcher.parent.mkdir(parents=True)
        launcher.write_text(LAUNCHER)
        icon = stage / "usr/share/icons/hicolor/256x256/apps/flash-translate.png"
        icon.parent.mkdir(parents=True)
        shutil.copyfile(ROOT / "src/assets/icon.png", icon)
        for item in stage.rglob("*"):
            if not item.is_symlink():
                item.chmod(0o755 if item.is_dir() else 0o644)
        for name in ("FlashTranslate", "chrome_crashpad_handler"):
            (application / name).chmod(0o755)
        (application / "chrome-sandbox").chmod(0o4755)
        size = sum(p.stat().st_size for p in stage.rglob("*") if p.is_file())
        control = stage / "DEBIAN"
        control.mkdir(mode=0o755)
        (control / "control").write_text(
            f"Package: flash-translate\nVersion: {version}\nSection: utils\n"
            "Priority: optional\nArchitecture: amd64\n"
            "Maintainer: Flash Translate <flash-translate@users.noreply.github.com>\n"
            f"Installed-Size: {math.ceil(size / 1024)}\n"
            f"Depends: libc6 (>= {minimum_glibc}), {DEPENDENCIES}\n"
            "Description: Flash Translate desktop companion\n"
            " Global selection translation with a compact result card.\n"
        )
        (control / "control").chmod(0o644)
        for name, script in (("postinst", POSTINST), ("postrm", POSTRM)):
            file = control / name
            file.write_text(script)
            file.chmod(0o755)
        output.parent.mkdir(exist_ok=True)
        subprocess.run(["dpkg-deb", "--root-owner-group", "-Zxz", "-z6",
                        "--build", str(stage), str(output)], check=True)
    subprocess.run([sys.executable, str(ROOT / "scripts/test-deb.py"), str(output)], check=True)
    print(f"Built and validated {output} (glibc >= {minimum_glibc})", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime", required=True, type=Path, help="Existing Linux portable folder")
    parser.add_argument("--native-module", type=Path, help="Source-built Linux selection-hook.node")
    parser.add_argument("--revision", default="1")
    args = parser.parse_args()
    if sys.platform != "linux":
        parser.error("Run under Linux or WSL; native dpkg-deb and readelf are required")
    if not re.fullmatch(r"[1-9][0-9]*", args.revision):
        parser.error("revision must be a positive integer")
    build(args.runtime.resolve(), args.native_module.resolve() if args.native_module else None, args.revision)
