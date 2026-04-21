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

        // per-request chunk size for Bybit
        $chunkLimit = max(1, min((int) $request->query('limit', 1000), 1000));

        // total candles you want to return to frontend
        $maxCandles = max(1, min((int) $request->query('max_candles', 5000), 20000));

        $start = $request->query('start'); // ms timestamp
        $end = $request->query('end');     // ms timestamp

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
            $allRows = [];
            $seen = [];

            // if no end passed, use "now"
            $currentEnd = $end ? (int) $end : (int) floor(microtime(true) * 1000);

            // hard loop guard
            $maxRequests = 30;
            $requests = 0;

            while (count($allRows) < $maxCandles && $requests < $maxRequests) {
                $query = [
                    'category' => $category,
                    'symbol'   => $symbol,
                    'interval' => $interval,
                    'limit'    => $chunkLimit,
                    'end'      => $currentEnd,
                ];

                if ($start) {
                    $query['start'] = (int) $start;
                }

                $response = Http::withOptions([
                    'verify' => false, // local only
                ])
                    ->withHeaders([
                        'User-Agent' => 'Mozilla/5.0',
                        'Accept' => '*/*',
                    ])
                    ->timeout(20)
                    ->get('https://api.bybit.com/v5/market/kline', $query);

                if (!$response->successful()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Failed to fetch market data',
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ], $response->status());
                }

                $json = $response->json();

                if (!is_array($json) || ($json['retCode'] ?? null) !== 0) {
                    return response()->json([
                        'success' => false,
                        'message' => $json['retMsg'] ?? 'Bybit API error',
                        'data' => $json,
                    ], 400);
                }

                $rows = $json['result']['list'] ?? [];

                if (!is_array($rows) || empty($rows)) {
                    break;
                }

                // Bybit returns newest first
                foreach ($rows as $row) {
                    $ts = (int) ($row[0] ?? 0);
                    if ($ts <= 0) {
                        continue;
                    }

                    if (isset($seen[$ts])) {
                        continue;
                    }

                    $seen[$ts] = true;
                    $allRows[] = $row;
                }

                // move further back in time using oldest candle from this batch
                $oldestTs = (int) end($rows)[0];
                $nextEnd = $oldestTs - 1;

                if ($start && $nextEnd < (int) $start) {
                    break;
                }

                if ($nextEnd >= $currentEnd) {
                    break;
                }

                $currentEnd = $nextEnd;
                $requests++;
            }

            // sort oldest -> newest
            usort($allRows, function ($a, $b) {
                return (int)$a[0] <=> (int)$b[0];
            });

            // trim to latest maxCandles if needed
            if (count($allRows) > $maxCandles) {
                $allRows = array_slice($allRows, -$maxCandles);
            }

            $candles = array_map(function ($item) {
                return [
                    'time'   => ((int) $item[0]) / 1000,
                    'open'   => (float) $item[1],
                    'high'   => (float) $item[2],
                    'low'    => (float) $item[3],
                    'close'  => (float) $item[4],
                    'volume' => (float) $item[5],
                ];
            }, $allRows);

            return response()->json([
                'success' => true,
                'count' => count($candles),
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