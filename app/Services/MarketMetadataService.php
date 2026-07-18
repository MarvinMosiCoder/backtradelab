<?php

namespace App\Services;

use App\Models\MarketSymbol;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class MarketMetadataService
{
    public function get(string $exchange, string $category, string $symbol): array
    {
        $exchange = strtolower($exchange);
        $category = strtolower($category);
        $symbol = strtoupper($symbol);
        $saved = $this->resolveSavedMarket($exchange, $category, $symbol);
        $native = $saved?->exchange_symbol ?: $this->inferNativeSymbol($exchange, $category, $symbol);
        [$base, $quote] = $this->marketCoins($saved, $symbol);
        $warnings = [];

        try {
            $exchangeData = Cache::remember(
                "market-metadata:exchange:v1:{$exchange}:{$category}:{$native}",
                now()->addSeconds(10),
                fn () => $this->fetchExchangeStats($exchange, $category, $native)
            );
            $exchangeAvailable = true;
        } catch (Throwable $exception) {
            report($exception);
            $exchangeData = $this->emptyStats();
            $exchangeAvailable = false;
            $warnings[] = 'Exchange statistics are temporarily unavailable.';
        }

        $fundamentals = null;
        $coinGeckoKey = trim((string) config('services.coingecko.api_key'));
        if ($base !== '' && $coinGeckoKey !== '') {
            try {
                $fundamentals = $this->coinGeckoFundamentals($base);
                if (!$fundamentals) $warnings[] = 'No exact CoinGecko match was found for this asset.';
            } catch (Throwable $exception) {
                report($exception);
                $warnings[] = 'Coin fundamentals are temporarily unavailable.';
            }
        } elseif ($base !== '') {
            $warnings[] = 'CoinGecko is not configured; exchange statistics are still available.';
        }

        return [
            'market' => [
                'exchange' => $exchange,
                'category' => $category,
                'symbol' => $symbol,
                'native_symbol' => $native,
                'base_coin' => $base,
                'quote_coin' => $quote,
                'status' => $saved?->is_active === false ? 'inactive' : 'active',
            ],
            'stats' => $exchangeData,
            'fundamentals' => $fundamentals,
            'sources' => array_values(array_filter([$exchangeAvailable ? $exchange : null, $fundamentals ? 'coingecko' : null])),
            'warnings' => $warnings,
            'updated_at' => now()->toIso8601String(),
        ];
    }

    private function fetchExchangeStats(string $exchange, string $category, string $native): array
    {
        return match ($exchange) {
            'binance' => $this->binanceStats($category, $native),
            'bybit' => $this->bybitStats($category, $native),
            'okx' => $this->okxStats($category, $native),
            'bingx' => $this->bingxStats($category, $native),
            'mexc' => $this->mexcStats($category, $native),
            default => throw new RuntimeException("Unsupported metadata exchange: {$exchange}"),
        };
    }

    private function binanceStats(string $category, string $native): array
    {
        $futures = $category !== 'spot';
        $base = $futures ? 'https://fapi.binance.com' : 'https://api.binance.com';
        $ticker = $this->http()->get($base.($futures ? '/fapi/v1/ticker/24hr' : '/api/v3/ticker/24hr'), ['symbol' => $native])->throw()->json();
        $extra = [];
        if ($futures) {
            $premium = $this->http()->get($base.'/fapi/v1/premiumIndex', ['symbol' => $native]);
            $interest = $this->http()->get($base.'/fapi/v1/openInterest', ['symbol' => $native]);
            if ($premium->successful()) $extra = array_merge($extra, $premium->json());
            if ($interest->successful()) $extra = array_merge($extra, $interest->json());
        }

        return $this->stats([
            'last_price' => $ticker['lastPrice'] ?? null,
            'change_24h_percent' => $ticker['priceChangePercent'] ?? null,
            'high_24h' => $ticker['highPrice'] ?? null,
            'low_24h' => $ticker['lowPrice'] ?? null,
            'volume_24h' => $ticker['volume'] ?? null,
            'turnover_24h' => $ticker['quoteVolume'] ?? null,
            'bid_price' => $ticker['bidPrice'] ?? null,
            'ask_price' => $ticker['askPrice'] ?? null,
            'mark_price' => $extra['markPrice'] ?? null,
            'index_price' => $extra['indexPrice'] ?? null,
            'funding_rate' => $extra['lastFundingRate'] ?? null,
            'next_funding_time' => $extra['nextFundingTime'] ?? null,
            'open_interest' => $extra['openInterest'] ?? null,
        ]);
    }

    private function bybitStats(string $category, string $native): array
    {
        $payload = $this->http()->get('https://api.bybit.com/v5/market/tickers', [
            'category' => $category === 'spot' ? 'spot' : $category,
            'symbol' => $native,
        ])->throw()->json();
        $ticker = $payload['result']['list'][0] ?? [];

        return $this->stats([
            'last_price' => $ticker['lastPrice'] ?? null,
            'change_24h_percent' => isset($ticker['price24hPcnt']) ? ((float) $ticker['price24hPcnt'] * 100) : null,
            'high_24h' => $ticker['highPrice24h'] ?? null,
            'low_24h' => $ticker['lowPrice24h'] ?? null,
            'volume_24h' => $ticker['volume24h'] ?? null,
            'turnover_24h' => $ticker['turnover24h'] ?? null,
            'bid_price' => $ticker['bid1Price'] ?? null,
            'ask_price' => $ticker['ask1Price'] ?? null,
            'mark_price' => $ticker['markPrice'] ?? null,
            'index_price' => $ticker['indexPrice'] ?? null,
            'funding_rate' => $ticker['fundingRate'] ?? null,
            'next_funding_time' => $ticker['nextFundingTime'] ?? null,
            'open_interest' => $ticker['openInterest'] ?? null,
        ]);
    }

    private function okxStats(string $category, string $native): array
    {
        $ticker = $this->http()->get('https://www.okx.com/api/v5/market/ticker', ['instId' => $native])->throw()->json('data.0') ?? [];
        $last = $this->number($ticker['last'] ?? null);
        $open = $this->number($ticker['open24h'] ?? null);
        $change = $last !== null && $open && $open != 0 ? (($last - $open) / $open) * 100 : null;
        $extra = [];
        if ($category !== 'spot') {
            foreach ([
                ['https://www.okx.com/api/v5/public/mark-price', ['instType' => 'SWAP', 'instId' => $native], 'markPx'],
                ['https://www.okx.com/api/v5/public/funding-rate', ['instId' => $native], 'fundingRate'],
                ['https://www.okx.com/api/v5/public/open-interest', ['instType' => 'SWAP', 'instId' => $native], 'oi'],
            ] as [$url, $params, $field]) {
                $response = $this->http()->get($url, $params);
                if ($response->successful()) $extra[$field] = data_get($response->json(), 'data.0.'.$field);
                if ($field === 'fundingRate' && $response->successful()) $extra['nextFundingTime'] = data_get($response->json(), 'data.0.nextFundingTime');
            }
        }

        return $this->stats([
            'last_price' => $last,
            'change_24h_percent' => $change,
            'high_24h' => $ticker['high24h'] ?? null,
            'low_24h' => $ticker['low24h'] ?? null,
            'volume_24h' => $ticker['vol24h'] ?? null,
            'turnover_24h' => $ticker['volCcy24h'] ?? null,
            'bid_price' => $ticker['bidPx'] ?? null,
            'ask_price' => $ticker['askPx'] ?? null,
            'mark_price' => $extra['markPx'] ?? null,
            'funding_rate' => $extra['fundingRate'] ?? null,
            'next_funding_time' => $extra['nextFundingTime'] ?? null,
            'open_interest' => $extra['oi'] ?? null,
        ]);
    }

    private function bingxStats(string $category, string $native): array
    {
        $spot = $category === 'spot';
        $symbol = str_contains($native, '-') ? $native : preg_replace('/(USDT|USDC|USD)$/i', '-$1', $native);
        $response = $this->http()->get(
            $spot ? 'https://open-api.bingx.com/openApi/spot/v1/ticker/24hr' : 'https://open-api.bingx.com/openApi/swap/v2/quote/ticker',
            ['symbol' => $symbol]
        )->throw()->json();
        $ticker = $response['data'] ?? [];
        if (array_is_list($ticker)) $ticker = $ticker[0] ?? [];
        return $this->stats([
            'last_price' => $ticker['lastPrice'] ?? $ticker['last'] ?? null,
            'change_24h_percent' => $ticker['priceChangePercent'] ?? null,
            'high_24h' => $ticker['highPrice'] ?? $ticker['highPrice24h'] ?? null,
            'low_24h' => $ticker['lowPrice'] ?? $ticker['lowPrice24h'] ?? null,
            'volume_24h' => $ticker['volume'] ?? $ticker['volume24h'] ?? null,
            'turnover_24h' => $ticker['quoteVolume'] ?? $ticker['turnover24h'] ?? null,
            'bid_price' => $ticker['bidPrice'] ?? $ticker['bid1Price'] ?? null,
            'ask_price' => $ticker['askPrice'] ?? $ticker['ask1Price'] ?? null,
            'mark_price' => $ticker['markPrice'] ?? null,
            'index_price' => $ticker['indexPrice'] ?? null,
            'funding_rate' => $ticker['lastFundingRate'] ?? $ticker['fundingRate'] ?? null,
            'next_funding_time' => $ticker['nextFundingTime'] ?? null,
            'open_interest' => $ticker['openInterest'] ?? null,
        ]);
    }

    private function mexcStats(string $category, string $native): array
    {
        $spot = $category === 'spot';
        $response = $this->http()->get(
            $spot ? 'https://api.mexc.com/api/v3/ticker/24hr' : 'https://contract.mexc.com/api/v1/contract/ticker',
            ['symbol' => $native]
        )->throw()->json();
        $ticker = $spot ? $response : ($response['data'] ?? []);
        if (array_is_list($ticker)) $ticker = $ticker[0] ?? [];
        return $this->stats([
            'last_price' => $ticker['lastPrice'] ?? null,
            'change_24h_percent' => $spot ? ($ticker['priceChangePercent'] ?? null) : (isset($ticker['riseFallRate']) ? ((float) $ticker['riseFallRate'] * 100) : null),
            'high_24h' => $ticker['highPrice'] ?? $ticker['high24Price'] ?? null,
            'low_24h' => $ticker['lowPrice'] ?? $ticker['lower24Price'] ?? null,
            'volume_24h' => $ticker['volume'] ?? $ticker['volume24'] ?? null,
            'turnover_24h' => $ticker['quoteVolume'] ?? $ticker['amount24'] ?? null,
            'bid_price' => $ticker['bidPrice'] ?? $ticker['bid1'] ?? null,
            'ask_price' => $ticker['askPrice'] ?? $ticker['ask1'] ?? null,
            'mark_price' => $ticker['fairPrice'] ?? null,
            'index_price' => $ticker['indexPrice'] ?? null,
            'funding_rate' => $ticker['fundingRate'] ?? null,
            'next_funding_time' => $ticker['nextSettleTime'] ?? null,
            'open_interest' => $ticker['holdVol'] ?? null,
        ]);
    }

    private function coinGeckoFundamentals(string $base): ?array
    {
        $coinId = Cache::remember("market-metadata:coingecko-map:v1:{$base}", now()->addDay(), function () use ($base) {
            $coins = $this->coinGecko()->get('/search', ['query' => $base])->throw()->json('coins') ?? [];
            $matches = array_values(array_filter($coins, fn ($coin) => strtoupper((string) ($coin['symbol'] ?? '')) === $base));
            usort($matches, fn ($a, $b) => ($a['market_cap_rank'] ?? PHP_INT_MAX) <=> ($b['market_cap_rank'] ?? PHP_INT_MAX));
            return $matches[0]['id'] ?? '';
        });
        if (!$coinId) return null;

        return Cache::remember("market-metadata:coingecko:v1:{$coinId}", now()->addMinutes(5), function () use ($coinId) {
            $items = $this->coinGecko()->get('/coins/markets', [
                'vs_currency' => 'usd',
                'ids' => $coinId,
                'price_change_percentage' => '24h',
            ])->throw()->json();
            $coin = $items[0] ?? null;
            if (!$coin) return null;
            return [
                'provider_id' => $coin['id'] ?? $coinId,
                'name' => $coin['name'] ?? null,
                'symbol' => strtoupper((string) ($coin['symbol'] ?? '')),
                'logo_url' => $coin['image'] ?? null,
                'market_cap_rank' => $this->number($coin['market_cap_rank'] ?? null),
                'market_cap' => $this->number($coin['market_cap'] ?? null),
                'fully_diluted_valuation' => $this->number($coin['fully_diluted_valuation'] ?? null),
                'circulating_supply' => $this->number($coin['circulating_supply'] ?? null),
                'total_supply' => $this->number($coin['total_supply'] ?? null),
                'max_supply' => $this->number($coin['max_supply'] ?? null),
                'ath' => $this->number($coin['ath'] ?? null),
                'ath_date' => $coin['ath_date'] ?? null,
                'atl' => $this->number($coin['atl'] ?? null),
                'atl_date' => $coin['atl_date'] ?? null,
                'last_updated' => $coin['last_updated'] ?? null,
            ];
        });
    }

    private function coinGecko(): PendingRequest
    {
        $mode = config('services.coingecko.mode', 'demo');
        $header = $mode === 'pro' ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key';
        $baseUrl = $mode === 'pro' ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3';
        return $this->http()->baseUrl($baseUrl)->withHeaders([$header => config('services.coingecko.api_key')]);
    }

    private function http(): PendingRequest
    {
        return Http::acceptJson()->timeout(8)->retry(2, 200, throw: false)
            ->withOptions(['verify' => (bool) config('services.market_data.verify_tls', true)]);
    }

    private function stats(array $values): array
    {
        return array_map(fn ($value) => $this->number($value), array_replace($this->emptyStats(), $values));
    }

    private function emptyStats(): array
    {
        return array_fill_keys([
            'last_price', 'change_24h_percent', 'high_24h', 'low_24h', 'volume_24h', 'turnover_24h',
            'bid_price', 'ask_price', 'mark_price', 'index_price', 'funding_rate', 'next_funding_time', 'open_interest',
        ], null);
    }

    private function number(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function marketCoins(?MarketSymbol $saved, string $symbol): array
    {
        $base = strtoupper((string) ($saved?->base_coin ?: ''));
        $quote = strtoupper((string) ($saved?->quote_coin ?: ''));
        if ($base !== '') return [$base, $quote];
        foreach (['USDT', 'USDC', 'BUSD', 'USD', 'BTC', 'ETH'] as $candidate) {
            if (str_ends_with($symbol, $candidate) && strlen($symbol) > strlen($candidate)) {
                return [substr($symbol, 0, -strlen($candidate)), $candidate];
            }
        }
        return [$symbol, ''];
    }

    private function inferNativeSymbol(string $exchange, string $category, string $symbol): string
    {
        if ($exchange === 'okx') {
            foreach (['USDT', 'USDC', 'USD', 'BTC', 'ETH'] as $quote) {
                if (str_ends_with($symbol, $quote) && strlen($symbol) > strlen($quote)) {
                    $pair = substr($symbol, 0, -strlen($quote)).'-'.$quote;
                    return $category === 'spot' ? $pair : $pair.'-SWAP';
                }
            }
        }
        if ($exchange === 'bingx') {
            return preg_replace('/(USDT|USDC|USD)$/i', '-$1', $symbol);
        }
        if ($exchange === 'mexc' && $category !== 'spot') {
            return preg_replace('/(USDT|USDC|USD)$/i', '_$1', $symbol);
        }
        return $symbol;
    }

    protected function resolveSavedMarket(string $exchange, string $category, string $symbol): ?MarketSymbol
    {
        return MarketSymbol::query()->where('exchange', $exchange)->where('category', $category)
            ->where('symbol', $symbol)->first();
    }
}
