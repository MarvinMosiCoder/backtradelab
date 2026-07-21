<?php

namespace Tests\Feature;

use App\Services\MarketMetadataService;
use Illuminate\Support\Facades\RateLimiter;
use Mockery\MockInterface;
use RuntimeException;
use Tests\TestCase;

class FeaturedCoinsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('featured-coins:127.0.0.44');
    }

    public function test_it_returns_only_sanitized_fixed_featured_markets(): void
    {
        $this->mock(MarketMetadataService::class, function (MockInterface $mock) {
            $mock->shouldReceive('get')->times(3)->andReturnUsing(function ($exchange, $category, $symbol) {
                return [
                    'market' => ['symbol' => $symbol, 'internal' => 'do-not-expose'],
                    'stats' => [
                        'last_price' => '123.45', 'change_24h_percent' => 2.5,
                        'high_24h' => '130', 'low_24h' => '110', 'volume_24h' => '999',
                        'bid_price' => 'secret-extra-field',
                    ],
                    'fundamentals' => [
                        'name' => $symbol, 'logo_url' => 'https://example.test/coin.png',
                        'market_cap_rank' => 1, 'market_cap' => 1000, 'max_supply' => 2000,
                    ],
                    'sources' => ['bybit', 'coinmarketcap'],
                    'warnings' => [],
                    'updated_at' => '2026-07-21T00:00:00+00:00',
                    'api_key' => 'never-return-this',
                ];
            });
        });

        $response = $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.44'])
            ->getJson('/api/featured-coins')
            ->assertOk()
            ->assertJsonCount(3, 'items')
            ->assertJsonPath('items.0.market.symbol', 'BTCUSDT')
            ->assertJsonPath('items.1.market.symbol', 'ETHUSDT')
            ->assertJsonPath('items.2.market.symbol', 'SOLUSDT')
            ->assertJsonPath('items.0.stats.last_price', '123.45')
            ->assertJsonMissing(['api_key' => 'never-return-this'])
            ->assertJsonMissing(['bid_price' => 'secret-extra-field'])
            ->assertJsonMissing(['max_supply' => 2000]);

        $this->assertSame(['BTCUSDT', 'ETHUSDT', 'SOLUSDT'], collect($response->json('items'))->pluck('market.symbol')->all());
    }

    public function test_one_provider_failure_does_not_hide_other_coins(): void
    {
        $this->mock(MarketMetadataService::class, function (MockInterface $mock) {
            $mock->shouldReceive('get')->times(3)->andReturnUsing(function ($exchange, $category, $symbol) {
                if ($symbol === 'ETHUSDT') throw new RuntimeException('Provider secret failure');

                return ['stats' => ['last_price' => '10'], 'updated_at' => now()->toIso8601String()];
            });
        });

        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.45'])
            ->getJson('/api/featured-coins')
            ->assertOk()
            ->assertJsonCount(3, 'items')
            ->assertJsonPath('items.0.stats.last_price', '10')
            ->assertJsonPath('items.1.stats.last_price', null)
            ->assertJsonPath('items.1.warnings.0', 'Market information is temporarily unavailable.')
            ->assertJsonMissing(['warnings' => ['Provider secret failure']]);
    }

    public function test_featured_coins_endpoint_is_rate_limited_per_ip(): void
    {
        $this->mock(MarketMetadataService::class, function (MockInterface $mock) {
            $mock->shouldReceive('get')->andReturn(['stats' => [], 'updated_at' => now()->toIso8601String()]);
        });

        $client = $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.46']);
        for ($attempt = 0; $attempt < 30; $attempt++) {
            $client->getJson('/api/featured-coins')->assertOk();
        }
        $client->getJson('/api/featured-coins')->assertStatus(429);
    }
}
