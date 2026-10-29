<?php
// Public entry point: upload next to contact-lib.php (e.g. public_html/contact-submit.php). It holds no secrets.
// The private config path is read from the server environment or the default below, OUTSIDE the web root.
declare(strict_types=1);

require __DIR__ . '/contact-lib.php';

function bf_out(array $res): void
{
    http_response_code($res['status']);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    foreach ($res['headers'] as $k => $v) header("$k: $v");
    echo json_encode($res['body']);
}

function bf_brevo_transport(string $url, array $headers, string $json): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_POSTFIELDS => $json, CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 10,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => false,
    ]);
    curl_exec($ch);
    $err = curl_errno($ch) ? 'curl' : null;
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return ['status' => $status, 'error' => $err];
}

$path = getenv('BF_CONTACT_CONFIG') ?: dirname($_SERVER['DOCUMENT_ROOT'] ?? __DIR__) . '/bonafide-private/contact-config.php';
$config = is_file($path) ? (include $path) : null;
if (!is_array($config)) {
    bf_out(bf_response(503, ['ok' => false, 'error' => 'not_configured']));
    exit;
}
$config['logger'] = static fn(string $m) => error_log($m);

bf_out(bf_handle([
    'method' => $_SERVER['REQUEST_METHOD'] ?? '',
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? '',
    'body' => (string)file_get_contents('php://input', false, null, 0, BF_MAX_BODY + 1),
    'server' => $_SERVER,
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
], $config, 'bf_brevo_transport'));
