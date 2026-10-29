<?php
// Test harness: reads {config, requests:[...], transport:{status,error}} from stdin, runs the pure handler
// with a MOCK transport, prints results + the recorded transport calls. It never opens a network socket:
// the only transport is the closure below, and it fails the run if asked for anything but the Brevo URL.
declare(strict_types=1);
require __DIR__ . '/../../deploy/contact/contact-lib.php';

$in = json_decode(stream_get_contents(STDIN), true);
$dir = sys_get_temp_dir() . '/bf-contact-' . bin2hex(random_bytes(6));
mkdir($dir, 0700);
$cfg = $in['config'] + ['storage_dir' => $dir];
$calls = [];
$logs = [];
$cfg['logger'] = static function (string $m) use (&$logs) { $logs[] = $m; };
$transport = static function (string $url, array $headers, string $json) use (&$calls, $in): array {
    if ($url !== BF_BREVO_URL) { fwrite(STDERR, "unexpected URL $url\n"); exit(9); }
    $calls[] = ['url' => $url, 'headers' => $headers, 'payload' => json_decode($json, true)];
    return $in['transport'] ?? ['status' => 201, 'error' => null];
};
foreach (($in['pre_files'] ?? []) as $name => $mtime) { file_put_contents("$dir/$name", '[]'); touch("$dir/$name", $mtime); }
$out = [];
foreach ($in['requests'] as $r) {
    $r += ['method' => 'POST', 'content_type' => 'application/json', 'ip' => '203.0.113.7', 'server' => ['HTTP_ORIGIN' => 'https://bonafidenitro.com']];
    if (isset($r['json'])) $r['body'] = json_encode($r['json']);
    $out[] = bf_handle($r, $cfg, $transport, $r['now'] ?? 1000000);
}
$left = array_map('basename', glob("$dir/*"));
array_map('unlink', glob("$dir/*"));
rmdir($dir);
echo json_encode(['results' => $out, 'calls' => $calls, 'logs' => $logs, 'left' => $left]);
