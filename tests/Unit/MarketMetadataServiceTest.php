<?php

namespace Tests\Unit;

use App\Models\MarketSymbol;
use App\Services\MarketMetadataService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MarketMetadataServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        config()->set('services.coinmarketcap.api_key', null);
        config()->set('services.coingecko.api_key', null);
        config()->set('services.coingecko.mode', 'demo');
        config()->set('services.market_data.verify_tls', true);
    }

    public static function spotProviders(): array
    {
        return [
            'binance' => ['binance', 'BTCUSDT', ['lastPrice' => '100', 'priceChangePercent' => '2.5', 'highPrice' => '110', 'lowPrice' => '90', 'volume' => '10', 'quoteVolume' => '1000', 'bidPrice' => '99', 'askPrice' => '101']],
            'bybit' => ['bybit', 'BTCUSDT', ['retCode' => 0, 'result' => ['list' => [['lastPrice' => '100', 'price24hPcnt' => '0.025', 'highPrice24h' => '110', 'lowPrice24h' => '90', 'volume24h' => '10', 'turnover24h' => '1000', 'bid1Price' => '99', 'ask1Price' => '101']]]]],
            'okx' => ['okx', 'BTC-USDT', ['data' => [['last' => '100', 'open24h' => '80', 'high24h' => '110', 'low24h' => '90', 'vol24h' => '10', 'volCcy24h' => '1000', 'bidPx' => '99', 'askPx' => '101']]]],
            'bingx' => ['bingx', 'BTC-USDT', ['data' => ['lastPrice' => '100', 'priceChangePercent' => '2.5', 'highPrice' => '110', 'lowPrice' => '90', 'volume' => '10', 'quoteVolume' => '1000', 'bidPrice' => '99', 'askPrice' => '101']]],
            'mexc' => ['mexc', 'BTCUSDT', ['lastPrice' => '100', 'priceChangePercent' => '2.5', 'highPrice' => '110', 'lowPrice' => '90', 'volume' => '10', 'quoteVolume' => '1000', 'bidPrice' => '99', 'askPrice' => '101']],
        ];
    }

    /** @dataProvider spotProviders */
    public function test_it_normalizes_spot_exchange_tickers(string $exchange, string $native, array $fixture): void
    {
        Http::fake(fn () => Http::response($fixture));
        $metadata = $this->service()->get($exchange, 'spot', 'BTCUSDT');

        $this->assertSame(100.0, $metadata['stats']['last_price']);
        $this->assertSame(110.0, $metadata['stats']['high_24h']);
        $this->assertSame(90.0, $metadata['stats']['low_24h']);
        $this->assertSame($native, $metadata['market']['native_symbol']);
        $this->assertContains($exchange, $metadata['sources']);
    }

    public function test_bybit_derivative_fields_are_normalized(): void
    {
        Http::fake(fn () => Http::response(['retCode' => 0, 'result' => ['list' => [[
            'lastPrice' => '100', 'price24hPcnt' => '-0.01', 'markPrice' => '99.9', 'indexPrice' => '100.1',
            'fundingRate' => '0.0001', 'nextFundingTime' => '1700000000000', 'openInterest' => '12345',
        ]]]]));
        $metadata = $this->service()->get('bybit', 'linear', 'BTCUSDT');

        $this->assertSame(-1.0, $metadata['stats']['change_24h_percent']);
        $this->assertSame(99.9, $metadata['stats']['mark_price']);
        $this->assertSame(0.0001, $metadata['stats']['funding_rate']);
        $this->assertSame(12345.0, $metadata['stats']['open_interest']);
    }

    public function test_coinmarketcap_uses_the_highest_ranked_exact_symbol_and_is_cached(): void
    {
        config()->set('services.coinmarketcap.api_key', 'cmc-key');
        Http::fake([
            '*cryptocurrency/map*' => Http::response(['data' => [
                ['id' => 3717, 'symbol' => 'WBTC', 'name' => 'Wrapped Bitcoin'],
                ['id' => 99, 'symbol' => 'BTC', 'name' => 'Bitcoin Clone'],
                ['id' => 1, 'symbol' => 'BTC', 'name' => 'Bitcoin'],
            ]]),
            '*cryptocurrency/quotes/latest*' => Http::response(['data' => [
                '99' => ['id' => 99, 'symbol' => 'BTC', 'name' => 'Bitcoin Clone', 'cmc_rank' => 100, 'quote' => ['USD' => ['market_cap' => 100]]],
                '1' => [
                    'id' => 1, 'symbol' => 'BTC', 'name' => 'Bitcoin', 'cmc_rank' => 1,
                    'circulating_supply' => '19600000', 'total_supply' => 19600000, 'max_supply' => 21000000,
                    'quote' => ['USD' => ['market_cap' => '1000000', 'fully_diluted_market_cap' => 1100000, 'last_updated' => '2026-07-20T00:00:00Z']],
                ],
            ]]),
            '*cryptocurrency/info*' => Http::response(['data' => ['1' => [
                'id' => 1, 'name' => 'Bitcoin', 'symbol' => 'BTC', 'logo' => 'https://example.test/btc.png',
            ]]]),
            '*' => Http::response(['retCode' => 0, 'result' => ['list' => [['lastPrice' => '100']]]]),
        ]);

        $first = $this->service()->get('bybit', 'spot', 'BTCUSDT');
        $second = $this->service()->get('bybit', 'spot', 'BTCUSDT');

        $this->assertSame(1, $first['fundamentals']['provider_id']);
        $this->assertSame(1.0, $first['fundamentals']['market_cap_rank']);
        $this->assertSame(1000000.0, $first['fundamentals']['market_cap']);
        $this->assertSame(19600000.0, $first['fundamentals']['circulating_supply']);
        $this->assertSame('https://example.test/btc.png', $first['fundamentals']['logo_url']);
        $this->assertNull($first['fundamentals']['ath']);
        $this->assertNull($first['fundamentals']['atl']);
        $this->assertContains('coinmarketcap', $first['sources']);
        $this->assertSame($first['fundamentals'], $second['fundamentals']);
        Http::assertSentCount(5);
        Http::assertSent(fn ($request) => str_contains($request->url(), 'coinmarketcap.com')
            && $request->hasHeader('X-CMC_PRO_API_KEY', 'cmc-key'));
    }

    public function test_missing_coinmarketcap_key_keeps_exchange_stats_available(): void
    {
        Http::fake(fn () => Http::response(['retCode' => 0, 'result' => ['list' => [['lastPrice' => '100']]]]));
        $metadata = $this->service()->get('bybit', 'spot', 'BTCUSDT');

        $this->assertSame(100.0, $metadata['stats']['last_price']);
        $this->assertNull($metadata['fundamentals']);
        $this->assertNotEmpty($metadata['warnings']);
    }

    public function test_coinmarketcap_no_exact_match_keeps_exchange_stats_available(): void
    {
        config()->set('services.coinmarketcap.api_key', 'cmc-key');
        Http::fake([
            '*cryptocurrency/map*' => Http::response(['data' => [['id' => 2, 'symbol' => 'NOTBTC']]]),
            '*' => Http::response(['retCode' => 0, 'result' => ['list' => [['lastPrice' => '100']]]]),
        ]);

        $metadata = $this->service()->get('bybit', 'spot', 'BTCUSDT');

        $this->assertSame(100.0, $metadata['stats']['last_price']);
        $this->assertNull($metadata['fundamentals']);
        $this->assertStringContainsString('No exact CoinMarketCap match', implode(' ', $metadata['warnings']));
    }

    public function test_coinmarketcap_failure_keeps_exchange_stats_available(): void
    {
        config()->set('services.coinmarketcap.api_key', 'cmc-key');
        Http::fake([
            '*cryptocurrency/map*' => Http::response(['status' => ['error_message' => 'Rate limit exceeded']], 429),
            '*' => Http::response(['retCode' => 0, 'result' => ['list' => [['lastPrice' => '100']]]]),
        ]);

        $metadata = $this->service()->get('bybit', 'spot', 'BTCUSDT');

        $this->assertSame(100.0, $metadata['stats']['last_price']);
        $this->assertNull($metadata['fundamentals']);
        $this->assertContains('CoinMarketCap fundamentals are temporarily unavailable.', $metadata['warnings']);
    }

    public function test_invalid_coinmarketcap_response_keeps_exchange_stats_available(): void
    {
        config()->set('services.coinmarketcap.api_key', 'cmc-key');
        Http::fake([
            '*cryptocurrency/map*' => Http::response(['data' => 'invalid']),
            '*' => Http::response(['retCode' => 0, 'result' => ['list' => [['lastPrice' => '100']]]]),
        ]);

        $metadata = $this->service()->get('bybit', 'spot', 'BTCUSDT');

        $this->assertSame(100.0, $metadata['stats']['last_price']);
        $this->assertNull($metadata['fundamentals']);
        $this->assertContains('CoinMarketCap fundamentals are temporarily unavailable.', $metadata['warnings']);
    }

    public function test_coingecko_is_used_when_coinmarketcap_is_unavailable(): void
    {
        config()->set('services.coinmarketcap.api_key', 'cmc-key');
        config()->set('services.coingecko.api_key', 'cg-key');
        Http::fake([
            '*coinmarketcap.com*' => Http::response(['status' => ['error_message' => 'Unavailable']], 503),
            '*api.coingecko.com/api/v3/search*' => Http::response(['coins' => [
                ['id' => 'wrapped-bitcoin', 'symbol' => 'WBTC', 'market_cap_rank' => 15],
                ['id' => 'bitcoin', 'symbol' => 'BTC', 'market_cap_rank' => 1],
            ]]),
            '*api.coingecko.com/api/v3/coins/markets*' => Http::response([[
                'id' => 'bitcoin', 'symbol' => 'btc', 'name' => 'Bitcoin', 'market_cap_rank' => 1,
                'market_cap' => 1000000, 'image' => 'https://example.test/btc.png', 'ath' => 120000, 'atl' => 65,
            ]]),
            '*' => Http::response(['retCode' => 0, 'result' => ['list' => [['lastPrice' => '100']]]]),
        ]);

        $metadata = $this->service()->get('bybit', 'spot', 'BTCUSDT');

        $this->assertSame('bitcoin', $metadata['fundamentals']['provider_id']);
        $this->assertSame(120000.0, $metadata['fundamentals']['ath']);
        $this->assertContains('coingecko', $metadata['sources']);
        $this->assertNotContains('coinmarketcap', $metadata['sources']);
        Http::assertSent(fn ($request) => str_contains($request->url(), 'api.coingecko.com')
            && $request->hasHeader('x-cg-demo-api-key', 'cg-key'));
    }

    private function service(): MarketMetadataService
    {
        return new class extends MarketMetadataService {
            protected function resolveSavedMarket(string $exchange, string $category, string $symbol): ?MarketSymbol
            {
                return null;
            }
        };
    }
}
