<?php
// Bona Fide contact handler: pure logic. No credentials live here and nothing is sent from this file;
// the caller injects the transport (the real cURL one is in contact-submit.php, tests inject a mock).
// Only plain text is ever forwarded; the visitor's input is never interpreted as HTML or headers.
declare(strict_types=1);

if (PHP_SAPI !== 'cli' && realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

const BF_CATEGORIES = ['consumer', 'retailer', 'distributor', 'co-packer'];
const BF_MAX_BODY = 16384;
const BF_BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

function bf_clean_line(string $s, int $max): string
{
    $s = preg_replace('/[\x00-\x1F\x7F\x{2028}\x{2029}]+/u', ' ', $s) ?? '';
    $s = trim(preg_replace('/\s+/u', ' ', $s) ?? '');
    return mb_substr($s, 0, $max, 'UTF-8');
}

function bf_clean_text(string $s, int $max): string
{
    $s = str_replace(["\r\n", "\r"], "\n", $s);
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $s) ?? '';
    $s = preg_replace("/\n{3,}/", "\n\n", $s) ?? '';
    return mb_substr(trim($s), 0, $max, 'UTF-8');
}

function bf_response(int $status, array $body, array $extra = []): array
{
    return ['status' => $status, 'body' => $body, 'headers' => $extra];
}

function bf_config_ok(array $c): bool
{
    $mode = $c['mode'] ?? '';
    if (!in_array($mode, ['production', 'test'], true)) return false;
    foreach (['brevo_api_key', 'sender_email', 'sender_name', 'recipient_email', 'allowed_origins', 'storage_dir', 'ip_salt'] as $k) {
        if (empty($c[$k])) return false;
    }
    if (!is_array($c['allowed_origins']) || !filter_var($c['sender_email'], FILTER_VALIDATE_EMAIL) || !filter_var($c['recipient_email'], FILTER_VALIDATE_EMAIL)) return false;
    foreach (['brevo_api_key', 'ip_salt'] as $k) if (str_starts_with((string)$c[$k], 'SET_')) return false;
    if ($mode === 'test' && (empty($c['test_recipient_email']) || !filter_var($c['test_recipient_email'], FILTER_VALIDATE_EMAIL))) return false;
    return is_dir($c['storage_dir']) && is_writable($c['storage_dir']);
}

// Remove counter files untouched for over an hour: every timestamp in them has expired, so inactive clients leave nothing behind.
function bf_rate_sweep(array $c, int $now): void
{
    foreach (glob(rtrim($c['storage_dir'], '/\\') . '/rl-*.json') ?: [] as $f) {
        $m = @filemtime($f);
        if ($m !== false && $m < $now - 3600) @unlink($f);
    }
}

// Sliding-window limit per hashed client and globally; the file holds only timestamps keyed by a salted hash.
function bf_rate_limited(array $c, string $ip, int $now): ?int
{
    $limits = [
        ['ip-' . hash('sha256', $c['ip_salt'] . '|' . $ip), (int)($c['rate_per_ip_hour'] ?? 5)],
        ['global', (int)($c['rate_global_hour'] ?? 60)],
    ];
    $retry = null;
    bf_rate_sweep($c, $now);
    foreach ($limits as [$key, $max]) {
        $f = rtrim($c['storage_dir'], '/\\') . '/rl-' . $key . '.json';
        // A new client file is refused once the number of tracked clients is capped (fail closed, bounded storage).
        if (!is_file($f) && $key !== 'global' && count(glob(dirname($f) . '/rl-ip-*.json') ?: []) >= (int)($c['rate_max_clients'] ?? 5000)) return 3600;
        $h = @fopen($f, 'c+');
        if (!$h || !flock($h, LOCK_EX)) return 3600; // fail closed
        $raw = stream_get_contents($h);
        $times = array_values(array_filter(is_array($d = json_decode($raw ?: '[]', true)) ? $d : [], static fn($t) => is_int($t) && $t > $now - 3600));
        if (count($times) >= $max) {
            $retry = max($retry ?? 0, max(1, $times[0] + 3600 - $now));
        } else {
            $times[] = $now;
            ftruncate($h, 0); rewind($h); fwrite($h, json_encode($times));
        }
        flock($h, LOCK_UN); fclose($h);
        if ($retry !== null) return $retry;
    }
    return null;
}

function bf_origin_ok(array $c, array $server): bool
{
    $origin = $server['HTTP_ORIGIN'] ?? '';
    if ($origin === '') return false;
    return in_array($origin, $c['allowed_origins'], true);
}

/**
 * @param array $req   ['method','content_type','body','server'=>[...$_SERVER subset],'ip']
 * @param callable $transport fn(string $url, array $headers, string $json): array{status:int,error:?string}
 */
function bf_handle(array $req, array $c, callable $transport, ?int $now = null): array
{
    $now ??= time();
    $server = $req['server'] ?? [];
    if (($req['method'] ?? '') !== 'POST') return bf_response(405, ['ok' => false, 'error' => 'method_not_allowed'], ['Allow' => 'POST']);
    if (!bf_config_ok($c)) return bf_response(503, ['ok' => false, 'error' => 'not_configured']);
    if (!bf_origin_ok($c, $server)) return bf_response(403, ['ok' => false, 'error' => 'forbidden_origin']);
    if (stripos((string)($req['content_type'] ?? ''), 'application/json') !== 0) return bf_response(415, ['ok' => false, 'error' => 'unsupported_media_type']);
    $raw = (string)($req['body'] ?? '');
    if (strlen($raw) > BF_MAX_BODY) return bf_response(413, ['ok' => false, 'error' => 'too_large']);
    $in = json_decode($raw, true);
    if (!is_array($in) || array_is_list($in)) return bf_response(400, ['ok' => false, 'error' => 'bad_request']);
    foreach (['name', 'email', 'category', 'message', 'bf_hp'] as $k) {
        if (isset($in[$k]) && !is_string($in[$k])) return bf_response(400, ['ok' => false, 'error' => 'bad_request']);
    }

    // Spam: honeypot and too-fast submissions get a normal-looking success and nothing is sent.
    $elapsed = $in['elapsed_ms'] ?? null;
    $min = (int)($c['min_fill_ms'] ?? 3000);
    if (($in['bf_hp'] ?? '') !== '' || !is_int($elapsed) || $elapsed < $min) {
        return bf_response(200, ['ok' => true]);
    }

    $name = bf_clean_line($in['name'] ?? '', 100);
    $email = trim($in['email'] ?? '');
    $category = trim($in['category'] ?? '');
    $message = bf_clean_text($in['message'] ?? '', 4000);
    $fields = [];
    if ($name === '') $fields['name'] = 'Please enter your name.';
    if ($email === '' || strlen($email) > 254 || preg_match('/[\x00-\x20,;<>"\\\\]/', $email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) $fields['email'] = 'Please enter a valid email address.';
    if (mb_strlen($message, 'UTF-8') < 10) $fields['message'] = 'Please write at least 10 characters.';
    if ($category !== '' && !in_array($category, BF_CATEGORIES, true)) $category = '';
    if ($fields) return bf_response(422, ['ok' => false, 'error' => 'validation', 'fields' => $fields]);
    if (preg_match_all('~https?://|www\.~i', $message) > 2) return bf_response(200, ['ok' => true]); // link spam: drop quietly

    $wait = bf_rate_limited($c, (string)($req['ip'] ?? ''), $now);
    if ($wait !== null) return bf_response(429, ['ok' => false, 'error' => 'rate_limited'], ['Retry-After' => (string)$wait]);

    $test = $c['mode'] === 'test';
    $to = $test ? $c['test_recipient_email'] : $c['recipient_email'];
    $subject = ($test ? '[TEST] ' : '') . 'Website inquiry' . ($category !== '' ? " ($category)" : '') . ' from ' . mb_substr($name, 0, 60, 'UTF-8');
    $text = "Name: $name\nEmail: $email\nCategory: " . ($category !== '' ? $category : 'not given') . "\n\n$message\n";
    $payload = json_encode([
        'sender' => ['email' => $c['sender_email'], 'name' => $c['sender_name']],
        'to' => [['email' => $to]],
        'replyTo' => ['email' => $email, 'name' => $name],
        'subject' => $subject,
        'textContent' => $text,
        'tags' => ['website-contact'],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($payload === false) return bf_response(400, ['ok' => false, 'error' => 'bad_request']);

    $r = $transport(BF_BREVO_URL, ['api-key: ' . $c['brevo_api_key'], 'Content-Type: application/json', 'Accept: application/json'], $payload);
    $st = (int)($r['status'] ?? 0);
    if ($st >= 200 && $st < 300 && empty($r['error'])) return bf_response(200, ['ok' => true]);
    // Only a category code is ever logged; never the visitor's data or the provider body.
    $code = !empty($r['error']) || $st === 0 ? 'network' : ($st === 429 ? 'provider_rate_limited' : ($st >= 500 ? 'provider_error' : 'provider_rejected'));
    if (isset($c['logger']) && is_callable($c['logger'])) ($c['logger'])('bf-contact: delivery failed (' . $code . ', http ' . $st . ')');
    if ($code === 'provider_rate_limited') return bf_response(503, ['ok' => false, 'error' => 'rate_limited'], ['Retry-After' => '60']);
    return bf_response($code === 'provider_rejected' ? 502 : 503, ['ok' => false, 'error' => 'delivery_failed']);
}
