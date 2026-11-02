<?php
// Issue #183: OFFLINE CLI smoke test for contact-lib.php. Run from a scratch folder in the server HOME (NOT public_html):
//   php smoke-cli.php
// Uses a SYNTHETIC config and a STUB transport. It never reads the private config, never touches the network, never
// sends email, never writes outside a temp dir it removes, and prints only PASS/FAIL lines (no request data, no values).
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/contact-lib.php';

$dir = sys_get_temp_dir() . '/bf-smoke-' . bin2hex(random_bytes(6));
mkdir($dir, 0700);
$calls = 0;
$cfg = [
    'mode' => 'test', 'brevo_api_key' => 'synthetic-not-a-key', 'sender_email' => 'sender@sender.example.test', 'sender_name' => 'Smoke',
    'recipient_email' => 'prod@prod.example.test', 'test_recipient_email' => 'test@test.example.test',
    'allowed_origins' => ['https://site.example.test'], 'storage_dir' => $dir, 'ip_salt' => 'synthetic-salt', 'min_fill_ms' => 3000,
];
$transport = static function (string $url, array $h, string $j) use (&$calls): array { $calls++; return ['status' => 201, 'error' => null]; };
$good = ['name' => 'Smoke Test', 'email' => 'smoke@example.test', 'category' => 'retailer', 'message' => 'Synthetic smoke message.', 'bf_hp' => '', 'elapsed_ms' => 9000];
$req = static fn(array $o = []) => $o + [
    'method' => 'POST', 'content_type' => 'application/json', 'ip' => '203.0.113.9',
    'server' => ['HTTP_ORIGIN' => 'https://site.example.test'], 'body' => json_encode($good),
];
$fail = 0;
$check = static function (string $name, bool $ok) use (&$fail): void { echo ($ok ? 'PASS ' : 'FAIL ') . $name . "\n"; if (!$ok) $fail++; };

$check('GET rejected 405', bf_handle($req(['method' => 'GET']), $cfg, $transport)['status'] === 405);
$check('foreign origin rejected 403', bf_handle($req(['server' => ['HTTP_ORIGIN' => 'https://evil.example.test']]), $cfg, $transport)['status'] === 403);
$check('non-JSON rejected 415', bf_handle($req(['content_type' => 'text/plain']), $cfg, $transport)['status'] === 415);
$check('invalid fields rejected 422', bf_handle($req(['body' => json_encode(['name' => '', 'email' => 'x', 'message' => 'y', 'elapsed_ms' => 9000, 'bf_hp' => ''])]), $cfg, $transport)['status'] === 422);
$check('no provider call so far', $calls === 0);
$check('honeypot looks like success, sends nothing', bf_handle($req(['body' => json_encode(['bf_hp' => 'x'] + $good)]), $cfg, $transport)['status'] === 200 && $calls === 0);
$r = bf_handle($req(), $cfg, $transport);
$check('valid request -> 200 via STUB transport (exactly one stub call, no network)', $r['status'] === 200 && $calls === 1);
$check('placeholder config fails closed 503', bf_handle($req(), ['brevo_api_key' => 'SET_ON_SERVER_ONLY'] + $cfg, $transport)['status'] === 503);

array_map('unlink', glob("$dir/*") ?: []);
rmdir($dir);
echo $fail === 0 ? "SMOKE OK (offline, no email, no network)\n" : "SMOKE FAILED ($fail)\n";
exit($fail === 0 ? 0 : 1);
