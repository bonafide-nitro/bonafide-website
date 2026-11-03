#!/usr/bin/env bash
# Issue #192: send exactly ONE synthetic test email through the real contact handler (contact-lib.php), from the server.
#   - Refuses unless the private config exists as a plain file, mode is "test", and values are not placeholders. In test mode the handler
#     can only send to test_recipient_email with a "[TEST]" subject. Synthetic sender data only; reply-to is the test inbox.
#   - One-shot: a marker ~/bonafide-private/contact-test-send.done is created ATOMICALLY BEFORE the send. If it exists the script refuses.
#     There is no retry path; the owner must delete the marker deliberately (separate decision) to allow another send.
#   - contact-lib.php arrives base64 in BF_LIB_B64 (set by the workflow on the first stdin line, after its SHA-256 was verified), is
#     written to a private 0700 temp dir inside the server home, and the temp dir is removed on exit. Nothing goes in public_html.
#   - Prints ONE fixed RESULT/REFUSED line: handler status, Brevo status, fixed reason word. Never the key, config values, addresses,
#     message text, Brevo response body or message id.
# Exit codes: 0 = sent (Brevo 2xx) | 2 = refused before any request | 4 = request made, not accepted | 5 = other.
# BF_HOME overrides $HOME for offline tests only. BF_TEST_STATUS (fake Brevo HTTP status, no network) is honoured ONLY with BF_HOME.
set -u
umask 077

home="${BF_HOME:-${HOME:-}}"
[ -n "$home" ] && [ -d "$home" ] || { echo "REFUSED: home directory not usable. No request was made."; exit 2; }
command -v php >/dev/null 2>&1 || { echo "REFUSED: php is not available. No request was made."; exit 2; }
[ -n "${BF_LIB_B64:-}" ] || { echo "REFUSED: handler library was not supplied. No request was made."; exit 2; }

work="$(mktemp -d "$home/.bf-test-send.XXXXXX" 2>/dev/null)" || { echo "REFUSED: cannot create private temp dir. No request was made."; exit 2; }
trap 'rm -rf "$work"' EXIT
chmod 700 "$work"
printf '%s' "$BF_LIB_B64" | base64 -d > "$work/contact-lib.php" 2>/dev/null && [ -s "$work/contact-lib.php" ] \
  || { echo "REFUSED: handler library could not be decoded. No request was made."; exit 2; }

BF_TEST_STATUS="${BF_HOME:+${BF_TEST_STATUS:-}}" BF_WORK="$work" BF_PRIVATE="$home/bonafide-private" \
BF_CONFIG_PATH="$home/bonafide-private/contact-config.php" BF_MARKER="$home/bonafide-private/contact-test-send.done" \
php -d display_errors=0 -d log_errors=0 -d error_reporting=0 <<'PHP' 2>/dev/null
<?php
declare(strict_types=1);

function bf_done(int $code, string $line): void { echo $line . "\n"; exit($code); }
function bf_refuse(string $why): void { bf_done(2, "REFUSED: $why No request was made."); }

$fake = (string)getenv('BF_TEST_STATUS');
if ($fake === '' && !function_exists('curl_init')) bf_refuse('PHP curl extension is missing.');

$priv = (string)getenv('BF_PRIVATE');
$path = (string)getenv('BF_CONFIG_PATH');
$marker = (string)getenv('BF_MARKER');
$work = (string)getenv('BF_WORK');
if ($priv === '' || is_link($priv) || !is_dir($priv)) bf_refuse('private directory is missing or a symlink.');
if ($path === '' || is_link($path) || !is_file($path) || !is_readable($path)) bf_refuse('private config is missing or not a readable plain file.');
if (is_link($marker) || file_exists($marker)) bf_refuse('one-shot marker already exists; a test email was already attempted.');

ob_start();
try { $c = include $path; } catch (\Throwable $e) { $c = null; }
ob_end_clean();
if (!is_array($c)) bf_refuse('private config did not return an array.');
if (($c['mode'] ?? null) !== 'test') bf_refuse('config mode is not "test".');
if (!is_string($c['brevo_api_key'] ?? null) || preg_match('/\Axkeysib-[A-Za-z0-9_-]{40,128}\z/', $c['brevo_api_key']) !== 1) bf_refuse('API key is missing, a placeholder, or malformed.');
foreach (['sender_email', 'test_recipient_email', 'ip_salt'] as $k) {
    $v = $c[$k] ?? null;
    if (!is_string($v) || $v === '' || str_starts_with($v, 'SET_')) bf_refuse('a required config value is missing or a placeholder.');
}
if (!is_array($c['allowed_origins'] ?? null) || !is_string($c['allowed_origins'][0] ?? null) || $c['allowed_origins'][0] === '') bf_refuse('allowed_origins is not usable.');

// Rate-limit files go to the throw-away temp dir, never the real storage dir. No logger: handler failures are not echoed anywhere.
$c['storage_dir'] = $work;
unset($c['logger']);

require $work . '/contact-lib.php';
if (!function_exists('bf_handle')) bf_refuse('handler library did not load.');

$calls = 0; $brevo = 0; $terr = false;
$transport = static function (string $url, array $headers, string $json) use (&$calls, &$brevo, &$terr, $fake): array {
    $calls++;
    if ($calls > 1 || $url !== BF_BREVO_URL) { $terr = true; return ['status' => 0, 'error' => 'blocked']; } // hard cap: one Brevo call
    if ($fake !== '') { $brevo = (int)$fake; return ['status' => $brevo, 'error' => null]; }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_POSTFIELDS => $json, CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 10,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    curl_exec($ch);   // response body is discarded unread
    $terr = curl_errno($ch) !== 0;
    $brevo = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return ['status' => $brevo, 'error' => $terr ? 'curl' : null];
};

// One-shot guard: exclusive create BEFORE the send. If this fails the send does not happen.
$m = @fopen($marker, 'x');
if ($m === false) bf_refuse('could not create the one-shot marker.');
fwrite($m, gmdate('c') . "\n"); fclose($m);

$min = max((int)($c['min_fill_ms'] ?? 3000), 3000) + 1000;
$body = json_encode([
    'name' => 'Synthetic Test',
    'email' => $c['test_recipient_email'],
    'category' => 'consumer',
    'message' => 'Synthetic one-time test message from the Bona Fide contact handler. No visitor sent this.',
    'elapsed_ms' => $min,
    'bf_hp' => '',
]);
$origin = $c['allowed_origins'][0];
$res = bf_handle([
    'method' => 'POST', 'content_type' => 'application/json', 'body' => (string)$body,
    'server' => ['HTTP_ORIGIN' => $origin], 'ip' => '127.0.0.1',
], $c, $transport);
unset($c, $body);

$hs = (int)($res['status'] ?? 0);
if ($calls === 0) {
    bf_done(5, "RESULT: handler_status=$hs brevo_status=none reason=not_sent (the handler declined before calling Brevo; no email was sent).");
}
$b = $brevo === 0 ? 'none' : (string)$brevo;
if ($hs === 200 && $brevo >= 200 && $brevo < 300 && !$terr) {
    bf_done(0, "RESULT: handler_status=200 brevo_status=$b reason=sent (one test email accepted by Brevo; delivery to the inbox is not confirmed by this script).");
}
$reason = ($terr || $brevo === 0) ? 'network' : ($brevo === 429 ? 'provider_rate_limited' : ($brevo >= 500 ? 'provider_error' : 'provider_rejected'));
bf_done(4, "RESULT: handler_status=$hs brevo_status=$b reason=$reason (the request was made once and not accepted; the one-shot marker stays).");
PHP
rc=$?
# php produced no output at all (fatal/parse error with output suppressed) => fail closed.
exit "$rc"
