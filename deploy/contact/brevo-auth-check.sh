#!/usr/bin/env bash
# Issue #187: ONE read-only Brevo API authentication check using the key in the server's private config.
#   Makes exactly one request: GET https://api.brevo.com/v3/account (strict HTTPS/TLS verification, no redirects, short timeout).
#   Prints ONLY: the numeric HTTP status and a fixed classification word. Never the key, config values, response body, headers or errors.
#   A 200 proves the API key authenticates. It does NOT prove sender validation or transactional-send permission.
#   Sends no email. Writes nothing. Fails closed (exit 2) if config is missing/unreadable, not mode=test, key malformed, or curl is missing.
# Exit codes: 0 = HTTP 200 authenticated | 2 = refused before any request | 4 = HTTP 401/403 | 5 = any other result.
# BF_HOME overrides $HOME for offline tests only.
set -u
umask 077

home="${BF_HOME:-${HOME:-}}"
[ -n "$home" ] && [ -d "$home" ] || { echo "REFUSED: home directory not usable."; exit 2; }
command -v php >/dev/null 2>&1 || { echo "REFUSED: php is not available."; exit 2; }

BF_CONFIG_PATH="$home/bonafide-private/contact-config.php" php -d display_errors=0 -d log_errors=0 -d error_reporting=0 <<'PHP' 2>/dev/null
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

$ch = curl_init('https://api.brevo.com/v3/account');
curl_setopt_array($ch, [
    CURLOPT_HTTPGET => true,
    CURLOPT_HTTPHEADER => ['accept: application/json', 'api-key: ' . $key],
    CURLOPT_RETURNTRANSFER => true,          // body is captured and discarded, never printed
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
    CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
]);
curl_exec($ch);
$transportError = curl_errno($ch) !== 0;
$status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);
unset($key);

if ($transportError || $status === 0) bf_done(5, 'RESULT: http_status=none classification=transport_error (no HTTP response; investigate network/TLS). Not authenticated.');
if ($status === 200) bf_done(0, 'RESULT: http_status=200 classification=authenticated (API key authenticates only; sender and transactional-send permission are NOT verified).');
if ($status === 401) bf_done(4, 'RESULT: http_status=401 classification=unauthorized (Brevo rejected the API key).');
if ($status === 403) bf_done(4, 'RESULT: http_status=403 classification=forbidden (key recognised but not permitted, or blocked by IP/account setting).');
bf_done(5, "RESULT: http_status=$status classification=investigate (unexpected status).");
PHP
rc=$?
# php produced no output at all (fatal/parse error with output suppressed) => fail closed.
exit "$rc"
