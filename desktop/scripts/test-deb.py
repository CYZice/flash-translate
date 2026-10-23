"""Check the actual Debian artifact, not just the packaging source."""

import io
import sys
import tarfile
import unittest
from pathlib import Path, PurePosixPath


def read_members(package):
    with package.open("rb") as stream:
        if stream.read(8) != b"!<arch>\n":
            raise ValueError("Not a Debian ar archive")
        while header := stream.read(60):
            name = header[:16].decode("ascii").strip().rstrip("/")
            size = int(header[48:58])
            content = stream.read(size)
            if size % 2:
                stream.read(1)
            yield name, content


class DebianArtifactTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.archives = dict(read_members(PACKAGE))
        data_name = next(n for n in cls.archives if n.startswith("data.tar."))
        cls.data = tarfile.open(fileobj=io.BytesIO(cls.archives[data_name]))
        cls.members = {
            m.name.removeprefix("./").rstrip("/"): m
            for m in cls.data.getmembers()
        }
        control_name = next(n for n in cls.archives if n.startswith("control.tar."))
        cls.control = tarfile.open(fileobj=io.BytesIO(cls.archives[control_name]))

    @classmethod
    def tearDownClass(cls):
        cls.data.close()
        cls.control.close()

    def test_system_parents_are_real_directories(self):
        for name in ("opt", "opt/flash-translate", "usr", "usr/share",
                     "usr/share/applications", "usr/share/icons/hicolor/256x256/apps"):
            with self.subTest(path=name):
                self.assertTrue(self.members[name].isdir(), name)

    def test_every_parent_is_a_directory_and_paths_are_safe(self):
        invalid_parents = set()
        for name, member in self.members.items():
            with self.subTest(path=name):
                path = PurePosixPath(name)
                self.assertFalse(path.is_absolute())
                self.assertNotIn("..", path.parts)
                self.assertNotIn("\\", name)
                for parent in path.parents:
                    if str(parent) != ".":
                        self.assertIn(str(parent), self.members)
                        if not self.members[str(parent)].isdir():
                            invalid_parents.add(str(parent))
                self.assertEqual((member.uid, member.gid), (0, 0))
        self.assertEqual(invalid_parents, set())

    def test_runtime_executables_have_correct_permissions(self):
        for name, mode in (("FlashTranslate", 0o755),
                           ("chrome_crashpad_handler", 0o755),
                           ("chrome-sandbox", 0o4755)):
            with self.subTest(file=name):
                member = self.members["opt/flash-translate/" + name]
                self.assertTrue(member.isfile())
                self.assertEqual(member.mode, mode)
                self.assertEqual(self.data.extractfile(member).read(4), b"\x7fELF")

    def test_desktop_launcher_and_icon_exist(self):
        member = self.members["usr/share/applications/flash-translate.desktop"]
        launcher = self.data.extractfile(member).read().decode()
        self.assertIn("Exec=/opt/flash-translate/FlashTranslate\n", launcher)
        self.assertIn("Terminal=false\n", launcher)
        icon = next(line[5:] for line in launcher.splitlines() if line.startswith("Icon="))
        self.assertIn(icon, ("flash-translate", "/opt/flash-translate/flash-translate.png"))
        self.assertIn("usr/share/icons/hicolor/256x256/apps/flash-translate.png", self.members)

    def test_no_portable_user_data_or_foreign_native_binaries(self):
        for name in self.members:
            with self.subTest(path=name):
                self.assertFalse(name.startswith("opt/flash-translate/data"))
                self.assertNotIn("prebuilds/win32", name)
                self.assertNotIn("prebuilds/darwin", name)
                self.assertFalse(name.endswith(".test.cjs"))

    def test_control_has_meaningful_installed_size_and_dependencies(self):
        member = next(m for m in self.control if m.name.removeprefix("./") == "control")
        content = self.control.extractfile(member).read().decode()
        fields = dict(line.split(": ", 1) for line in content.splitlines()
                      if line and not line.startswith(" "))
        self.assertEqual(fields["Package"], "flash-translate")
        self.assertEqual(fields["Architecture"], "amd64")
        self.assertIn("libevdev2", fields["Depends"])
        self.assertRegex(fields["Depends"], r"libc6 \(>= \d+\.\d+\)")
        self.assertIn("Installed-Size", fields)
        self.assertGreater(int(fields["Installed-Size"]), 200000)


if __name__ == "__main__":
    PACKAGE = Path(sys.argv.pop(1))
    unittest.main()
