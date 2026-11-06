#!/usr/bin/env bash
# Issue #195: remote half of the manual GoDaddy STAGING deploy. Streamed over strict, fingerprint-pinned SSH by
# .github/workflows/godaddy-staging-deploy.yml (SHA-256 pinned there). Never run by an agent.
#
# Usage (on the server): STG_DOCROOT=<abs> [STG_AUTH_FILE=<abs>] [STG_ACCESS=basic|public] [STG_TARBALL_SHA256=<hex>] bash -s -- <preflight|install|rollback>
#   STG_ACCESS=public (Issue #198): public noindex staging, no Basic auth and no auth file; every other safety check is unchanged.
#   preflight  read-only: verifies the docroot is a safe, isolated staging path and the auth file exists. Writes nothing.
#   install    verifies + unpacks $parent/.bf-stg-incoming.tgz beside the docroot, then swaps it in with the previous docroot kept
#              as "<docroot>.bf-prev-<UTC timestamp>" (last 3 kept). The docroot is never edited in place.
#   rollback   swaps the newest protected backup back in; the replaced docroot is kept as "<docroot>.bf-rolledback-<ts>".
# Output is limited to fixed STAGING_* tokens: never a path, credential, file content or tool error text.
set -euo pipefail
set +x
umask 022

mode="${1:-}"
docroot="${STG_DOCROOT:-}"
authfile="${STG_AUTH_FILE:-}"
access="${STG_ACCESS:-basic}"
case "$access" in basic|public) ;; *) echo "STAGING_FAIL reason=bad-access"; exit 2 ;; esac
KEEP=3
MARKER=".bonafide-staging"

die() { echo "STAGING_FAIL reason=$1"; exit "${2:-2}"; }

# ---- path safety -------------------------------------------------------------------------------------------------------
[ -n "$docroot" ] || die missing-input
[ "$access" = public ] || [ -n "$authfile" ] || die missing-input
re='^/[A-Za-z0-9._/-]+$'
[[ "$docroot" =~ $re ]] || die docroot-charset
[ "$access" = public ] || [[ "$authfile" =~ $re ]] || die authfile-charset
case "$docroot" in */) die docroot-trailing-slash ;; esac
case "$docroot/" in */../*|*/./*|*//*) die docroot-dotsegment ;; esac
[ "$access" = public ] || case "$authfile/" in */../*|*/./*|*//*) die authfile-dotsegment ;; esac

home="$(cd ~ && pwd -P)"
pub="$home/public_html"
pub_real="$pub"
[ -e "$pub" ] && pub_real="$(cd "$pub" && pwd -P)"

within() { # within <child> <parent>: child is parent or below it
  case "$1/" in "$2"/*) return 0 ;; esac
  return 1
}
for seg in public_html htdocs www; do
  case "$docroot/" in */"$seg"/*) die docroot-in-webroot ;; esac
  [ "$access" = public ] || case "/$authfile/" in */"$seg"/*) die authfile-in-webroot ;; esac
done
within "$docroot" "$home" || die docroot-outside-home
[ "$docroot" != "$home" ] || die docroot-is-home
for p in "$pub" "$pub_real"; do
  within "$docroot" "$p" && die docroot-in-live-docroot
  within "$p" "$docroot" && die docroot-contains-live-docroot
done
if [ "$access" != public ]; then
  within "$authfile" "$home" || die authfile-outside-home
  within "$authfile" "$docroot" && die authfile-inside-docroot
  within "$authfile" "$pub" && die authfile-in-live-docroot
fi

parent="$(dirname "$docroot")"
[ -d "$parent" ] || die parent-missing
[ ! -L "$parent" ] || die parent-symlink
parent_real="$(cd "$parent" && pwd -P)"
[ "$parent_real" = "$parent" ] || die parent-not-canonical
within "$parent_real" "$pub_real" && die parent-in-live-docroot
[ -w "$parent" ] || die parent-not-writable
[ ! -L "$docroot" ] || die docroot-symlink
[ ! -e "$docroot" ] || [ -d "$docroot" ] || die docroot-not-directory
[ "$access" = public ] || { [ -f "$authfile" ] && [ ! -L "$authfile" ] && [ -s "$authfile" ] && [ -r "$authfile" ] || die authfile-unusable; }

# State of an existing docroot: our own tree, an empty cPanel-created one, or something we must not touch.
docroot_state() {
  if [ ! -e "$docroot" ]; then echo absent; return; fi
  if [ -f "$docroot/$MARKER" ] && [ ! -L "$docroot/$MARKER" ]; then echo ours; return; fi
  local entry
  while IFS= read -r entry; do
    case "$entry" in
      .well-known|cgi-bin|.htaccess|error_log|.ftpquota) ;;
      *) echo unknown; return ;;
    esac
  done < <(ls -A "$docroot")
  echo empty
}

backups() { # newest first; exact name pattern only, never symlinks
  local d
  for d in "$docroot".bf-prev-*; do
    [ -d "$d" ] && [ ! -L "$d" ] || continue
    case "${d#"$docroot".bf-prev-}" in [0-9]*Z) echo "$d" ;; esac
  done | sort -r
}

protected_tree() { # a tree we may serve: marker + auth + noindex header present, auth file not inside it
  local t="$1"
  [ -f "$t/$MARKER" ] && [ -f "$t/.htaccess" ] && [ ! -L "$t/.htaccess" ] || return 1
  grep -q 'X-Robots-Tag "noindex, nofollow"' "$t/.htaccess" || return 1
  grep -qE '^[[:space:]]*Require all denied$' "$t/.htaccess" || return 1
  # Public mode (Issue #198) needs only the server-enforced noindex header; basic mode additionally needs the auth lines.
  [ "$access" = public ] && return 0
  grep -qE '^[[:space:]]*AuthType Basic$' "$t/.htaccess" && grep -qE '^[[:space:]]*Require valid-user$' "$t/.htaccess" \
    && grep -qE '^[[:space:]]*AuthUserFile /' "$t/.htaccess"
}

state="$(docroot_state)"
[ "$state" != unknown ] || die docroot-unrecognized-content

case "$mode" in
preflight)
  avail_kb="$(df -Pk "$parent" | awk 'NR==2 {print $4}')"
  [ "${avail_kb:-0}" -gt 204800 ] || die low-disk
  echo "STAGING_PREFLIGHT_OK access=$access docroot_state=$state backups=$(backups | wc -l | tr -d ' ') live_docroot_untouched=yes"
  ;;

install)
  sha="${STG_TARBALL_SHA256:-}"
  [[ "$sha" =~ ^[0-9a-f]{64}$ ]] || die bad-tarball-sha
  tgz="$parent/.bf-stg-incoming.tgz"
  new="$parent/.bf-stg-new-$$"
  cleanup() { rm -rf "$new" "$tgz"; }
  trap cleanup EXIT
  [ -f "$tgz" ] && [ ! -L "$tgz" ] || die tarball-missing
  [ "$(sha256sum "$tgz" | awk '{print $1}')" = "$sha" ] || die tarball-sha-mismatch
  # Reject absolute/.. members and anything that is not a plain file or directory before extracting.
  tar -tzf "$tgz" > "$new.list" 2>/dev/null || { rm -f "$new.list"; die tarball-unreadable; }
  if grep -qE '(^/|(^|/)\.\.(/|$))' "$new.list"; then rm -f "$new.list"; die tarball-unsafe-path; fi
  rm -f "$new.list"
  if tar -tvzf "$tgz" 2>/dev/null | cut -c1 | grep -qvE '^[-d]$'; then die tarball-special-member; fi
  mkdir "$new"
  tar -xzf "$tgz" -C "$new" --no-same-owner --no-same-permissions 2>/dev/null || die tarball-extract
  protected_tree "$new" || die release-not-protected
  [ ! -e "$new/.well-known" ] || die release-contains-well-known
  # Keep AutoSSL/DCV material across the swap.
  if [ -d "$docroot/.well-known" ] && [ ! -L "$docroot/.well-known" ]; then cp -a "$docroot/.well-known" "$new/.well-known"; fi
  find "$new" -type d -exec chmod 755 {} +
  find "$new" -type f -exec chmod 644 {} +
  ts="$(date -u +%Y%m%dT%H%M%S%NZ)"
  backup="$docroot.bf-prev-$ts"
  [ ! -e "$backup" ] || die backup-exists
  if [ -e "$docroot" ]; then
    mv -T "$docroot" "$backup" || die swap-backup-failed
  fi
  if ! mv -T "$new" "$docroot"; then
    [ ! -e "$backup" ] || mv -T "$backup" "$docroot" || true
    die swap-failed
  fi
  trap - EXIT; rm -f "$tgz"
  n=0
  while IFS= read -r old; do
    n=$((n + 1))
    [ "$n" -le "$KEEP" ] || rm -rf -- "$old"
  done < <(backups)
  echo "STAGING_INSTALL_OK previous_docroot_state=$state backups_kept=$(backups | wc -l | tr -d ' ')"
  ;;

rollback)
  [ "$state" = ours ] || die rollback-docroot-not-ours
  target=""
  while IFS= read -r b; do
    if protected_tree "$b"; then target="$b"; break; fi
  done < <(backups)
  [ -n "$target" ] || die no-protected-backup
  ts="$(date -u +%Y%m%dT%H%M%S%NZ)"
  keep="$docroot.bf-rolledback-$ts"
  [ ! -e "$keep" ] || die backup-exists
  if [ -d "$docroot/.well-known" ] && [ ! -e "$target/.well-known" ]; then cp -a "$docroot/.well-known" "$target/.well-known"; fi
  mv -T "$docroot" "$keep" || die swap-backup-failed
  if ! mv -T "$target" "$docroot"; then mv -T "$keep" "$docroot" || true; die swap-failed; fi
  echo "STAGING_ROLLBACK_OK"
  ;;

*) die unknown-mode ;;
esac
