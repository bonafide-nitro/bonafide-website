#!/usr/bin/env bash
# Bona Fide contact form: PRIVATE-CONFIG PREPARATION for GoDaddy cPanel over SSH (Issue #174).
#
# What it does (nothing else):
#   - checks PHP >= 8.0 and the cURL extension,
#   - checks ~/bonafide-private/ and ~/bonafide-private/ratelimit/,
#   - copies contact-config.example.php to ~/bonafide-private/contact-config.php ONLY IF that file is absent,
#   - restricts permissions (config 600, private dirs 700),
#   - checks the private config's syntax and completeness WITHOUT printing any value.
# What it never does: write to public_html, upload the endpoint, touch WordPress/DNS/email/Brevo, overwrite an
# existing config, accept or print a secret, or make a network request.
#
# Usage:   bash install-private-config.sh [dry-run]   preview only (DEFAULT, changes nothing)
#          bash install-private-config.sh apply       perform the steps above
#          bash install-private-config.sh check       read-only config check (no template, no changes)
# Test hook: BF_HOME overrides $HOME (used by the offline tests only).
set -u
umask 077

MODE="${1:-dry-run}"
case "$MODE" in dry-run|apply|check) ;; *) echo "usage: $0 [dry-run|apply|check]" >&2; exit 64 ;; esac

HOME_DIR="${BF_HOME:-${HOME:-}}"
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SELF_DIR/contact-config.example.php"
PRIV="$HOME_DIR/bonafide-private"
RATE="$PRIV/ratelimit"
CONFIG="$PRIV/contact-config.php"
FAIL=0
ACT="would"; [ "$MODE" = apply ] && ACT="did"

ok()   { echo "  [ok]   $*"; }
warn() { echo "  [todo] $*"; }
bad()  { echo "  [FAIL] $*"; FAIL=1; }
act()  { echo "  [$ACT]  $*"; }

echo "Bona Fide contact private-config prep -- mode: $MODE"
[ "$MODE" = dry-run ] && echo "(dry-run: nothing is changed; run with 'apply' to perform the steps)"

echo "1. Environment"
if [ -z "$HOME_DIR" ] || [ ! -d "$HOME_DIR" ]; then bad "home directory not found"; exit 1; fi
ok "home: $HOME_DIR"
if [ -d "$HOME_DIR/public_html" ]; then ok "public_html found (this script never writes there)"; else warn "public_html not found at the usual place (not needed for this step)"; fi
PHP_BIN="${BF_PHP:-php}"
if command -v "$PHP_BIN" >/dev/null 2>&1; then
  if "$PHP_BIN" -r 'exit(PHP_VERSION_ID >= 80000 ? 0 : 1);' 2>/dev/null; then ok "PHP >= 8.0"; else bad "PHP 8.0 or newer required (select it in cPanel > MultiPHP Manager / use the matching php binary via BF_PHP)"; fi
  if "$PHP_BIN" -r 'exit(extension_loaded("curl") ? 0 : 1);' 2>/dev/null; then ok "cURL extension loaded"; else bad "PHP cURL extension missing (enable in cPanel > Select PHP Version)"; fi
else
  bad "php not found on PATH"
fi

echo "2. Private directories"
if [ -d "$PRIV" ]; then ok "bonafide-private/ exists (left as is)"; else
  if [ "$MODE" = check ]; then bad "bonafide-private/ missing"; else
    act "create $PRIV (mode 700)"; [ "$MODE" = apply ] && mkdir -p "$PRIV"; fi
fi
if [ -d "$RATE" ]; then ok "bonafide-private/ratelimit/ exists (left as is)"; else
  if [ "$MODE" = check ]; then bad "bonafide-private/ratelimit/ missing"; else
    act "create $RATE (mode 700)"; [ "$MODE" = apply ] && mkdir -p "$RATE"; fi
fi
if [ "$MODE" = apply ]; then
  for d in "$PRIV" "$RATE"; do [ -d "$d" ] && chmod 700 "$d" 2>/dev/null; done
fi
for d in "$PRIV" "$RATE"; do
  [ -d "$d" ] || continue
  p="$(stat -c %a "$d" 2>/dev/null)"
  if [ "$p" = 700 ]; then ok "$(basename "$d")/ permissions 700"; else warn "$(basename "$d")/ permissions $p (apply sets 700)"; fi
  [ -w "$d" ] && ok "$(basename "$d")/ writable" || bad "$(basename "$d")/ not writable"
done
case "$PRIV" in "$HOME_DIR/public_html"*) bad "private dir must be OUTSIDE public_html" ;; esac

echo "3. Config file"
if [ -e "$CONFIG" ]; then
  ok "contact-config.php already exists (never overwritten)"
elif [ "$MODE" = check ]; then
  bad "contact-config.php missing"
else
  [ -f "$TEMPLATE" ] || bad "template not found next to this script: contact-config.example.php"
  if [ "$FAIL" = 0 ]; then
    act "copy template to $CONFIG (mode 600, storage_dir set to $RATE)"
    if [ "$MODE" = apply ]; then
      [ -d "$PRIV" ] || mkdir -p "$PRIV"
      content="$(cat "$TEMPLATE")"
      printf '%s\n' "${content//\/home\/CPANEL_USER\/bonafide-private\/ratelimit/$RATE}" > "$CONFIG" && chmod 600 "$CONFIG" || bad "could not write config"
    fi
  fi
fi
if [ -f "$CONFIG" ]; then
  p="$(stat -c %a "$CONFIG" 2>/dev/null)"
  if [ "$MODE" = apply ] && [ "$p" != 600 ]; then chmod 600 "$CONFIG" 2>/dev/null; p="$(stat -c %a "$CONFIG" 2>/dev/null)"; fi
  if [ "$p" = 600 ]; then ok "config permissions 600"; else warn "config permissions $p (apply sets 600)"; fi
fi

echo "4. Config check (names and status only; values are never printed)"
if [ -f "$CONFIG" ]; then
  if ! "$PHP_BIN" -l "$CONFIG" >/dev/null 2>&1; then
    bad "config has a PHP syntax error (fix the quoting/commas around the lines you edited; details are hidden on purpose)"
  else
    ok "config syntax valid"
    "$PHP_BIN" -d display_errors=0 -d log_errors=0 -r '
      $c = @include $argv[1];
      if (!is_array($c)) { echo "  [FAIL] config does not return an array\n"; exit(2); }
      $bad = 0;
      $str = function ($k) use ($c) { return isset($c[$k]) && is_string($c[$k]) ? trim($c[$k]) : ""; };
      $report = function ($k, $state) use (&$bad) {
        if ($state === "ok") { echo "  [ok]   $k set\n"; } else { echo "  [todo] $k: $state\n"; $bad = 1; }
      };
      foreach (["brevo_api_key", "ip_salt", "sender_email", "test_recipient_email"] as $k) {
        $v = $str($k);
        $report($k, $v === "" ? "empty" : (strpos($v, "SET_") === 0 ? "still the placeholder" : "ok"));
      }
      foreach (["sender_email", "test_recipient_email", "recipient_email"] as $k) {
        $v = $str($k);
        if ($v !== "" && strpos($v, "SET_") !== 0 && !filter_var($v, FILTER_VALIDATE_EMAIL)) $report($k, "not a valid email address");
      }
      if ($str("recipient_email") === "") $report("recipient_email", "empty");
      $m = $str("mode");
      echo in_array($m, ["test", "production"], true) ? "  [ok]   mode is " . $m . "\n" : "  [todo] mode must be test or production\n";
      if ($m === "production") { echo "  [todo] mode is production: keep it on test until the approved live test\n"; }
      if (!in_array($m, ["test", "production"], true)) $bad = 1;
      $o = $c["allowed_origins"] ?? null;
      if (!is_array($o) || !$o) { echo "  [todo] allowed_origins empty\n"; $bad = 1; } else { echo "  [ok]   allowed_origins set (" . count($o) . ")\n"; }
      $s = $str("storage_dir");
      if ($s === "" || strpos($s, "CPANEL_USER") !== false) { echo "  [todo] storage_dir still the placeholder\n"; $bad = 1; }
      elseif (is_dir($s) && is_writable($s)) echo "  [ok]   storage_dir exists and is writable\n";
      else { echo "  [todo] storage_dir missing or not writable\n"; $bad = 1; }
      exit($bad);
    ' -- "$CONFIG"
    rc=$?
    if [ "$rc" = 0 ]; then ok "config complete (the endpoint still answers 503 until it is uploaded in a separate approved step)"; else warn "config not complete yet: edit the [todo] items, then run: bash $(basename "$0") check"; fi
  fi
else
  warn "no config yet"
fi

echo
if [ "$FAIL" != 0 ]; then echo "Result: FAILED -- fix the [FAIL] items above."; exit 1; fi
if [ "$MODE" = dry-run ]; then echo "Result: dry-run OK. Re-run with 'apply' to perform the steps listed as [would]."; exit 0; fi
echo "Result: done. Edit the config yourself (cPanel File Manager editor or: nano \"$CONFIG\"), then run: bash $(basename "$0") check"
