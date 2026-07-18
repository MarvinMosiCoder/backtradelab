<?php

namespace Tests\Unit;

use App\Services\MarketPriceAlertTriggerService;
use PHPUnit\Framework\TestCase;

class MarketPriceAlertTriggerServiceTest extends TestCase
{
    private MarketPriceAlertTriggerService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new MarketPriceAlertTriggerService();
    }

    public function test_above_and_below_alerts_trigger_at_the_target(): void
    {
        $this->assertTrue($this->service->shouldTrigger('above', 95, 100, 100));
        $this->assertFalse($this->service->shouldTrigger('above', 95, 100, 99.99));
        $this->assertTrue($this->service->shouldTrigger('below', 105, 100, 100));
        $this->assertFalse($this->service->shouldTrigger('below', 105, 100, 100.01));
    }

    public function test_cross_alert_requires_a_previous_price_on_the_other_side(): void
    {
        $this->assertTrue($this->service->shouldTrigger('cross', 99, 100, 101));
        $this->assertTrue($this->service->shouldTrigger('cross', 101, 100, 99));
        $this->assertFalse($this->service->shouldTrigger('cross', null, 100, 101));
        $this->assertFalse($this->service->shouldTrigger('cross', 101, 100, 102));
    }
}
