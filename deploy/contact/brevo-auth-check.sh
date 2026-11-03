#!/usr/bin/env bash
# Issue #187: ONE read-only Brevo API authentication check using the key in the server's private config.
#   Makes exactly one request: GET https://api.brevo.com/v3/account (strict HTTPS/TLS verification, no redirects, short timeout).
#   Prints ONLY: the numeric HTTP status and a fixed classification word. Never the key, config values, response body, headers or errors.
#   Issue #189: on 401/403 the error body is inspected IN MEMORY only and mapped to a fixed reason word
#   (ip_not_authorized | key_not_recognised | account_restricted | unclassified). The body, its message and any IP in it are never printed.
#   A 200 proves the API key authenticates. It does NOT prove sender validation or transactional-send permission.
#   Sends no email. Writes nothing. Fails closed (exit 2) if config is missing/unreadable, not mode=test, key malformed, or curl is missing.
# Exit codes: 0 = HTTP 200 authenticated | 2 = refused before any request | 4 = HTTP 401/403 | 5 = any other result.
# BF_HOME overrides $HOME for offline tests only. BF_TEST_RESPONSE (a file: status on line 1, body after) replaces the network call
# and is honoured ONLY together with BF_HOME, i.e. never in the workflow, which streams this script with no environment overrides.
set -u
umask 077

home="${BF_HOME:-${HOME:-}}"
[ -n "$home" ] && [ -d "$home" ] || { echo "REFUSED: home directory not usable."; exit 2; }
command -v php >/dev/null 2>&1 || { echo "REFUSED: php is not available."; exit 2; }

BF_TEST_RESPONSE="${BF_HOME:+${BF_TEST_RESPONSE:-}}" BF_CONFIG_PATH="$home/bonafide-private/contact-config.php" php -d display_errors=0 -d log_errors=0 -d error_reporting=0 <<'PHP' 2>/dev/null
<?php
declare(strict_types=1);

function bf_done(int $code, string $line): void { echo $line . "\n"; exit($code); }
function bf_refuse(string $why): void { bf_done(2, "REFUSED: $why No request was made."); }

if (!function_exists('curl_init')) bf_refuse('PHP curl extension is missing.');

$path = (string)getenv('BF_CONFIG_PATH');
if ($path === '' || is_link($path) || !is_file($path) || !is_readable($path)) bf_refuse('private config is missing or not a readable plain file.');

ob_start();
try { $config = include $path; } catch (\Throwable $e) { $config = null; }
ob_end_clean();
if (!is_array($config)) bf_refuse('private config did not return an array.');
if (($config['mode'] ?? null) !== 'test') bf_refuse('config mode is not "test".');

$key = $config['brevo_api_key'] ?? null;
unset($config);
if (!is_string($key) || preg_match('/\Axkeysib-[A-Za-z0-9_-]{40,128}\z/', $key) !== 1) bf_refuse('API key is missing, a placeholder, or malformed.');

// Map a 401/403 error body to a fixed reason word. Runs in memory; the body itself is never printed or stored.
function bf_reason(string $body): string
{
    $d = json_decode($body, true);
    $code = is_array($d) && is_string($d['code'] ?? null) ? strtolower($d['code']) : '';
    $msg = is_array($d) && is_string($d['message'] ?? null) ? strtolower($d['message']) : strtolower(substr($body, 0, 2000));
    if (preg_match('/unrecogni[sz]ed ip|authori[sz]ed_?ips|ip address/', $msg) === 1) return 'ip_not_authorized';
    if (preg_match('/key not found|invalid api key|api key is invalid|key is not valid/', $msg) === 1) return 'key_not_recognised';
    if ($code === 'permission_denied' || $code === 'account_under_validation'
        || preg_match('/suspend|not activated|blocked|under validation|permission|not allowed/', $msg) === 1) return 'account_restricted';
    return 'unclassified';
}

$fake = (string)getenv('BF_TEST_RESPONSE');
if ($fake !== '') {
    // Offline test path only (requires BF_HOME). No network.
    $raw = (string)@file_get_contents($fake);
    [$first, $body] = array_pad(explode("\n", $raw, 2), 2, '');
    $status = (int)trim($first);
    $transportError = false;
} else {
$ch = curl_init('https://api.brevo.com/v3/account');
curl_setopt_array($ch, [
    CURLOPT_HTTPGET => true,
    CURLOPT_HTTPHEADER => ['accept: application/json', 'api-key: ' . $key],
    CURLOPT_RETURNTRANSFER => true,          // body is captured in memory for classification only, never printed
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
    CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
]);
$body = curl_exec($ch);
$body = is_string($body) ? $body : '';
$transportError = curl_errno($ch) !== 0;
$status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);
}
unset($key);

if ($transportError || $status === 0) bf_done(5, 'RESULT: http_status=none classification=transport_error (no HTTP response; investigate network/TLS). Not authenticated.');
if ($status === 200) bf_done(0, 'RESULT: http_status=200 classification=authenticated (API key authenticates only; sender and transactional-send permission are NOT verified).');
if ($status === 401 || $status === 403) {
    $reason = bf_reason($body);
    unset($body);
    $label = $status === 401 ? 'unauthorized' : 'forbidden';
    $hint = [
        'ip_not_authorized' => 'Brevo blocked the request because the server IP is not on the account\'s Authorized IPs list; the key itself was not judged',
        'key_not_recognised' => 'Brevo does not recognise this API key (deleted, mistyped, or from another Brevo account)',
        'account_restricted' => 'key recognised but the account or key is restricted (validation, suspension or permissions)',
        'unclassified' => 'Brevo rejected the request for a reason this check does not recognise',
    ][$reason];
    bf_done(4, "RESULT: http_status=$status classification=$label reason=$reason ($hint).");
}
bf_done(5, "RESULT: http_status=$status classification=investigate (unexpected status).");
PHP
rc=$?
# php produced no output at all (fatal/parse error with output suppressed) => fail closed.
exit "$rc"
