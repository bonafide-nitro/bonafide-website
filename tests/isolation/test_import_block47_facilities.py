"""Offline coverage for scripts/import_block47_facilities.py (Block 47). Synthetic ZIPs only; no real assets."""

import hashlib
import importlib.util
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location("import_block47_facilities", REPO_ROOT / "scripts" / "import_block47_facilities.py")
imp = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = imp
_spec.loader.exec_module(imp)

NAMES = [f"Bona-Fide-Facilities-{i}.jpg" for i in range(1, 9)]


def fake_jpeg(i):
    return bytes.fromhex("ffd8ff") + f"synthetic-{i}".encode() + bytes.fromhex("ffd9")


class ConstantsTest(unittest.TestCase):
    def test_expected_table_shape(self):
        self.assertEqual(list(imp.EXPECTED), NAMES)
        self.assertEqual(imp.SOURCE_PREFIX, "public/wp-content/uploads/2022/04/")
        for digest, size in imp.EXPECTED.values():
            self.assertRegex(digest, r"^[0-9a-f]{64}$")
            self.assertTrue(0 < size <= 300_000)
        self.assertEqual(len({d for d, _ in imp.EXPECTED.values()}), 8)


class ImportTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.root = self.base / "repo"
        self.root.mkdir()
        self.zip = self.base / "src.zip"
        self.files = {n: fake_jpeg(i) for i, n in enumerate(NAMES, 1)}
        saved = imp.EXPECTED
        imp.EXPECTED = {n: (hashlib.sha256(d).hexdigest(), len(d)) for n, d in self.files.items()}
        self.addCleanup(setattr, imp, "EXPECTED", saved)
        self.dest = self.root / imp.SOURCE_PREFIX

    def write_zip(self, overrides=None, drop=(), extra=()):
        files = dict(self.files)
        files.update(overrides or {})
        with zipfile.ZipFile(self.zip, "w") as z:
            for n, d in files.items():
                if n not in drop:
                    z.writestr(imp.SOURCE_PREFIX + n, d)
            for n, d in extra:
                z.writestr(n, d)

    def test_imports_all_eight(self):
        self.write_zip(extra=[("wp-config.php", b"<?php secret"), ("other.txt", b"x")])
        self.assertEqual(imp.import_verified(self.zip, self.root), 8)
        self.assertEqual(sorted(p.name for p in self.dest.iterdir()), NAMES)
        for n, d in self.files.items():
            self.assertEqual((self.dest / n).read_bytes(), d)
        self.assertFalse((self.root / "wp-config.php").exists())

    def test_dry_run_writes_nothing(self):
        self.write_zip()
        self.assertEqual(imp.import_verified(self.zip, self.root, dry_run=True), 8)
        self.assertFalse(self.dest.exists())

    def test_idempotent_rerun(self):
        self.write_zip()
        imp.import_verified(self.zip, self.root)
        self.assertEqual(imp.import_verified(self.zip, self.root), 8)

    def test_missing_archive(self):
        with self.assertRaises(ValueError):
            imp.import_verified(self.base / "nope.zip", self.root)

    def test_missing_member(self):
        self.write_zip(drop=[NAMES[3]])
        with self.assertRaisesRegex(ValueError, "exactly one entry"):
            imp.import_verified(self.zip, self.root)
        self.assertFalse(self.dest.exists())

    def test_duplicate_member(self):
        with self.assertWarns(UserWarning):
            self.write_zip(extra=[(imp.SOURCE_PREFIX + NAMES[0], self.files[NAMES[0]])])
        with self.assertRaisesRegex(ValueError, "exactly one entry"):
            imp.import_verified(self.zip, self.root)

    def test_hash_mismatch_same_size_writes_nothing(self):
        bad = bytearray(self.files[NAMES[2]])
        bad[5] ^= 0xFF
        self.write_zip(overrides={NAMES[2]: bytes(bad)})
        with self.assertRaisesRegex(ValueError, "SHA-256|byte count"):
            imp.import_verified(self.zip, self.root)
        self.assertFalse(self.dest.exists())

    def test_wrong_size_rejected(self):
        self.write_zip(overrides={NAMES[0]: self.files[NAMES[0]] + b"0"})
        with self.assertRaisesRegex(ValueError, "byte count"):
            imp.import_verified(self.zip, self.root)

    def test_non_jpeg_with_matching_hash_rejected(self):
        data = b"NOTJPEG-body"
        self.write_zip(overrides={NAMES[1]: data})
        imp.EXPECTED[NAMES[1]] = (hashlib.sha256(data).hexdigest(), len(data))
        with self.assertRaisesRegex(ValueError, "complete JPEG"):
            imp.import_verified(self.zip, self.root)

    def test_existing_differing_file_blocks_all_writes(self):
        self.write_zip()
        self.dest.mkdir(parents=True)
        (self.dest / NAMES[7]).write_bytes(b"different")
        with self.assertRaisesRegex(ValueError, "differs"):
            imp.import_verified(self.zip, self.root)
        self.assertEqual([p.name for p in self.dest.iterdir()], [NAMES[7]])
        self.assertEqual((self.dest / NAMES[7]).read_bytes(), b"different")

    def test_symlink_destination_rejected(self):
        self.write_zip()
        self.dest.mkdir(parents=True)
        target = self.base / "elsewhere"
        target.write_bytes(self.files[NAMES[0]])
        (self.dest / NAMES[0]).symlink_to(target)
        with self.assertRaisesRegex(ValueError, "symlink"):
            imp.import_verified(self.zip, self.root)

    def test_symlinked_parent_directory_rejected(self):
        self.write_zip()
        outside = self.base / "outside"
        outside.mkdir()
        (self.root / "public").symlink_to(outside, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "symlink destination ancestor"):
            imp.import_verified(self.zip, self.root)
        self.assertEqual(list(outside.iterdir()), [])

    def test_no_temp_files_left(self):
        self.write_zip()
        imp.import_verified(self.zip, self.root)
        self.assertFalse(list(self.dest.glob(".block47-*")))


if __name__ == "__main__":
    unittest.main()
