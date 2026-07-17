<?php

namespace App\Services;

use App\Models\MarketSymbol;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class MarketCurrentPriceService
{
    public function fetch(string $exchange, string $category, string $symbol): float
    {
        $exchange = strtolower($exchange);
        $category = strtolower($category);
        $symbol = strtoupper($symbol);
        $native = MarketSymbol::query()->where('exchange', $exchange)->where('category', $category)
            ->where('symbol', $symbol)->value('exchange_symbol') ?: $symbol;
        $http = $this->http();

        $payload = match ($exchange) {
            'binance' => $http->get(
                $category === 'spot' ? 'https://api.binance.com/api/v3/ticker/price' : 'https://fapi.binance.com/fapi/v1/ticker/price',
                ['symbol' => $native]
            )->throw()->json(),
            'bybit' => $http->get('https://api.bybit.com/v5/market/tickers', [
                'category' => $category === 'spot' ? 'spot' : $category,
                'symbol' => $native,
            ])->throw()->json(),
            'okx' => $http->get('https://www.okx.com/api/v5/market/ticker', ['instId' => $native])->throw()->json(),
            'bingx' => $http->get(
                $category === 'spot' ? 'https://open-api.bingx.com/openApi/spot/v1/ticker/price' : 'https://open-api.bingx.com/openApi/swap/v2/quote/ticker',
                ['symbol' => $this->bingxSymbol($native)]
            )->throw()->json(),
            'mexc' => $http->get(
                $category === 'spot' ? 'https://api.mexc.com/api/v3/ticker/price' : 'https://contract.mexc.com/api/v1/contract/ticker',
                ['symbol' => $native]
            )->throw()->json(),
            default => throw new RuntimeException("Unsupported alert exchange: {$exchange}"),
        };

        $price = match ($exchange) {
            'binance' => $payload['price'] ?? null,
            'bybit' => $payload['result']['list'][0]['lastPrice'] ?? null,
            'okx' => $payload['data'][0]['last'] ?? null,
            'bingx' => $payload['data']['price'] ?? $payload['data']['lastPrice'] ?? $payload['data'][0]['lastPrice'] ?? null,
            'mexc' => $category === 'spot' ? ($payload['price'] ?? null) : ($payload['data']['lastPrice'] ?? null),
        };

        if (!is_numeric($price) || (float) $price <= 0) {
            throw new RuntimeException("{$exchange} did not return a valid price for {$symbol}.");
        }
        return (float) $price;
    }

    private function http(): PendingRequest
    {
        return Http::acceptJson()->timeout(8)->retry(2, 250, throw: false);
    }

    private function bingxSymbol(string $symbol): string
    {
        return str_contains($symbol, '-') ? $symbol : preg_replace('/(USDT|USDC|USD)$/i', '-$1', $symbol);
    }
}
