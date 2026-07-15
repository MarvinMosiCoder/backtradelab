<?php

namespace Tests\Unit;

use App\Services\Payments\PayMongoClient;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PayMongoClientTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.paymongo', [
            'enabled' => true,
            'mode' => 'test',
            'secret_key' => 'sk_test_example',
            'webhook_secret' => 'whsk_test',
            'payment_methods' => ['card', 'gcash'],
            'live_enabled' => false,
            'base_url' => 'https://api.paymongo.test/v1/',
            'signature_tolerance' => 300,
        ]);
    }

    public function test_it_converts_php_amounts_to_integer_centavos(): void
    {
        $this->assertSame(12345, PayMongoClient::toCentavos('123.45'));
        $this->assertSame(1, PayMongoClient::toCentavos('0.01'));
    }

    public function test_it_intersects_configured_methods_with_merchant_capabilities(): void
    {
        Http::fake([
            'https://api.paymongo.test/v1/merchants/capabilities/payment_methods' => Http::response([
                'data' => ['attributes' => ['card' => ['status' => 'enabled'], 'paymaya' => ['status' => 'enabled']]],
            ]),
        ]);

        $this->assertSame(['card'], app(PayMongoClient::class)->eligibleMethods());
    }

    public function test_live_checkout_requires_the_explicit_live_gate(): void
    {
        config()->set('services.paymongo.mode', 'live');
        config()->set('services.paymongo.secret_key', 'sk_live_example');

        $this->expectExceptionMessage('locked until compliance approval');
        app(PayMongoClient::class)->assertAvailable();
    }
}
