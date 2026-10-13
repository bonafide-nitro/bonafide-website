#!/usr/bin/env python3
"""
Read-only, offline inventory of an owner-supplied WordPress `wp-content/uploads` ZIP.

Block 46 (Issue #109). Python 3 standard library only.

Safety contract:
- Reads ONLY the ZIP central directory (`zipfile.ZipFile.infolist()`); it never
  calls `extract*`, `open`, or `read` on a member, so no member is extracted,
  decompressed, previewed or executed (PHP included).
- Archive symlinks are flagged, never followed.
- No network access, no credentials, no writes into the repository.
- The source ZIP is never copied or committed.

A match is evidence of a candidate file only. It does NOT prove the original
WordPress URL, the alt text, or that an archive filename equals an SEO-ranked
URL. Later ingestion requires explicit inspection of the matched binaries.

Usage:
    python3 scripts/inventory_uploads_zip.py --archive PATH [--output PATH.json]
"""

import argparse
import json
import os
import posixpath
import re
import stat
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = REPO_ROOT / "qa" / "t7-image-manifest.json"

SCHEMA_VERSION = 1
MAX_PRINT_LINES = 60
MAX_CANDIDATES_PER_TARGET = 10
DEFAULT_MAX_ENTRIES = 2_000_000

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif", ".bmp", ".tif", ".tiff"}
# WordPress thumbnail suffix, e.g. photo-300x200.jpg or photo-scaled.jpg
_SIZE_SUFFIX = re.compile(r"-(\d+x\d+|scaled|rotated)$", re.I)

# Documented, currently unresolved imagery (docs/migration/41-block45-stage8-blocker-status.md).
# Family tokens are only used to produce *candidates*, never exact matches.
FAMILIES = {
    "facilities-2-8": ["facilit", "facility", "roast", "warehouse"],
    "keg-imagery": ["keg"],
    "kegerator-assets": ["kegerator"],
    "ranking-image-family": ["nitro-coffee-explain-graphic", "explain-graphic"],
}


class InventoryError(Exception):
    """Clear, user-facing failure (corrupt archive, too large, bad manifest)."""


def classify_name(raw):
    """Return (normalized_path_or_None, flags, unsafe) for a raw member name."""
    flags = []
    name = raw.replace("\\", "/")
    if "\\" in raw:
        flags.append("backslash-separator")
    if "\x00" in name:
        flags.append("nul-byte")
    if name.startswith("/") or re.match(r"^[A-Za-z]:", name):
        flags.append("absolute-path")
    parts = [p for p in name.split("/") if p not in ("", ".")]
    if ".." in parts:
        flags.append("path-traversal")
    unsafe = any(f in flags for f in ("nul-byte", "absolute-path", "path-traversal"))
    return ("/".join(parts) if parts else None), flags, unsafe


def uploads_relative(path):
    """Strip any nested prefix up to and including `wp-content/uploads/` (or `uploads/`)."""
    low = path.lower()
    for marker in ("wp-content/uploads/", "uploads/"):
        idx = low.find(marker)
        if idx != -1 and (idx == 0 or low[idx - 1] == "/"):
            return path[idx + len(marker):], path[: idx + len(marker) - 1]
    return path, ""


def stem_key(filename):
    stem, _ = posixpath.splitext(filename)
    return _SIZE_SUFFIX.sub("", stem).lower()


def load_targets(manifest_path=MANIFEST_PATH):
    try:
        manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
        images = manifest["images"]
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise InventoryError(f"cannot read T7 manifest {manifest_path}: {exc!r}")
    if not isinstance(images, list):
        raise InventoryError(f"T7 manifest {manifest_path}: 'images' must be a list")
    targets = []
    for i, img in enumerate(images):
        if not isinstance(img, dict) or not isinstance(img.get("path"), str):
            raise InventoryError(
                f"T7 manifest {manifest_path}: images[{i}] must be an object with a string 'path'"
            )
        p = img["path"]
        rel, _ = uploads_relative(p.lstrip("/"))
        targets.append({"manifestPath": p, "uploadsRelative": rel, "group": img.get("group", "")})
    return targets


def _check_entry_cap(archive, max_entries):
    """Refuse before ZipFile materializes every ZipInfo, using the end-of-directory count."""
    try:
        with open(archive, "rb") as fp:
            rec = zipfile._EndRecData(fp)  # EOCD (+ zip64 locator) only; no member data
    except OSError:
        return  # let ZipFile report open errors
    if not rec:
        return  # let ZipFile report BadZipFile
    total = rec[zipfile._ECD_ENTRIES_TOTAL]
    if total > max_entries:
        raise InventoryError(
            f"archive has {total} entries, above --max-entries {max_entries}; refusing"
        )


def _same_file(a, b):
    a, b = Path(a), Path(b)
    if a.resolve() == b.resolve():
        return True
    return a.exists() and b.exists() and os.path.samefile(a, b)


def inventory(archive, targets, max_entries=DEFAULT_MAX_ENTRIES):
    archive = Path(archive)
    if not archive.is_file():
        raise InventoryError(f"archive not found or not a file: {archive}")
    try:
        _check_entry_cap(archive, max_entries)
        zf = zipfile.ZipFile(archive, "r")
    except zipfile.BadZipFile as exc:
        raise InventoryError(f"not a valid ZIP archive: {exc}")
    except UnicodeDecodeError as exc:
        raise InventoryError(f"corrupt ZIP central directory (undecodable filename): {exc}")
    except OSError as exc:
        raise InventoryError(f"cannot open archive: {exc}")

    with zf:
        infos = zf.infolist()  # central directory only
        if len(infos) > max_entries:
            raise InventoryError(
                f"archive has {len(infos)} entries, above --max-entries {max_entries}; refusing"
            )
        files = []
        ext_counts = Counter()
        seen = defaultdict(int)
        prefixes = Counter()
        flag_counts = Counter()
        for info in infos:
            # orig_filename keeps bytes after a NUL that ZipInfo.filename truncates.
            raw = info.orig_filename
            norm, flags, unsafe = classify_name(raw)
            is_dir = raw.endswith("/") or info.is_dir()
            mode = (info.external_attr >> 16) & 0xFFFF
            if mode and stat.S_ISLNK(mode):
                flags.append("symlink")
            if info.flag_bits & 0x1:
                flags.append("encrypted")
            if norm is None:
                continue
            if is_dir:
                continue
            rel, prefix = uploads_relative(norm)
            if prefix:
                prefixes[prefix] += 1
            key = norm.lower()
            seen[key] += 1
            ext = posixpath.splitext(norm)[1].lower()
            ext_counts[ext or "(none)"] += 1
            if ext == ".php" or ext == ".phtml":
                flags.append("php-file")
            files.append({
                "path": norm,
                "uploadsRelative": rel,
                "ext": ext or "(none)",
                "size": info.file_size,
                "compressedSize": info.compress_size,
                "isImage": ext in IMAGE_EXTS,
                "flags": sorted(set(flags)),
            })
        duplicates = sorted(k for k, n in seen.items() if n > 1)
        dupset = set(duplicates)
        for f in files:
            if f["path"].lower() in dupset:
                f["flags"] = sorted(set(f["flags"]) | {"duplicate-name"})
            for fl in f["flags"]:
                flag_counts[fl] += 1

    return {
        "schemaVersion": SCHEMA_VERSION,
        "archiveName": archive.name,
        "archiveEntryCount": len(infos),
        "fileCount": len(files),
        "totalUncompressedBytes": sum(f["size"] for f in files),
        "extensionCounts": dict(sorted(ext_counts.items())),
        "nestedPrefixes": dict(prefixes),
        "flagCounts": dict(sorted(flag_counts.items())),
        "duplicateNames": duplicates,
        "files": files,
        "matches": match_targets(files, targets),
        "disclaimer": (
            "Matches identify candidate archive files only. They do not prove the original "
            "WordPress URL, alt text, or ranking URL. exact-manifest-path = the uploads-relative "
            "path equals a path in qa/t7-image-manifest.json (case-sensitive); family-candidate "
            "= filename stem or keyword similarity only. Inspect binaries before any import."
        ),
    }


def match_targets(files, targets):
    images = [f for f in files if f["isImage"] and "path-traversal" not in f["flags"]
              and "absolute-path" not in f["flags"] and "nul-byte" not in f["flags"]]
    by_rel = defaultdict(list)
    by_stem = defaultdict(list)
    for f in images:
        by_rel[f["uploadsRelative"]].append(f["path"])
        by_stem[stem_key(posixpath.basename(f["uploadsRelative"]))].append(f["path"])

    t7 = []
    for t in targets:
        exact = by_rel.get(t["uploadsRelative"], [])
        cands = []
        if not exact:
            cands = [p for p in by_stem.get(stem_key(posixpath.basename(t["uploadsRelative"])), [])]
        t7.append({
            "manifestPath": t["manifestPath"],
            "group": t["group"],
            "matchType": "exact-manifest-path" if exact else ("filename-candidate" if cands else "none"),
            "exact": exact[:MAX_CANDIDATES_PER_TARGET],
            "candidates": cands[:MAX_CANDIDATES_PER_TARGET],
        })

    families = {}
    for name, tokens in FAMILIES.items():
        hits = [f["path"] for f in images if any(tok in f["path"].lower() for tok in tokens)]
        families[name] = {
            "matchType": "family-candidate" if hits else "none",
            "candidateCount": len(hits),
            "candidates": sorted(hits)[:MAX_CANDIDATES_PER_TARGET * 3],
        }
    return {"t7Manifest": t7, "documentedFamilies": families}


def summarize(report, output_path=None):
    lines = [
        f"Archive: {report['archiveName']}",
        f"Entries: {report['archiveEntryCount']}  files: {report['fileCount']}  "
        f"uncompressed bytes: {report['totalUncompressedBytes']}",
        "Extensions: " + ", ".join(f"{k}={v}" for k, v in report["extensionCounts"].items()),
        "Flags: " + (", ".join(f"{k}={v}" for k, v in report["flagCounts"].items()) or "none"),
        f"Duplicate member names: {len(report['duplicateNames'])}",
        "Nested prefixes: " + (", ".join(report["nestedPrefixes"]) or "none"),
        "T7 manifest matches:",
    ]
    for m in report["matches"]["t7Manifest"]:
        lines.append(f"  [{m['matchType']}] {m['manifestPath']}")
    lines.append("Documented families (candidates only):")
    for name, fam in report["matches"]["documentedFamilies"].items():
        lines.append(f"  {name}: {fam['candidateCount']} candidate(s)")
    lines.append("Matches are candidates; they do not prove original URL or alt.")
    if output_path:
        lines.append(f"Full JSON written to: {output_path}")
    if len(lines) > MAX_PRINT_LINES:
        lines = lines[:MAX_PRINT_LINES - 1] + ["... (truncated; see JSON)"]
    return "\n".join(lines)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--archive", required=True, help="path to an offline uploads ZIP (never extracted)")
    ap.add_argument("--output", help="JSON output path (keep outside the repo or gitignored)")
    ap.add_argument("--manifest", default=str(MANIFEST_PATH), help="T7 image manifest JSON")
    ap.add_argument("--max-entries", type=int, default=DEFAULT_MAX_ENTRIES)
    args = ap.parse_args(argv)
    try:
        targets = load_targets(args.manifest)
        if args.output:
            out = Path(args.output).resolve()
            if _same_file(out, args.archive):
                raise InventoryError("--output must not be the same file as --archive")
            if _same_file(out, args.manifest):
                raise InventoryError("--output must not be the same file as --manifest")
        report = inventory(args.archive, targets, args.max_entries)
        if args.output:
            if REPO_ROOT in out.parents and "public" in out.relative_to(REPO_ROOT).parts[:1]:
                raise InventoryError("refusing to write into public/")
            out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    except InventoryError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    except OSError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    print(summarize(report, args.output))
    return 0


if __name__ == "__main__":
    sys.exit(main())
