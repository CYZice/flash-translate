#!/bin/sh
# Run only in a disposable Debian/Ubuntu container or chroot.
set -eu
export LC_ALL=C

if [ "${FLASH_TRANSLATE_DISPOSABLE_TEST:-}" != 1 ] || [ "$(id -u)" != 0 ]; then
  echo 'Requires root in a disposable environment and FLASH_TRANSLATE_DISPOSABLE_TEST=1' >&2
  exit 1
fi

package=$(realpath "$1")
work=$(mktemp -d /var/tmp/flash-translate-install-test.XXXXXX)
mkdir -p "$work/shared/DEBIAN" "$work/shared/opt/flash-translate-shared-opt-test"
cat > "$work/shared/DEBIAN/control" <<'CONTROL'
Package: flash-translate-shared-opt-test
Version: 1
Architecture: all
Maintainer: Flash Translate <flash-translate@users.noreply.github.com>
Description: Shared opt directory installation regression fixture
CONTROL
printf 'shared-directory-sentinel\n' > "$work/shared/opt/flash-translate-shared-opt-test/sentinel"
dpkg-deb --root-owner-group --build "$work/shared" "$work/shared.deb"
dpkg -i "$work/shared.deb"

# Reproduce the user's failure, leaving the same half-installed package state.
if [ "$#" -gt 1 ]; then
  if dpkg --unpack "$2" > "$work/broken-install.log" 2>&1; then
    echo 'The known-broken package unexpectedly installed' >&2
    exit 1
  fi
  grep -E 'nondirectory|non-directory|not a directory' "$work/broken-install.log"
  echo 'PASS reproduced the shared /opt directory failure'
fi

DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "$package"
test "$(dpkg-query -W -f='${Status}' flash-translate)" = 'install ok installed'
test -d /opt
test -d /usr
test "$(cat /opt/flash-translate-shared-opt-test/sentinel)" = shared-directory-sentinel
test "$(stat -c '%a:%u:%g' /opt/flash-translate/chrome-sandbox)" = 4755:0:0
test -x /opt/flash-translate/FlashTranslate
test -x /opt/flash-translate/chrome_crashpad_handler
desktop-file-validate /usr/share/applications/flash-translate.desktop

for binary in /opt/flash-translate/FlashTranslate \
  /opt/flash-translate/resources/app/node_modules/selection-hook/build/Release/selection-hook.node; do
  dependencies=$(ldd "$binary")
  if printf '%s\n' "$dependencies" | grep 'not found'; then
    exit 1
  fi
done
ELECTRON_RUN_AS_NODE=1 /opt/flash-translate/FlashTranslate -e \
  'require("/opt/flash-translate/resources/app/node_modules/selection-hook"); console.log("PASS installed native module loads")'
echo 'PASS installation, launcher, native dependencies, ownership, and sandbox permissions'

# Reinstall exercises repeated maintainer scripts without changing their inputs.
dpkg -i "$package"
dpkg --remove flash-translate
test -d /opt
test -d /usr
test "$(cat /opt/flash-translate-shared-opt-test/sentinel)" = shared-directory-sentinel
test ! -e /usr/share/applications/flash-translate.desktop
echo 'PASS reinstall and removal preserve shared system directories'
dpkg -i "$package"
dpkg-query -W -f='${Package} ${Version} ${Status}\n' flash-translate
