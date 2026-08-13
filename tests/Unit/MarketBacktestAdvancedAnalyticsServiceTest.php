<?php

namespace Tests\Unit;

use App\Models\MarketBacktestPosition;
use App\Services\MarketBacktestAdvancedAnalyticsService;
use PHPUnit\Framework\TestCase;

class MarketBacktestAdvancedAnalyticsServiceTest extends TestCase
{
    public function test_it_calculates_expectancy_profit_factor_drawdown_and_streaks(): void
    {
        $positions = collect([
            $this->position(100, 1704067200),
            $this->position(-50, 1704153600),
            $this->position(-25, 1704240000),
            $this->position(75, 1704326400),
        ]);

        $result = (new MarketBacktestAdvancedAnalyticsService())->build($positions, 1000);

        $this->assertSame(25.0, $result['expectancy']);
        $this->assertSame(2.3333, $result['profitFactor']);
        $this->assertSame(75.0, $result['maxDrawdown']);
        $this->assertSame(2, $result['maxLossStreak']);
        $this->assertCount(4, $result['equityCurve']);
    }

    public function test_monte_carlo_requires_five_trades(): void
    {
        $positions = collect([$this->position(10, 1), $this->position(-5, 2)]);
        $result = (new MarketBacktestAdvancedAnalyticsService())->monteCarlo($positions, 1000);

        $this->assertFalse($result['eligible']);
        $this->assertSame(5, $result['requiredTrades']);
    }

    private function position(float $pnl, int $time): MarketBacktestPosition
    {
        $position = new MarketBacktestPosition();
        $position->realized_pnl = $pnl;
        $position->closed_at_time = $time;
        return $position;
    }
}
