<?php

namespace App\Services\Payments;

use RuntimeException;

class PayMongoSignatureVerifier
{
    public function verify(string $rawPayload, ?string $header): array
    {
        $secret = (string) config('services.paymongo.webhook_secret');
        if ($secret === '') throw new RuntimeException('PayMongo webhook secret is not configured.');
        if (!$header) throw new RuntimeException('PayMongo signature is missing.');

        $parts = [];
        foreach (explode(',', $header) as $part) {
            [$key, $value] = array_pad(explode('=', trim($part), 2), 2, '');
            $parts[$key] = $value;
        }

        $timestamp = isset($parts['t']) && ctype_digit($parts['t']) ? (int) $parts['t'] : 0;
        if ($timestamp <= 0) throw new RuntimeException('PayMongo signature timestamp is invalid.');

        $tolerance = max(1, (int) config('services.paymongo.signature_tolerance', 300));
        if (abs(time() - $timestamp) > $tolerance) {
            throw new RuntimeException('PayMongo signature timestamp is outside the allowed window.');
        }

        $payload = json_decode($rawPayload, true, 512, JSON_THROW_ON_ERROR);
        $livemode = (bool) data_get($payload, 'data.attributes.livemode', false);
        $signature = $parts[$livemode ? 'li' : 'te'] ?? '';
        $expected = hash_hmac('sha256', $timestamp.'.'.$rawPayload, $secret);

        if ($signature === '' || !hash_equals($expected, $signature)) {
            throw new RuntimeException('PayMongo signature is invalid.');
        }

        return $payload;
    }
}
