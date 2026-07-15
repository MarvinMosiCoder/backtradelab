<?php

namespace Tests\Unit;

use App\Models\SubscriptionRequest;
use App\Services\Payments\SubscriptionEntitlementService;
use Tests\TestCase;

class SubscriptionEntitlementServiceTest extends TestCase
{
    public function test_matching_amount_currency_and_mode_pass_validation(): void
    {
        $payment = new SubscriptionRequest(['amount' => '499.00', 'currency' => 'PHP', 'livemode' => false]);

        app(SubscriptionEntitlementService::class)->assertProviderPaymentMatches($payment, [
            'amount' => 49900, 'currency' => 'php', 'livemode' => false,
        ]);

        $this->addToAssertionCount(1);
    }

    public function test_amount_mismatch_is_rejected(): void
    {
        $payment = new SubscriptionRequest(['amount' => '499.00', 'currency' => 'PHP', 'livemode' => false]);

        $this->expectExceptionMessage('amount mismatch');
        app(SubscriptionEntitlementService::class)->assertProviderPaymentMatches($payment, [
            'amount' => 49800, 'currency' => 'PHP', 'livemode' => false,
        ]);
    }

    public function test_mode_mismatch_is_rejected(): void
    {
        $payment = new SubscriptionRequest(['amount' => '499.00', 'currency' => 'PHP', 'livemode' => false]);

        $this->expectExceptionMessage('mode mismatch');
        app(SubscriptionEntitlementService::class)->assertProviderPaymentMatches($payment, [
            'amount' => 49900, 'currency' => 'PHP', 'livemode' => true,
        ]);
    }
}
