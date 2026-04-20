<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class MarketDataController extends Controller
{
    public function klines(Request $request)
    {
        $symbol = strtoupper($request->query('symbol', 'BTCUSDT'));
        $interval = $request->query('interval', '60');
        $category = $request->query('category', 'spot');
        $limit = max(1, min((int) $request->query('limit', 500), 1000));

        $allowedCategories = ['spot', 'linear', 'inverse'];
        $allowedIntervals = ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', 'D', 'W', 'M'];

        if (!in_array($category, $allowedCategories, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid category',
            ], 422);
        }

        if (!in_array($interval, $allowedIntervals, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid interval',
            ], 422);
        }

        try {
            $response = Http::withOptions([
                'verify' => false, // local only
            ])
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0',
                    'Accept' => '*/*',
                ])
                ->timeout(15)
                ->get('https://api.bybit.com/v5/market/kline', [
                    'category' => $category,
                    'symbol' => $symbol,
                    'interval' => $interval,
                    'limit' => $limit,
                ]);

            if (!$response->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch market data',
                    'status' => $response->status(),
                    'body' => $response->body(),
                ], $response->status());
            }

            $json = $response->json();

            if (!is_array($json)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid response from Bybit',
                ], 500);
            }

            if (($json['retCode'] ?? null) !== 0) {
                return response()->json([
                    'success' => false,
                    'message' => $json['retMsg'] ?? 'Bybit API error',
                    'data' => $json,
                ], 400);
            }

            $rows = $json['result']['list'] ?? [];

            if (!is_array($rows)) {
                $rows = [];
            }

            $rows = array_reverse($rows);

            $candles = array_map(function ($item) {
                return [
                    'time' => ((int) $item[0]) / 1000,
                    'open' => (float) $item[1],
                    'high' => (float) $item[2],
                    'low' => (float) $item[3],
                    'close' => (float) $item[4],
                    'volume' => (float) $item[5],
                ];
            }, $rows);

            return response()->json([
                'success' => true,
                'candles' => $candles,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error while fetching market data',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}