#!/usr/bin/env python3
"""Block 47: import eight checksum-verified 2022 facilities JPEGs from a private offline ZIP.

Never executes PHP, extracts arbitrary ZIP entries, or changes website pages.
Source archive is NEVER committed. Run only with owner-authorized Block47 ZIP.
"""
import argparse
import hashlib
import os
from pathlib import Path
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PREFIX = "public/wp-content/uploads/2022/04/"
EXPECTED = {
    "Bona-Fide-Facilities-1.jpg": ("6a3b3516a7a453b0ca0e8a62876ba379208cf6ac613f9305e069580c80c790e2", 117511),
    "Bona-Fide-Facilities-2.jpg": ("78fda5b7e5f649b6dac8990b6a687d599caa38035a2fde436545dd944804562a", 63212),
    "Bona-Fide-Facilities-3.jpg": ("39b04c8f9e45ecae1b05a6fc8c94624b72140bbb54d78ebc0be19dbe497298d1", 185310),
    "Bona-Fide-Facilities-4.jpg": ("97f73950a2aa317c23f11bfae31003d6d35236e1cfaeea60e7acda2f378eb728", 86571),
    "Bona-Fide-Facilities-5.jpg": ("2d33b56968e7559c93634d748fbc9430b1898eb642e56331512b20d00b4c9b6e", 143331),
    "Bona-Fide-Facilities-6.jpg": ("9433e5c31f8ac6f18c739d1bda16c98eb370d06517750904f3f1529e6a600d6d", 243882),
    "Bona-Fide-Facilities-7.jpg": ("aff1bbc4234843b5e563bd0a6da0bd0cfd414f62b5608b5fb81a1398442b9988", 154320),
    "Bona-Fide-Facilities-8.jpg": ("03bcbeb0031632459ee1bff32869fda6117fc356241238e09f7a268180d90692", 77928),
}

def import_verified(archive: Path, root: Path, dry_run=False):
    if not archive.is_file():
        raise ValueError(f"Missing private source archive: {archive}")
    verified = {}
    with zipfile.ZipFile(archive) as z:
        for filename, (expected_hash, expected_size) in EXPECTED.items():
            entry = SOURCE_PREFIX + filename
            infos = [i for i in z.infolist() if i.filename == entry]
            if len(infos) != 1:
                raise ValueError(f"Expected exactly one entry for {entry}; found {len(infos)}")
            info = infos[0]
            if info.file_size != expected_size or info.file_size > 300_000:
                raise ValueError(f"Unexpected byte count for {entry}")
            raw = z.read(info)
            if len(raw) != expected_size or hashlib.sha256(raw).hexdigest() != expected_hash:
                raise ValueError(f"SHA-256 verification failed for {entry}")
            if not raw.startswith(bytes.fromhex("ffd8ff")) or not raw.endswith(bytes.fromhex("ffd9")):
                raise ValueError(f"Not a complete JPEG: {entry}")
            verified[filename] = raw
    # Verify ALL inputs and existing files before writing ANY output.
    destdir = root / SOURCE_PREFIX
    for filename, data in verified.items():
        dst = destdir / filename
        if dst.is_symlink():
            raise ValueError(f"Refusing symlink destination: {dst}")
        if dst.exists() and dst.read_bytes() != data:
            raise ValueError(f"Existing destination differs: {dst}")
    if dry_run:
        return len(verified)
    destdir.mkdir(parents=True, exist_ok=True)
    for filename, data in verified.items():
        dst = destdir / filename
        if dst.exists():
            continue
        with tempfile.NamedTemporaryFile(mode="wb", dir=destdir, prefix=".block47-", delete=False) as f:
            f.write(data)
            tmp = Path(f.name)
        try:
            os.replace(tmp, dst)
        finally:
            tmp.unlink(missing_ok=True)
    return len(verified)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--archive", type=Path, required=True, help="Private Block47 ZIP, never committed")
    ap.add_argument("--root", type=Path, default=ROOT)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    try:
        n = import_verified(args.archive, args.root, args.dry_run)
        print(f"OK: {n} original JPGs SHA-256 verified" + (" (dry run)" if args.dry_run else " and imported"))
    except (OSError, zipfile.BadZipFile, ValueError) as e:
        ap.exit(2, f"ERROR: {e}\n")
