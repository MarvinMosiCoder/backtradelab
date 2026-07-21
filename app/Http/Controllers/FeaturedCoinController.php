<?php

namespace App\Http\Controllers;

use App\Services\MarketMetadataService;
use Illuminate\Http\JsonResponse;

class FeaturedCoinController extends Controller
{
    private const MARKETS = [
        ['symbol' => 'BTCUSDT', 'base_coin' => 'BTC'],
        ['symbol' => 'ETHUSDT', 'base_coin' => 'ETH'],
        ['symbol' => 'SOLUSDT', 'base_coin' => 'SOL'],
    ];

    public function __invoke(MarketMetadataService $metadata): JsonResponse
    {
        $items = collect(self::MARKETS)->map(function (array $market) use ($metadata) {
            try {
                $result = $metadata->get('bybit', 'spot', $market['symbol']);
            } catch (\Throwable $exception) {
                report($exception);
                $result = [
                    'warnings' => ['Market information is temporarily unavailable.'],
                    'updated_at' => now()->toIso8601String(),
                ];
            }
            $stats = $result['stats'] ?? [];
            $fundamentals = $result['fundamentals'] ?? [];

            return [
                'market' => [
                    'exchange' => 'bybit',
                    'category' => 'spot',
                    'symbol' => $market['symbol'],
                    'base_coin' => $market['base_coin'],
                    'quote_coin' => 'USDT',
                ],
                'stats' => [
                    'last_price' => $stats['last_price'] ?? null,
                    'change_24h_percent' => $stats['change_24h_percent'] ?? null,
                    'high_24h' => $stats['high_24h'] ?? null,
                    'low_24h' => $stats['low_24h'] ?? null,
                    'volume_24h' => $stats['volume_24h'] ?? null,
                ],
                'fundamentals' => [
                    'name' => $fundamentals['name'] ?? null,
                    'logo_url' => $fundamentals['logo_url'] ?? null,
                    'market_cap_rank' => $fundamentals['market_cap_rank'] ?? null,
                    'market_cap' => $fundamentals['market_cap'] ?? null,
                ],
                'sources' => array_values(array_filter($result['sources'] ?? [])),
                'warnings' => array_values(array_filter($result['warnings'] ?? [])),
                'updated_at' => $result['updated_at'] ?? now()->toIso8601String(),
            ];
        });

        return response()->json(['items' => $items->values()]);
    }
}
