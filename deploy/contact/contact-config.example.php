<?php
// TEMPLATE ONLY. Copy to a directory OUTSIDE the web root (default: one level above public_html, in
// bonafide-private/contact-config.php), fill in on the server, chmod 600. Never commit the filled-in copy.
return [
    'mode' => 'test',                          // 'test' sends only to test_recipient_email; 'production' sends to recipient_email
    'brevo_api_key' => 'SET_ON_SERVER_ONLY',   // Brevo transactional (SMTP/API) key, created by the owner
    'sender_email' => 'SET_VERIFIED_BREVO_SENDER',
    'sender_name' => 'Bona Fide Website',
    'recipient_email' => 'contact@bonafidenitro.com',
    'test_recipient_email' => 'SET_TEST_INBOX',
    'allowed_origins' => ['https://bonafidenitro.com'],
    'storage_dir' => '/home/CPANEL_USER/bonafide-private/ratelimit', // writable, outside web root, holds timestamps only
    'ip_salt' => 'SET_RANDOM_STRING',
    'rate_per_ip_hour' => 5,
    'rate_global_hour' => 60,
    'min_fill_ms' => 3000,
];
