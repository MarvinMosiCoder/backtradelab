<?php

namespace Tests\Unit;

use App\Exceptions\ExchangeRateLimitedException;
use App\Services\ExchangeMarketDataGateway;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ExchangeMarketDataGatewayTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        config()->set('market-data.budgets_per_second.bybit', 60);
        config()->set('market-data.cooldown_max_seconds', 60);
        config()->set('market-data.stale_cache_seconds', 300);
    }

    public function test_identical_requests_reuse_the_shared_cache(): void
    {
        Http::fake(['*' => Http::response(['result' => ['list' => []]])]);
        $gateway = app(ExchangeMarketDataGateway::class);

        $first = $gateway->get('bybit', 'klines', 'https://api.bybit.test/kline', ['symbol' => 'BTCUSDT'], 30);
        $second = $gateway->get('bybit', 'klines', 'https://api.bybit.test/kline', ['symbol' => 'BTCUSDT'], 30);

        $this->assertTrue($first->successful());
        $this->assertSame($first->json(), $second->json());
        Http::assertSentCount(1);
    }

    public function test_rate_limit_activates_a_shared_cooldown(): void
    {
        Http::fake(['*' => Http::response(['retCode' => 10006], 429, ['Retry-After' => '12'])]);
        $gateway = app(ExchangeMarketDataGateway::class);

        try {
            $gateway->get('bybit', 'klines', 'https://api.bybit.test/kline', [], 0);
            $this->fail('Expected the first limited request to throw.');
        } catch (ExchangeRateLimitedException $exception) {
            $this->assertGreaterThanOrEqual(12, $exception->retryAfter);
        }

        $this->expectException(ExchangeRateLimitedException::class);
        $gateway->get('bybit', 'klines', 'https://api.bybit.test/another-kline', [], 0);
    }

    public function test_stale_success_is_returned_when_refresh_is_limited(): void
    {
        Http::fakeSequence()
            ->push(['value' => 100], 200)
            ->push(['retCode' => 10006], 429, ['Retry-After' => '10']);
        $gateway = app(ExchangeMarketDataGateway::class);
        $url = 'https://api.bybit.test/kline';

        $gateway->get('bybit', 'klines', $url, [], 1);
        $this->travel(2)->seconds();
        $stale = $gateway->get('bybit', 'klines', $url, [], 1);

        $this->assertSame(100, $stale->json('value'));
        Http::assertSentCount(2);
    }
}
