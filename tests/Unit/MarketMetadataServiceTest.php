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
        config()->set('services.coingecko.api_key', null);
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

    public function test_coingecko_uses_the_highest_ranked_exact_symbol_and_is_cached(): void
    {
        config()->set('services.coingecko.api_key', 'demo-key');
        Http::fake([
            '*search*' => Http::response(['coins' => [
                ['id' => 'wrapped-bitcoin', 'symbol' => 'BTC', 'market_cap_rank' => 15],
                ['id' => 'bitcoin', 'symbol' => 'BTC', 'market_cap_rank' => 1],
                ['id' => 'bitcoin-cash', 'symbol' => 'BCH', 'market_cap_rank' => 20],
            ]]),
            '*coins/markets*' => Http::response([['id' => 'bitcoin', 'symbol' => 'btc', 'name' => 'Bitcoin', 'market_cap_rank' => 1, 'market_cap' => 1000000, 'image' => 'https://example.test/btc.png']]),
            '*' => Http::response(['retCode' => 0, 'result' => ['list' => [['lastPrice' => '100']]]]),
        ]);

        $first = $this->service()->get('bybit', 'spot', 'BTCUSDT');
        $second = $this->service()->get('bybit', 'spot', 'BTCUSDT');

        $this->assertSame('bitcoin', $first['fundamentals']['provider_id']);
        $this->assertSame(1.0, $first['fundamentals']['market_cap_rank']);
        $this->assertSame($first['fundamentals'], $second['fundamentals']);
        Http::assertSentCount(3);
    }

    public function test_missing_coingecko_key_keeps_exchange_stats_available(): void
    {
        Http::fake(fn () => Http::response(['retCode' => 0, 'result' => ['list' => [['lastPrice' => '100']]]]));
        $metadata = $this->service()->get('bybit', 'spot', 'BTCUSDT');

        $this->assertSame(100.0, $metadata['stats']['last_price']);
        $this->assertNull($metadata['fundamentals']);
        $this->assertNotEmpty($metadata['warnings']);
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
