<?php

namespace Tests\Unit;

use App\Services\Payments\PayMongoSignatureVerifier;
use Tests\TestCase;

class PayMongoSignatureVerifierTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.paymongo.webhook_secret', 'whsk_example');
        config()->set('services.paymongo.signature_tolerance', 300);
    }

    public function test_it_verifies_the_test_signature_against_the_raw_body(): void
    {
        $body = json_encode(['data' => ['id' => 'evt_1', 'attributes' => ['livemode' => false]]]);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$body, 'whsk_example');

        $payload = app(PayMongoSignatureVerifier::class)->verify($body, "t={$timestamp},te={$signature}");

        $this->assertSame('evt_1', data_get($payload, 'data.id'));
    }

    public function test_it_rejects_a_stale_timestamp(): void
    {
        $body = '{"data":{"attributes":{"livemode":false}}}';
        $timestamp = time() - 301;
        $signature = hash_hmac('sha256', $timestamp.'.'.$body, 'whsk_example');

        $this->expectExceptionMessage('outside the allowed window');
        app(PayMongoSignatureVerifier::class)->verify($body, "t={$timestamp},te={$signature}");
    }

    public function test_it_uses_the_live_signature_for_live_events(): void
    {
        $body = '{"data":{"attributes":{"livemode":true}}}';
        $timestamp = time();
        $testSignature = hash_hmac('sha256', $timestamp.'.'.$body, 'wrong');
        $liveSignature = hash_hmac('sha256', $timestamp.'.'.$body, 'whsk_example');

        $this->assertIsArray(app(PayMongoSignatureVerifier::class)->verify($body, "t={$timestamp},te={$testSignature},li={$liveSignature}"));
    }
}
