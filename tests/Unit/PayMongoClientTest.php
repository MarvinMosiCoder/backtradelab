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
            'test_bypass_capabilities' => false,
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

    public function test_test_mode_can_explicitly_bypass_merchant_capabilities_outside_production(): void
    {
        config()->set('services.paymongo.test_bypass_capabilities', true);
        Http::fake();

        $this->assertSame(['card', 'gcash'], app(PayMongoClient::class)->eligibleMethods());
        Http::assertNothingSent();
    }

    public function test_capability_bypass_still_creates_a_real_test_checkout_with_configured_methods(): void
    {
        config()->set('services.paymongo.test_bypass_capabilities', true);
        Http::fake([
            'https://api.paymongo.test/v1/checkout_sessions' => Http::response([
                'data' => ['id' => 'cs_test', 'attributes' => ['checkout_url' => 'https://checkout.paymongo.test/cs_test', 'livemode' => false]],
            ], 201),
        ]);

        $payment = new \App\Models\SubscriptionRequest();
        $payment->amount = '199.00';
        $payment->currency = 'PHP';
        $payment->duration_days = 30;
        $payment->submission_token = '5d06e085-9787-46d8-a61f-7fabf62c5a48';
        $payment->adm_user_id = 42;
        $payment->plan = 'monthly';

        $resource = app(PayMongoClient::class)->createCheckout(
            $payment,
            ['name' => 'Monthly', 'description' => 'Monthly replay access'],
            ['name' => 'Test User', 'email' => 'test@example.com'],
        );

        $this->assertSame('cs_test', $resource['id']);
        Http::assertSent(fn ($request) =>
            $request->url() === 'https://api.paymongo.test/v1/checkout_sessions'
            && $request['data']['attributes']['payment_method_types'] === ['card', 'gcash']
        );
    }

    public function test_live_mode_never_uses_the_test_capability_bypass(): void
    {
        config()->set('services.paymongo.test_bypass_capabilities', true);
        config()->set('services.paymongo.mode', 'live');
        config()->set('services.paymongo.secret_key', 'sk_live_example');
        config()->set('services.paymongo.live_enabled', true);
        Http::fake([
            'https://api.paymongo.test/v1/merchants/capabilities/payment_methods' => Http::response([
                'data' => ['attributes' => ['gcash' => ['status' => 'enabled']]],
            ]),
        ]);

        $this->assertSame(['gcash'], app(PayMongoClient::class)->eligibleMethods());
        Http::assertSentCount(1);
    }

    public function test_test_mode_remains_disabled_in_production_when_bypass_is_enabled(): void
    {
        config()->set('services.paymongo.test_bypass_capabilities', true);
        app()->detectEnvironment(fn () => 'production');

        $this->expectExceptionMessage('Test payments are disabled in production.');
        app(PayMongoClient::class)->eligibleMethods();
    }

    public function test_live_checkout_requires_the_explicit_live_gate(): void
    {
        config()->set('services.paymongo.mode', 'live');
        config()->set('services.paymongo.secret_key', 'sk_live_example');

        $this->expectExceptionMessage('locked until compliance approval');
        app(PayMongoClient::class)->assertAvailable();
    }
}
