#!/usr/bin/env bash
# Issue #185: inspect / clean up / read the failure status for ONE exact temporary test folder, and nothing else.
#   inspect     read-only: sanitized names + types + sizes + modes of the direct occupants (no descent, no contents).
#   cleanup     removes ONLY contact-submit.php and contact-lib.php (regular files, not symlinks) from that folder, then
#               `rmdir`s the folder ONLY if it is then empty. If anything else remains it stops (exit 3) and deletes nothing more.
#   log-status  read-only: from `error_log` in that same folder only, prints counts of the exact handler lines
#               "bf-contact: delivery failed (<category>, http <n>)" and NOTHING else from the file.
# Never recursive, never touches anything outside the folder, never reads the private config, never makes a network request.
# BF_HOME overrides $HOME for offline tests only.
set -u
umask 077

readonly TEST_DIR_NAME='bf-contact-test-syDS0pTcdO8q'
readonly KNOWN_FILES=(contact-submit.php contact-lib.php)
readonly LOG_NAME='error_log'
readonly LOG_MAX_BYTES=1048576

mode="${1:-inspect}"
case "$mode" in inspect|cleanup|log-status) ;; *) echo "usage: $0 inspect|cleanup|log-status"; exit 2 ;; esac

home="${BF_HOME:-${HOME:-}}"
[ -n "$home" ] && [ -d "$home" ] || { echo "REFUSED: home directory not usable."; exit 2; }
pub="$home/public_html"
dir="$pub/$TEST_DIR_NAME"

# The webroot itself is only stat'ed (never listed). It and the test folder must be real directories, not symlinks.
[ -d "$pub" ] && [ ! -L "$pub" ] || { echo "REFUSED: public_html is missing or a symlink."; exit 2; }
if [ ! -e "$dir" ] && [ ! -L "$dir" ]; then
  echo "STATE: test folder absent. Nothing to do."
  exit 0
fi
[ -d "$dir" ] && [ ! -L "$dir" ] || { echo "REFUSED: test folder is not a plain directory."; exit 2; }
real="$(cd "$dir" && pwd -P)" || { echo "REFUSED: cannot resolve test folder."; exit 2; }
[ "$real" = "$(cd "$pub" && pwd -P)/$TEST_DIR_NAME" ] || { echo "REFUSED: test folder does not resolve to the expected path."; exit 2; }

safe_name() { case "$1" in *[!A-Za-z0-9._-]*|'') echo '<unprintable-name>' ;; *) [ "${#1}" -le 64 ] && echo "$1" || echo '<long-name>' ;; esac; }
kind() { if [ -L "$1" ]; then echo symlink; elif [ -f "$1" ]; then echo file; elif [ -d "$1" ]; then echo dir; else echo other; fi; }
is_known() { local k; for k in "${KNOWN_FILES[@]}"; do [ "$1" = "$k" ] && return 0; done; return 1; }

# Direct children only, dotfiles included. Names are only ever printed through safe_name.
list_occupants() {
  local p b
  shopt -s dotglob nullglob
  for p in "$dir"/*; do
    b="${p##*/}"
    printf '  - %s  type=%s  mode=%s  bytes=%s  known=%s\n' "$(safe_name "$b")" "$(kind "$p")" \
      "$(stat -c '%a' "$p" 2>/dev/null || echo '?')" "$( [ -f "$p" ] && [ ! -L "$p" ] && stat -c '%s' "$p" 2>/dev/null || echo '-')" \
      "$(is_known "$b" && echo yes || echo NO)"
  done
  shopt -u dotglob nullglob
}
count_occupants() { local n=0 p; shopt -s dotglob nullglob; for p in "$dir"/*; do n=$((n + 1)); done; shopt -u dotglob nullglob; echo "$n"; }

case "$mode" in
  inspect)
    echo "STATE: test folder present. Direct occupants ($(count_occupants)):"
    list_occupants
    echo "No contents were read and nothing was changed."
    ;;
  cleanup)
    echo "Before ($(count_occupants) occupant(s)):"; list_occupants
    for f in "${KNOWN_FILES[@]}"; do
      p="$dir/$f"
      if [ -L "$p" ]; then echo "SKIP $f: is a symlink (not removed)."
      elif [ -f "$p" ]; then rm -f -- "$p" && echo "REMOVED $f"
      elif [ -e "$p" ]; then echo "SKIP $f: not a regular file (not removed)."
      else echo "ABSENT $f"; fi
    done
    left="$(count_occupants)"
    if [ "$left" -eq 0 ]; then
      if rmdir -- "$dir"; then echo "REMOVED empty test folder."; else echo "FAILED: rmdir refused."; exit 3; fi
    else
      echo "FAIL-CLOSED: $left unknown occupant(s) remain; the folder was NOT removed and nothing else was deleted:"
      list_occupants
      echo "OWNER DECISION NEEDED: identify these in cPanel File Manager and decide whether to delete them yourself or approve a follow-up Block naming them."
      exit 3
    fi
    ;;
  log-status)
    log="$dir/$LOG_NAME"
    if [ -L "$log" ] || [ ! -f "$log" ]; then echo "STATE: no plain $LOG_NAME file in the test folder. Nothing read."; exit 0; fi
    echo "Counts of handler status lines in the last $LOG_MAX_BYTES bytes of $LOG_NAME (all other content is discarded unread):"
    out="$(tail -c "$LOG_MAX_BYTES" -- "$log" | grep -a -o -E 'bf-contact: delivery failed \([a-z_]{1,32}, http [0-9]{1,3}\)' | sort | uniq -c)"
    if [ -n "$out" ]; then printf '%s\n' "$out"; else echo "(no matching lines)"; fi
    ;;
esac
