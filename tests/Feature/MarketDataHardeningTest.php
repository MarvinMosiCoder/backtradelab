<?php

namespace Tests\Feature;

use Tests\TestCase;

class MarketDataHardeningTest extends TestCase
{
    public function test_klines_rejects_invalid_symbols_before_an_upstream_request(): void
    {
        $this->getJson('/api/klines?symbol=BTC%2FUSDT')->assertUnprocessable();
    }

    public function test_klines_rejects_reversed_timestamp_ranges(): void
    {
        $this->getJson('/api/klines?symbol=BTCUSDT&start=200&end=100')->assertUnprocessable();
    }

    public function test_mexc_rejects_unsupported_timeframes(): void
    {
        $this->getJson('/api/klines?exchange=mexc&category=spot&symbol=BTCUSDT&interval=3')->assertUnprocessable();
    }
}
