<?php

namespace Tests\Unit;

use App\Models\MarketBacktestPosition;
use App\Services\MarketBacktestInsightService;
use Illuminate\Support\Collection;
use Tests\TestCase;

class MarketBacktestInsightServiceTest extends TestCase
{
    private function position(array $overrides = []): MarketBacktestPosition
    {
        return new MarketBacktestPosition(array_merge([
            'symbol' => 'BTCUSDT',
            'side' => 'long',
            'quantity' => 1,
            'entry_price' => 100,
            'margin' => 100,
            'leverage' => 1,
            'entry_fee' => 0,
            'exit_fee' => 0,
            'realized_pnl' => 0,
            'setup_tag' => null,
            'opened_at_time' => null,
            'closed_at_time' => null,
            'status' => 'closed',
        ], $overrides));
    }

    public function test_it_is_ineligible_below_the_minimum_trade_count(): void
    {
        $positions = collect(range(1, 29))->map(fn () => $this->position(['realized_pnl' => 10]));

        $result = app(MarketBacktestInsightService::class)->build($positions);

        $this->assertFalse($result['eligible']);
        $this->assertSame(30, $result['requiredTrades']);
        $this->assertSame(29, $result['currentTrades']);
        $this->assertSame([], $result['items']);
    }

    public function test_it_is_eligible_with_no_insights_when_no_heuristic_fires(): void
    {
        $positions = collect(range(1, 30))->map(fn () => $this->position(['realized_pnl' => 0]));

        $result = app(MarketBacktestInsightService::class)->build($positions);

        $this->assertTrue($result['eligible']);
        $this->assertSame(30, $result['currentTrades']);
        $this->assertSame([], $result['items']);
    }

    public function test_it_flags_a_risk_reward_imbalance(): void
    {
        $positions = collect()
            ->concat(collect(range(1, 15))->map(fn () => $this->position(['realized_pnl' => 10])))
            ->concat(collect(range(1, 15))->map(fn () => $this->position(['realized_pnl' => -20])));

        $result = app(MarketBacktestInsightService::class)->build($positions);

        $this->assertTrue($result['eligible']);
        $this->assertCount(1, $result['items']);
        $this->assertSame('risk_reward', $result['items'][0]['type']);
        $this->assertSame('warning', $result['items'][0]['tone']);
        $this->assertStringContainsString('100%', $result['items'][0]['message']);
    }

    public function test_it_flags_a_weak_symbol_as_a_warning(): void
    {
        $positions = collect()
            ->concat(collect(range(1, 18))->map(fn () => $this->position(['symbol' => 'BTCUSDT', 'realized_pnl' => 10])))
            ->concat(collect(range(1, 2))->map(fn () => $this->position(['symbol' => 'BTCUSDT', 'realized_pnl' => -10])))
            ->concat(collect(range(1, 1))->map(fn () => $this->position(['symbol' => 'ETHUSDT', 'realized_pnl' => 10])))
            ->concat(collect(range(1, 9))->map(fn () => $this->position(['symbol' => 'ETHUSDT', 'realized_pnl' => -10])));

        $result = app(MarketBacktestInsightService::class)->build($positions);

        $this->assertTrue($result['eligible']);
        $this->assertCount(1, $result['items']);
        $this->assertSame('symbol_win_rate', $result['items'][0]['type']);
        $this->assertSame('warning', $result['items'][0]['tone']);
        $this->assertStringContainsString('ETHUSDT', $result['items'][0]['title']);
    }

    public function test_it_flags_a_strong_setup_tag_as_positive(): void
    {
        $positions = collect()
            ->concat(collect(range(1, 10))->map(fn () => $this->position(['realized_pnl' => 10])))
            ->concat(collect(range(1, 10))->map(fn () => $this->position(['realized_pnl' => -10])))
            ->concat(collect(range(1, 9))->map(fn () => $this->position(['setup_tag' => 'Breakout', 'realized_pnl' => 10])))
            ->concat(collect(range(1, 1))->map(fn () => $this->position(['setup_tag' => ' breakout ', 'realized_pnl' => -10])));

        $result = app(MarketBacktestInsightService::class)->build($positions);

        $this->assertTrue($result['eligible']);
        $this->assertCount(1, $result['items']);
        $this->assertSame('setup_tag_win_rate', $result['items'][0]['type']);
        $this->assertSame('positive', $result['items'][0]['tone']);
        $this->assertStringContainsString('breakout', strtolower($result['items'][0]['title']));
    }

    public function test_it_flags_cutting_winners_early_from_holding_time(): void
    {
        $positions = collect()
            ->concat(collect(range(1, 15))->map(fn () => $this->position([
                'realized_pnl' => 10,
                'opened_at_time' => 1_000,
                'closed_at_time' => 1_000 + 600,
            ])))
            ->concat(collect(range(1, 15))->map(fn () => $this->position([
                'realized_pnl' => -10,
                'opened_at_time' => 1_000,
                'closed_at_time' => 1_000 + 3_600,
            ])));

        $result = app(MarketBacktestInsightService::class)->build($positions);

        $this->assertTrue($result['eligible']);
        $this->assertCount(1, $result['items']);
        $this->assertSame('holding_time', $result['items'][0]['type']);
        $this->assertSame('You may be cutting winners early', $result['items'][0]['title']);
    }

    public function test_it_caps_output_at_three_insights_when_more_heuristics_fire(): void
    {
        $positions = new Collection();

        // 20 "long" trades (14 wins) and 10 "short" trades (1 win) -> side deviation fires.
        for ($i = 0; $i < 20; $i++) {
            $positions->push($this->position([
                'side' => 'long',
                'symbol' => $i < 10 ? 'BTCUSDT' : 'ETHUSDT',
                'realized_pnl' => $i < 14 ? 10 : -30,
                'opened_at_time' => 1_000,
                'closed_at_time' => 1_000 + ($i < 14 ? 600 : 3_600),
            ]));
        }
        for ($i = 0; $i < 10; $i++) {
            $positions->push($this->position([
                'side' => 'short',
                'symbol' => $i < 5 ? 'ETHUSDT' : 'SOLUSDT',
                'realized_pnl' => $i < 1 ? 10 : -30,
                'opened_at_time' => 1_000,
                'closed_at_time' => 1_000 + ($i < 1 ? 600 : 3_600),
            ]));
        }

        $result = app(MarketBacktestInsightService::class)->build($positions);

        $this->assertTrue($result['eligible']);
        $this->assertCount(3, $result['items']);
        $this->assertSame(3, collect($result['items'])->pluck('type')->unique()->count());
    }
}
