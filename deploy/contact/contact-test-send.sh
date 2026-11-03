#!/usr/bin/env bash
# Issue #192: ONE controlled contact-form test email through the real handler (contact-lib.php), run on the server over SSH.
#   Nothing is placed in public_html. contact-lib.php arrives base64-encoded in BF_LIB_B64 (prepended by the workflow), is written to a
#   private temp dir in $HOME (mode 700) for this run only, and removed on exit.
#   Refuses (no request) unless: private config is a readable plain file returning an array, mode is "test", and no earlier attempt marker exists.
#   The marker ~/bonafide-private/contact-test-send.attempted is written BEFORE the send, so a second run (or a retry after a failure) never sends.
#   Email goes ONLY to test_recipient_email (mode=test, "[TEST]" subject). Synthetic content; reply-to is the test inbox itself.
#   Prints ONLY one fixed RESULT/REFUSED line. Never the key, config values, addresses, message text, Brevo body or message ID.
# Exit codes: 0 = sent (Brevo 2xx) | 2 = refused before any request | 4 = Brevo refused | 5 = other/transport.
# BF_HOME overrides $HOME and BF_TEST_RESPONSE (file: status line 1, body after) replaces the network call -- offline tests only;
# BF_TEST_RESPONSE is honoured ONLY together with BF_HOME, never in the workflow.
set -u
umask 077

home="${BF_HOME:-${HOME:-}}"
[ -n "$home" ] && [ -d "$home" ] || { echo "REFUSED: home directory not usable. No request was made."; exit 2; }
command -v php >/dev/null 2>&1 || { echo "REFUSED: php is not available. No request was made."; exit 2; }
[ -n "${BF_LIB_B64:-}" ] || { echo "REFUSED: handler code was not supplied. No request was made."; exit 2; }

work="$(mktemp -d "$home/.bf-test-send-XXXXXXXX")" || { echo "REFUSED: could not create a private temp dir. No request was made."; exit 2; }
trap 'rm -rf "$work"' EXIT
chmod 700 "$work"
printf '%s' "$BF_LIB_B64" | base64 -d > "$work/contact-lib.php" 2>/dev/null || { echo "REFUSED: handler code could not be decoded. No request was made."; exit 2; }
mkdir "$work/rl"

BF_TEST_RESPONSE="${BF_HOME:+${BF_TEST_RESPONSE:-}}" BF_LIB="$work/contact-lib.php" BF_RL="$work/rl" BF_PRIV="$home/bonafide-private" \
  php -d display_errors=0 -d log_errors=0 -d error_reporting=0 <<'PHP' 2>/dev/null
<?php
declare(strict_types=1);

function bf_done(int $code, string $line): void { echo $line . "\n"; exit($code); }
function bf_refuse(string $why): void { bf_done(2, "REFUSED: $why No request was made."); }

$priv = (string)getenv('BF_PRIV');
$path = $priv . '/contact-config.php';
$marker = $priv . '/contact-test-send.attempted';
if (!function_exists('curl_init')) bf_refuse('PHP curl extension is missing.');
if (is_link($priv) || !is_dir($priv)) bf_refuse('private directory is missing or a symlink.');
if (is_link($path) || !is_file($path) || !is_readable($path)) bf_refuse('private config is missing or not a readable plain file.');
if (file_exists($marker) || is_link($marker)) bf_refuse('a test send was already attempted on this server (one-shot guard). Not sending again.');

require (string)getenv('BF_LIB');
if (!function_exists('bf_handle')) bf_refuse('handler code did not load.');

ob_start();
try { $config = include $path; } catch (\Throwable $e) { $config = null; }
ob_end_clean();
if (!is_array($config)) bf_refuse('private config did not return an array.');
if (($config['mode'] ?? null) !== 'test') bf_refuse('config mode is not "test".');
$origins = $config['allowed_origins'] ?? null;
if (!is_array($origins) || !is_string($origins[0] ?? null)) bf_refuse('allowed_origins is not set.');
$testTo = $config['test_recipient_email'] ?? '';
if (!is_string($testTo) || !filter_var($testTo, FILTER_VALIDATE_EMAIL)) bf_refuse('test_recipient_email is not a valid address.');

// Run-scoped rate-limit storage (keeps the real rate-limit state untouched); no logger output.
$config['storage_dir'] = (string)getenv('BF_RL');
unset($config['logger']);
if (!bf_config_ok($config)) bf_refuse('config is incomplete or still has placeholders.');

// Write the one-shot marker BEFORE any request: a failure is never retried automatically.
if (@file_put_contents($marker, gmdate('c') . "\n", LOCK_EX) === false) bf_refuse('could not write the one-shot marker.');
@chmod($marker, 0600);

$calls = 0; $provStatus = 0; $provBody = '';
$fake = (string)getenv('BF_TEST_RESPONSE');
$transport = static function (string $url, array $headers, string $json) use (&$calls, &$provStatus, &$provBody, $fake): array {
    if (++$calls > 1) return ['status' => 0, 'error' => 'second_call_blocked'];
    if ($fake !== '') {
        [$first, $body] = array_pad(explode("\n", (string)@file_get_contents($fake), 2), 2, '');
        $provStatus = (int)trim($first); $provBody = $body;
        return ['status' => $provStatus, 'error' => null];
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_POSTFIELDS => $json, CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 10,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_FOLLOWLOCATION => false,
    ]);
    $b = curl_exec($ch);
    $err = curl_errno($ch) ? 'curl' : null;
    $provStatus = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $provBody = is_string($b) ? $b : '';
    return ['status' => $provStatus, 'error' => $err];
};

$res = bf_handle([
    'method' => 'POST',
    'content_type' => 'application/json',
    'server' => ['HTTP_ORIGIN' => $origins[0]],
    'ip' => '127.0.0.1',
    'body' => json_encode([
        'name' => 'Endpoint Test',
        'email' => $testTo,
        'category' => 'consumer',
        'message' => 'ENDPOINT TEST #192: one controlled send from the GitHub workflow through the real contact handler. Synthetic content, no visitor data. Please do not reply.',
        'bf_hp' => '',
        'elapsed_ms' => 9000,
    ]),
], $config, $transport);
unset($config, $testTo);

// Classify Brevo's refusal in memory; only a fixed word is printed.
function bf_reason(int $st, string $body): string
{
    $d = json_decode($body, true);
    $code = is_array($d) && is_string($d['code'] ?? null) ? strtolower($d['code']) : '';
    $msg = is_array($d) && is_string($d['message'] ?? null) ? strtolower($d['message']) : strtolower(substr($body, 0, 2000));
    if (preg_match('/unrecogni[sz]ed ip|authori[sz]ed_?ips|ip address/', $msg) === 1) return 'ip_not_authorized';
    if (preg_match('/key not found|invalid api key|api key is invalid|key is not valid/', $msg) === 1) return 'key_not_recognised';
    if (preg_match('/sender/', $msg) === 1) return 'sender_not_valid';
    if ($code === 'permission_denied' || $code === 'account_under_validation'
        || preg_match('/suspend|not activated|blocked|under validation|permission|not allowed/', $msg) === 1) return 'account_restricted';
    if ($st === 400) return 'payload_rejected';
    return 'unclassified';
}

$hs = (int)$res['status'];
if ($calls === 0) bf_done(5, "RESULT: handler_status=$hs provider_calls=0 outcome=not_sent (handler stopped before sending; marker written, will not retry).");
if ($hs === 200 && $provStatus >= 200 && $provStatus < 300) {
    bf_done(0, "RESULT: handler_status=200 provider_status=$provStatus outcome=sent (exactly one [TEST] email accepted by Brevo for the test inbox; check it arrived and is not in spam).");
}
if ($provStatus === 0) bf_done(5, 'RESULT: handler_status=' . $hs . ' provider_status=none outcome=transport_error (no HTTP response; nothing was sent; not retried).');
$reason = bf_reason($provStatus, $provBody);
unset($provBody);
bf_done(4, "RESULT: handler_status=$hs provider_status=$provStatus outcome=refused reason=$reason (nothing was sent; not retried).");
PHP
rc=$?
exit "$rc"
