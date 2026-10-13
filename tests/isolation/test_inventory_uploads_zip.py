"""Offline coverage for scripts/inventory_uploads_zip.py (Block 46, Issue #109). Synthetic ZIPs only."""

import contextlib
import importlib.util
import io
import json
import os
import stat
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location("inventory_uploads_zip", REPO_ROOT / "scripts" / "inventory_uploads_zip.py")
inv = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = inv
_spec.loader.exec_module(inv)

TARGETS = [
    {"manifestPath": "/wp-content/uploads/2018/06/Kegerator-counter-top-Bona-Fide.jpg",
     "uploadsRelative": "2018/06/Kegerator-counter-top-Bona-Fide.jpg", "group": "ranking"},
    {"manifestPath": "/wp-content/uploads/2022/05/CULT-Coffee-Comapany-Nitro-by-Bona-Fide.png",
     "uploadsRelative": "2022/05/CULT-Coffee-Comapany-Nitro-by-Bona-Fide.png", "group": "alliance"},
    {"manifestPath": "/wp-content/uploads/2017/10/Hair-Raiser-Nitro-Coffee-for-website.png",
     "uploadsRelative": "2017/10/Hair-Raiser-Nitro-Coffee-for-website.png", "group": "ranking"},
]


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "u.zip"

    def make(self, entries, symlinks=()):
        with zipfile.ZipFile(self.path, "w") as z:
            for name, data in entries:
                z.writestr(name, data)
            for name in symlinks:
                zi = zipfile.ZipInfo(name)
                zi.create_system = 3
                zi.external_attr = (stat.S_IFLNK | 0o777) << 16
                z.writestr(zi, "/etc/passwd")
        return self.path


class InventoryTests(Base):
    def test_normal_exact_and_extension_counts(self):
        self.make([("2018/06/Kegerator-counter-top-Bona-Fide.jpg", b"x"), ("2018/06/a.PNG", b"yy"),
                   ("index.php", b"<?php")])
        r = inv.inventory(self.path, TARGETS)
        self.assertEqual(r["archiveEntryCount"], 3)
        self.assertEqual(r["extensionCounts"], {".jpg": 1, ".php": 1, ".png": 1})
        self.assertEqual(r["flagCounts"].get("php-file"), 1)
        m = r["matches"]["t7Manifest"][0]
        self.assertEqual(m["matchType"], "exact-manifest-path")
        self.assertEqual(r["matches"]["t7Manifest"][1]["matchType"], "none")

    def test_nested_prefix_still_exact(self):
        self.make([("site/wp-content/uploads/2018/06/Kegerator-counter-top-Bona-Fide.jpg", b"x")])
        r = inv.inventory(self.path, TARGETS)
        self.assertEqual(r["matches"]["t7Manifest"][0]["matchType"], "exact-manifest-path")
        self.assertEqual(r["nestedPrefixes"], {"site/wp-content/uploads": 1})

    def test_candidate_is_not_exact(self):
        self.make([("2019/01/CULT-Coffee-Comapany-Nitro-by-Bona-Fide-300x200.png", b"x"),
                   ("2020/keg-photo.jpg", b"x"), ("2021/Kegerator-x.jpg", b"x")])
        r = inv.inventory(self.path, TARGETS)
        m = r["matches"]["t7Manifest"][1]
        self.assertEqual(m["matchType"], "filename-candidate")
        self.assertEqual(m["exact"], [])
        fam = r["matches"]["documentedFamilies"]
        self.assertEqual(fam["keg-imagery"]["candidateCount"], 2)
        self.assertEqual(fam["kegerator-assets"]["candidateCount"], 1)
        self.assertEqual(fam["keg-imagery"]["matchType"], "family-candidate")

    def test_case_mismatch_is_not_exact(self):
        self.make([("2018/06/kegerator-counter-top-bona-fide.jpg", b"x")])
        m = inv.inventory(self.path, TARGETS)["matches"]["t7Manifest"][0]
        self.assertEqual(m["matchType"], "filename-candidate")

    def test_duplicates_unsafe_and_symlink(self):
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            self.make([("a/x.jpg", b"1"), ("a/x.jpg", b"2"), ("../evil.png", b"x"),
                       ("/abs/y.png", b"x"), ("c\\d.png", b"x")], symlinks=["link.png"])
        r = inv.inventory(self.path, TARGETS)
        self.assertEqual(r["duplicateNames"], ["a/x.jpg"])
        self.assertEqual(r["flagCounts"]["duplicate-name"], 2)
        self.assertEqual(r["flagCounts"]["path-traversal"], 1)
        self.assertEqual(r["flagCounts"]["absolute-path"], 1)
        self.assertEqual(r["flagCounts"]["symlink"], 1)
        self.assertEqual(r["flagCounts"]["backslash-separator"], 1)

    def test_unsafe_paths_never_matched(self):
        self.make([("../2018/06/Kegerator-counter-top-Bona-Fide.jpg", b"x")])
        m = inv.inventory(self.path, TARGETS)["matches"]["t7Manifest"][0]
        self.assertEqual(m["matchType"], "none")

    def test_nul_byte_name_flagged_not_truncated(self):
        self.make([("2018/06/safe.jpgXevil.php", b"x")])
        self.path.write_bytes(self.path.read_bytes().replace(b"jpgXevil", b"jpg\x00evil"))
        r = inv.inventory(self.path, TARGETS)
        self.assertEqual(r["flagCounts"].get("nul-byte"), 1)
        self.assertNotEqual(r["files"][0]["path"], "2018/06/safe.jpg")

    def test_bad_manifest_schema_is_inventory_error(self):
        bad = Path(self.tmp.name) / "m.json"
        for body in ('{"images": [{"group": "x"}]}', '{"images": [1]}', '{"images": {}}', '{"images": null}'):
            bad.write_text(body)
            with self.assertRaises(inv.InventoryError):
                inv.load_targets(bad)

    def test_empty_zip(self):
        self.make([])
        r = inv.inventory(self.path, TARGETS)
        self.assertEqual((r["archiveEntryCount"], r["fileCount"]), (0, 0))

    def test_invalid_and_missing(self):
        self.path.write_bytes(b"not a zip")
        with self.assertRaisesRegex(inv.InventoryError, "not a valid ZIP"):
            inv.inventory(self.path, TARGETS)
        with self.assertRaisesRegex(inv.InventoryError, "not found"):
            inv.inventory(Path(self.tmp.name) / "nope.zip", TARGETS)

    def test_max_entries(self):
        self.make([("a.jpg", b"x"), ("b.jpg", b"x")])
        with self.assertRaisesRegex(inv.InventoryError, "max-entries"):
            inv.inventory(self.path, TARGETS, max_entries=1)

    def test_undecodable_filename_is_inventory_error(self):
        self.make([("2018/06/aaaa.jpg", b"x")])
        data = self.path.read_bytes().replace(b"aaaa", b"\xff\xfe\xfd\xfc")
        # set UTF-8 flag (bit 11) in both local and central headers
        data = data.replace(b"PK\x03\x04\x14\x00\x00\x00", b"PK\x03\x04\x14\x00\x00\x08")
        data = data.replace(b"PK\x01\x02\x14\x03\x14\x00\x00\x00", b"PK\x01\x02\x14\x03\x14\x00\x00\x08")
        self.path.write_bytes(data)
        with self.assertRaises(inv.InventoryError):
            inv.inventory(self.path, TARGETS)

    def test_max_entries_checked_before_materializing(self):
        from unittest import mock
        self.make([("a.jpg", b"x"), ("b.jpg", b"x")])
        with mock.patch.object(zipfile.ZipFile, "__init__", side_effect=AssertionError("parsed")):
            with self.assertRaisesRegex(inv.InventoryError, "max-entries"):
                inv.inventory(self.path, TARGETS, max_entries=1)

    def test_never_reads_members(self):
        from unittest import mock
        self.make([("a.jpg", b"x")])
        names = ("read", "open", "extract", "extractall")
        patches = [mock.patch.object(zipfile.ZipFile, n) for n in names]
        mocks = [p.start() for p in patches]
        self.addCleanup(lambda: [p.stop() for p in patches])
        inv.inventory(self.path, TARGETS)
        for m in mocks:
            m.assert_not_called()

    def test_real_manifest_loads(self):
        t = inv.load_targets()
        self.assertEqual(len(t), 16)
        self.assertTrue(all(x["uploadsRelative"][:2] == "20" for x in t))


class CliTests(Base):
    def run_cli(self, argv):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            rc = inv.main(argv)
        return rc, out.getvalue(), err.getvalue()

    def test_cli_writes_json_and_summary(self):
        self.make([("2018/06/Kegerator-counter-top-Bona-Fide.jpg", b"x")])
        outp = Path(self.tmp.name) / "r.json"
        rc, out, _ = self.run_cli(["--archive", str(self.path), "--output", str(outp)])
        self.assertEqual(rc, 0)
        self.assertIn("exact-manifest-path", out)
        self.assertLessEqual(len(out.splitlines()), inv.MAX_PRINT_LINES)
        self.assertEqual(json.loads(outp.read_text())["fileCount"], 1)

    def test_cli_error_exit(self):
        self.path.write_bytes(b"junk")
        rc, _, err = self.run_cli(["--archive", str(self.path)])
        self.assertEqual(rc, 2)
        self.assertIn("error:", err)

    def test_cli_refuses_output_equal_to_archive(self):
        self.make([("2018/06/Kegerator-counter-top-Bona-Fide.jpg", b"x")])
        before = self.path.read_bytes()
        link = Path(self.tmp.name) / "alias.zip"
        link.symlink_to(self.path)
        for target in (self.path, link):
            rc, _, err = self.run_cli(["--archive", str(self.path), "--output", str(target)])
            self.assertEqual(rc, 2)
            self.assertIn("same file", err)
        self.assertEqual(self.path.read_bytes(), before)

    def test_cli_refuses_output_equal_to_manifest(self):
        self.make([])
        man = Path(self.tmp.name) / "m.json"
        man.write_text('{"images": []}')
        before = man.read_text()
        link = Path(self.tmp.name) / "m-alias.json"
        link.symlink_to(man)
        hard = Path(self.tmp.name) / "m-hard.json"
        os.link(man, hard)
        for target in (man, link, hard):
            rc, _, err = self.run_cli(["--archive", str(self.path), "--manifest", str(man), "--output", str(target)])
            self.assertEqual(rc, 2)
            self.assertIn("same file as --manifest", err)
        self.assertEqual(man.read_text(), before)

    def test_cli_bad_manifest_exit_2(self):
        self.make([])
        bad = Path(self.tmp.name) / "m.json"
        bad.write_text('{"images": [{"group": "x"}]}')
        rc, _, err = self.run_cli(["--archive", str(self.path), "--manifest", str(bad)])
        self.assertEqual(rc, 2)
        self.assertIn("error:", err)

    def test_cli_refuses_public_output(self):
        self.make([])
        rc, _, err = self.run_cli(["--archive", str(self.path), "--output", str(REPO_ROOT / "public" / "r.json")])
        self.assertEqual(rc, 2)
        self.assertFalse((REPO_ROOT / "public" / "r.json").exists())


if __name__ == "__main__":
    unittest.main()
