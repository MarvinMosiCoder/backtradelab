<?php

namespace App\Http\Controllers;

use App\Models\MarketSymbol;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;

class MarketDataController extends Controller
{
    private const EXCHANGES = ['binance', 'bybit', 'okx', 'bingx', 'mexc'];

    public function symbols()
    {
        $symbols = MarketSymbol::query()
            ->where('is_active', true)
            ->orderBy('exchange')
            ->orderBy('symbol')
            ->get([
                'id',
                'symbol',
                'exchange',
                'exchange_symbol',
                'coin_name',
                'base_coin',
                'quote_coin',
                'category',
            ]);

        return response()->json([
            'success' => true,
            'symbols' => $symbols,
        ]);
    }

    public function availableSymbols(Request $request)
    {
        $validated = $request->validate([
            'category' => ['nullable', Rule::in(['spot', 'linear', 'inverse'])],
            'exchange' => ['nullable', Rule::in(self::EXCHANGES)],
        ]);

        $category = $validated['category'] ?? 'spot';
        $requestedExchange = $validated['exchange'] ?? null;

        try {
            $symbols = [];
            $errors = [];
            $exchanges = $requestedExchange ? [$requestedExchange] : self::EXCHANGES;

            foreach ($exchanges as $exchange) {
                $result = $this->fetchAvailableSymbolsForExchange($exchange, $category);

                foreach ($result['symbols'] as $item) {
                    $symbols[$item['exchange'] . ':' . $item['symbol']] = $item;
                }

                if (!empty($result['error'])) {
                    $errors[$exchange] = $result['error'];
                }
            }

            uasort($symbols, function ($a, $b) {
                return [$a['symbol'], $a['exchange']] <=> [$b['symbol'], $b['exchange']];
            });

            return response()->json([
                'success' => true,
                'symbols' => array_values($symbols),
                'errors' => $errors,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Server error while fetching available symbols',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function storeSymbol(Request $request)
    {
        $validated = $request->validate([
            'symbol' => ['required', 'string', 'max:32', 'regex:/^[A-Za-z0-9]+$/'],
            'exchange' => ['nullable', Rule::in(self::EXCHANGES)],
            'exchange_symbol' => ['nullable', 'string', 'max:64'],
            'coin_name' => ['nullable', 'string', 'max:64'],
            'base_coin' => ['nullable', 'string', 'max:32'],
            'quote_coin' => ['nullable', 'string', 'max:32'],
            'category' => ['nullable', Rule::in(['spot', 'linear', 'inverse'])],
        ]);

        $symbol = strtoupper($validated['symbol']);
        $exchange = strtolower($validated['exchange'] ?? 'bybit');
        $category = $validated['category'] ?? 'spot';

        $marketSymbol = MarketSymbol::query()->updateOrCreate(
            ['exchange' => $exchange, 'category' => $category, 'symbol' => $symbol],
            [
                'exchange_symbol' => strtoupper($validated['exchange_symbol'] ?? $symbol),
                'coin_name' => strtoupper($validated['coin_name'] ?? $validated['base_coin'] ?? ''),
                'base_coin' => strtoupper($validated['base_coin'] ?? ''),
                'quote_coin' => strtoupper($validated['quote_coin'] ?? ''),
                'category' => $category,
                'is_active' => true,
            ]
        );

        return response()->json([
            'success' => true,
            'symbol' => $marketSymbol->only([
                'id',
                'symbol',
                'exchange',
                'exchange_symbol',
                'coin_name',
                'base_coin',
                'quote_coin',
                'category',
            ]),
        ], $marketSymbol->wasRecentlyCreated ? 201 : 200);
    }

    public function klines(Request $request)
    {
        $symbol = strtoupper($request->query('symbol', 'BTCUSDT'));
        $interval = $request->query('interval', '60');
        $category = $request->query('category', 'spot');
        $exchange = strtolower($request->query('exchange', 'bybit'));

        // per-request chunk size for Bybit
        $chunkLimit = max(1, min((int) $request->query('limit', 1000), 1000));

        // total candles you want to return to frontend
        $maxCandles = max(1, min((int) $request->query('max_candles', 5000), 20000));

        $start = $request->query('start'); // ms timestamp
        $end = $request->query('end');     // ms timestamp

        $allowedCategories = ['spot', 'linear', 'inverse'];
        $allowedIntervals = ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', 'D', 'W', 'M'];

        if (!in_array($exchange, self::EXCHANGES, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid exchange',
            ], 422);
        }

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
            $futuresFallbacks = $end
                ? ['bybit', 'okx', 'binance', 'bingx', 'mexc']
                : ['bingx', 'bybit', 'mexc', 'okx', 'binance'];
            $candidateExchanges = $category === 'spot'
                ? [$exchange]
                : array_values(array_unique([$exchange, ...$futuresFallbacks]));
            $allRows = [];
            $usedExchange = $exchange;
            $fallbackErrors = [];

            foreach ($candidateExchanges as $candidateExchange) {
                $marketSymbol = MarketSymbol::query()
                    ->where('exchange', $candidateExchange)
                    ->where('category', $category)
                    ->where('symbol', $symbol)
                    ->first();
                $exchangeSymbol = $marketSymbol?->exchange_symbol ?: $this->inferExchangeSymbol($candidateExchange, $symbol, $category);
                $candidateRows = [];
                $seen = [];

                // if no end passed, let the exchange return its latest batch
                $currentEnd = $end ? (int) $end : null;

                // hard loop guard
                $maxRequests = 30;
                $requests = 0;

                while (count($candidateRows) < $maxCandles && $requests < $maxRequests) {
                    $rowsResult = $this->fetchKlineRows(
                        $candidateExchange,
                        $exchangeSymbol,
                        $symbol,
                        $category,
                        $interval,
                        $chunkLimit,
                        $currentEnd,
                        $start ? (int) $start : null
                    );

                    if (!$rowsResult['success']) {
                        $fallbackErrors[$candidateExchange] = $rowsResult['payload']['message'] ?? 'Failed to fetch market data';
                        break;
                    }

                    $rows = $rowsResult['rows'];

                    if (!is_array($rows) || empty($rows)) {
                        break;
                    }

                    foreach ($rows as $row) {
                        $ts = (int) ($row[0] ?? 0);
                        if ($ts <= 0) {
                            continue;
                        }

                        if (isset($seen[$ts])) {
                            continue;
                        }

                        $seen[$ts] = true;
                        $candidateRows[] = $row;
                    }

                    // move further back in time using oldest candle from this batch
                    $batchTimestamps = array_values(array_filter(
                        array_map(fn ($row) => (int) ($row[0] ?? 0), $rows),
                        fn ($timestamp) => $timestamp > 0
                    ));

                    if (!$batchTimestamps) {
                        break;
                    }

                    $oldestTs = min($batchTimestamps);
                    $nextEnd = $oldestTs - 1;

                    if ($start && $nextEnd < (int) $start) {
                        break;
                    }

                    if ($currentEnd !== null && $nextEnd >= $currentEnd) {
                        break;
                    }

                    $currentEnd = $nextEnd;
                    $requests++;
                }

                if (!empty($candidateRows)) {
                    $allRows = $candidateRows;
                    $usedExchange = $candidateExchange;
                    break;
                }

                $fallbackErrors[$candidateExchange] ??= 'No candle data returned';
            }

            // sort oldest -> newest
            usort($allRows, function ($a, $b) {
                return (int)$a[0] <=> (int)$b[0];
            });

            if (empty($allRows)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No candle data returned for this market and timeframe',
                    'exchange' => $exchange,
                    'category' => $category,
                    'symbol' => $symbol,
                    'fallbackErrors' => $fallbackErrors,
                ], 502);
            }

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
                'exchange' => $usedExchange,
                'requested_exchange' => $exchange,
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

    private function fetchAvailableSymbolsForExchange(string $exchange, string $category): array
    {
        try {
            $response = match ($exchange) {
                'binance' => $this->marketHttp()->get(
                    $category === 'spot'
                        ? 'https://api.binance.com/api/v3/exchangeInfo'
                        : 'https://fapi.binance.com/fapi/v1/exchangeInfo'
                ),
                'okx' => $this->marketHttp()->get('https://www.okx.com/api/v5/public/instruments', [
                    'instType' => $category === 'spot' ? 'SPOT' : 'SWAP',
                ]),
                'bingx' => $this->marketHttp()->get(
                    $category === 'spot'
                        ? 'https://open-api.bingx.com/openApi/spot/v1/common/symbols'
                        : 'https://open-api.bingx.com/openApi/swap/v2/quote/contracts'
                ),
                'mexc' => $this->marketHttp()->get(
                    $category === 'spot'
                        ? 'https://api.mexc.com/api/v3/exchangeInfo'
                        : 'https://contract.mexc.com/api/v1/contract/detail'
                ),
                default => $this->marketHttp()->get('https://api.bybit.com/v5/market/instruments-info', [
                    'category' => $category,
                    ...($category !== 'spot' ? ['limit' => 1000] : []),
                ]),
            };

            if (!$response->successful()) {
                return [
                    'symbols' => [],
                    'error' => 'HTTP ' . $response->status(),
                ];
            }

            $json = $response->json();

            return [
                'symbols' => $this->normalizeAvailableSymbols($exchange, $category, is_array($json) ? $json : []),
                'error' => null,
            ];
        } catch (\Throwable $e) {
            return [
                'symbols' => [],
                'error' => $e->getMessage(),
            ];
        }
    }

    private function normalizeAvailableSymbols(string $exchange, string $category, array $json): array
    {
        $symbols = [];

        if ($exchange === 'binance') {
            foreach (($json['symbols'] ?? []) as $item) {
                $status = $item['status'] ?? null;

                if ($status && !in_array($status, ['TRADING'], true)) {
                    continue;
                }

                $symbols[] = $this->symbolPayload(
                    $exchange,
                    strtoupper((string) ($item['symbol'] ?? '')),
                    strtoupper((string) ($item['symbol'] ?? '')),
                    $category,
                    $item['baseAsset'] ?? null,
                    $item['quoteAsset'] ?? null,
                    $status
                );
            }
        }

        if ($exchange === 'bybit') {
            if (($json['retCode'] ?? null) !== 0) {
                return [];
            }

            foreach (($json['result']['list'] ?? []) as $item) {
                $symbols[] = $this->symbolPayload(
                    $exchange,
                    strtoupper((string) ($item['symbol'] ?? '')),
                    strtoupper((string) ($item['symbol'] ?? '')),
                    $category,
                    $item['baseCoin'] ?? null,
                    $item['quoteCoin'] ?? null,
                    $item['status'] ?? null
                );
            }
        }

        if ($exchange === 'okx') {
            foreach (($json['data'] ?? []) as $item) {
                $exchangeSymbol = strtoupper((string) ($item['instId'] ?? ''));
                $normalizedSymbol = strtoupper(str_replace('-', '', str_replace('-SWAP', '', $exchangeSymbol)));
                $symbols[] = $this->symbolPayload(
                    $exchange,
                    $normalizedSymbol,
                    $exchangeSymbol,
                    $category,
                    $item['baseCcy'] ?? null,
                    $item['quoteCcy'] ?? $item['settleCcy'] ?? null,
                    $item['state'] ?? null
                );
            }
        }

        if ($exchange === 'bingx') {
            $list = $category === 'spot'
                ? ($json['data']['symbols'] ?? $json['data'] ?? [])
                : ($json['data'] ?? []);

            foreach ($list as $item) {
                $rawSymbol = (string) ($item['symbol'] ?? $item['contract'] ?? '');
                $symbols[] = $this->symbolPayload(
                    $exchange,
                    strtoupper(str_replace(['-', '_'], '', $rawSymbol)),
                    strtoupper($rawSymbol),
                    $category,
                    $item['baseAsset'] ?? $item['baseCoin'] ?? null,
                    $item['quoteAsset'] ?? $item['quoteCoin'] ?? null,
                    $item['status'] ?? null
                );
            }
        }

        if ($exchange === 'mexc') {
            $list = $category === 'spot'
                ? ($json['symbols'] ?? [])
                : ($json['data'] ?? []);

            foreach ($list as $item) {
                $rawSymbol = (string) ($item['symbol'] ?? '');
                $normalizedSymbol = strtoupper(str_replace('_', '', $rawSymbol));
                $symbols[] = $this->symbolPayload(
                    $exchange,
                    $normalizedSymbol,
                    strtoupper($rawSymbol),
                    $category,
                    $item['baseAsset'] ?? $item['baseCoinName'] ?? null,
                    $item['quoteAsset'] ?? $item['quoteCoinName'] ?? $item['quoteCoin'] ?? null,
                    $item['status'] ?? null
                );
            }
        }

        return array_values(array_filter($symbols, fn ($item) => !empty($item['symbol'])));
    }

    private function symbolPayload(
        string $exchange,
        string $symbol,
        string $exchangeSymbol,
        string $category,
        ?string $baseCoin,
        ?string $quoteCoin,
        ?string $status
    ): array {
        $baseCoin = strtoupper((string) $baseCoin);
        $quoteCoin = strtoupper((string) $quoteCoin);

        return [
            'symbol' => $symbol,
            'exchange' => $exchange,
            'exchangeLabel' => strtoupper($exchange),
            'exchange_symbol' => $exchangeSymbol ?: $symbol,
            'category' => $category,
            'coin_name' => $baseCoin ?: $symbol,
            'baseCoin' => $baseCoin,
            'quoteCoin' => $quoteCoin,
            'status' => $status,
        ];
    }

    private function fetchKlineRows(
        string $exchange,
        string $exchangeSymbol,
        string $symbol,
        string $category,
        string $interval,
        int $limit,
        ?int $end,
        ?int $start
    ): array {
        try {
            $response = match ($exchange) {
                'binance' => $this->marketHttp()->get(
                    $category === 'spot'
                        ? 'https://api.binance.com/api/v3/klines'
                        : 'https://fapi.binance.com/fapi/v1/klines',
                    [
                        'symbol' => $symbol,
                        'interval' => $this->mapInterval($exchange, $interval),
                        'limit' => min($limit, 1000),
                        ...($end ? ['endTime' => $end] : []),
                        ...($start ? ['startTime' => $start] : []),
                    ]
                ),
                'okx' => $this->marketHttp()->get('https://www.okx.com/api/v5/market/history-candles', [
                    'instId' => $exchangeSymbol,
                    'bar' => $this->mapInterval($exchange, $interval),
                    'limit' => min($limit, 300),
                    ...($end ? ['after' => $end] : []),
                ]),
                'bingx' => $this->marketHttp()->get(
                    $category === 'spot'
                        ? 'https://open-api.bingx.com/openApi/spot/v1/market/kline'
                        : 'https://open-api.bingx.com/openApi/swap/v3/quote/klines',
                    [
                    'symbol' => $exchangeSymbol,
                    'interval' => $this->mapInterval($exchange, $interval),
                    'limit' => min($limit, 1000),
                    ...($end ? ['endTime' => $end] : []),
                    ...($start ? ['startTime' => $start] : []),
                    ]
                ),
                'mexc' => $category === 'spot'
                    ? $this->marketHttp()->get('https://api.mexc.com/api/v3/klines', [
                        'symbol' => $symbol,
                        'interval' => $this->mapInterval($exchange, $interval),
                        'limit' => min($limit, 1000),
                        ...($end ? ['endTime' => $end] : []),
                        ...($start ? ['startTime' => $start] : []),
                    ])
                    : $this->marketHttp()->get('https://contract.mexc.com/api/v1/contract/kline/' . $exchangeSymbol, [
                        'interval' => $this->mapInterval($exchange, $interval),
                        ...($end ? ['end' => (int) floor($end / 1000)] : []),
                        ...($start ? ['start' => (int) floor($start / 1000)] : []),
                    ]),
                default => $this->marketHttp()->get('https://api.bybit.com/v5/market/kline', [
                    'category' => $category,
                    'symbol' => $symbol,
                    'interval' => $interval,
                    'limit' => $limit,
                    ...($end ? ['end' => $end] : []),
                    ...($start ? ['start' => $start] : []),
                ]),
            };

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'status' => $response->status(),
                    'payload' => [
                        'success' => false,
                        'message' => 'Failed to fetch market data',
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ],
                    'rows' => [],
                ];
            }

            $json = $response->json();

            if (!is_array($json)) {
                return [
                    'success' => false,
                    'status' => 502,
                    'payload' => [
                        'success' => false,
                        'message' => 'Exchange returned an invalid market data response',
                        'exchange' => $exchange,
                        'body' => substr($response->body(), 0, 500),
                    ],
                    'rows' => [],
                ];
            }

            $rows = $this->normalizeKlineRows($exchange, $json);

            return [
                'success' => true,
                'status' => 200,
                'payload' => [],
                'rows' => $rows,
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'status' => 500,
                'payload' => [
                    'success' => false,
                    'message' => 'Server error while fetching market data',
                    'error' => $e->getMessage(),
                ],
                'rows' => [],
            ];
        }
    }

    private function normalizeKlineRows(string $exchange, array $json): array
    {
        $rows = match ($exchange) {
            'binance' => $json,
            'okx' => $json['data'] ?? [],
            'bingx' => $json['data'] ?? [],
            'mexc' => $json['data']['time'] ?? null ? $this->normalizeMexcContractRows($json['data']) : $json,
            default => $json['result']['list'] ?? [],
        };

        if (!is_array($rows)) {
            return [];
        }

        return array_values(array_filter(array_map(function ($row) use ($exchange) {
            if (!is_array($row)) {
                return null;
            }

            if (in_array($exchange, ['bingx', 'mexc'], true) && isset($row['time'])) {
                return [
                    (int) $row['time'] * ((int) $row['time'] < 100000000000 ? 1000 : 1),
                    $row['open'] ?? 0,
                    $row['high'] ?? 0,
                    $row['low'] ?? 0,
                    $row['close'] ?? 0,
                    $row['volume'] ?? 0,
                ];
            }

            return [
                (int) ($row[0] ?? 0),
                $row[1] ?? 0,
                $row[2] ?? 0,
                $row[3] ?? 0,
                $row[4] ?? 0,
                $row[5] ?? 0,
            ];
        }, $rows)));
    }

    private function normalizeMexcContractRows(array $data): array
    {
        $times = $data['time'] ?? [];

        return array_map(function ($index, $time) use ($data) {
            return [
                'time' => $time,
                'open' => $data['open'][$index] ?? 0,
                'high' => $data['high'][$index] ?? 0,
                'low' => $data['low'][$index] ?? 0,
                'close' => $data['close'][$index] ?? 0,
                'volume' => $data['vol'][$index] ?? $data['volume'][$index] ?? 0,
            ];
        }, array_keys($times), $times);
    }

    private function inferExchangeSymbol(string $exchange, string $symbol, string $category = 'spot'): string
    {
        if ($exchange === 'okx') {
            foreach (['USDT', 'USDC', 'BTC', 'ETH'] as $quote) {
                if (str_ends_with($symbol, $quote)) {
                    $baseSymbol = substr($symbol, 0, -strlen($quote)) . '-' . $quote;
                    return $category === 'spot' ? $baseSymbol : $baseSymbol . '-SWAP';
                }
            }
        }

        if ($exchange === 'bingx') {
            foreach (['USDT', 'USDC', 'BTC', 'ETH'] as $quote) {
                if (str_ends_with($symbol, $quote)) {
                    return substr($symbol, 0, -strlen($quote)) . '-' . $quote;
                }
            }
        }

        if ($exchange === 'mexc') {
            foreach (['USDT', 'USDC', 'BTC', 'ETH'] as $quote) {
                if (str_ends_with($symbol, $quote)) {
                    return substr($symbol, 0, -strlen($quote)) . '_' . $quote;
                }
            }
        }

        return $symbol;
    }

    private function mapInterval(string $exchange, string $interval): string
    {
        $minutes = [
            '1' => '1m',
            '3' => '3m',
            '5' => '5m',
            '15' => '15m',
            '30' => '30m',
            '60' => '1h',
            '120' => '2h',
            '240' => '4h',
            '360' => '6h',
            '720' => '12h',
            'D' => '1d',
            'W' => '1w',
            'M' => '1M',
        ];

        if ($exchange === 'okx') {
            return [
                '60' => '1H',
                '120' => '2H',
                '240' => '4H',
                '360' => '6H',
                '720' => '12H',
                'D' => '1D',
                'W' => '1W',
                'M' => '1M',
            ][$interval] ?? ($minutes[$interval] ?? $interval);
        }

        if ($exchange === 'mexc') {
            return [
                '1' => 'Min1',
                '5' => 'Min5',
                '15' => 'Min15',
                '30' => 'Min30',
                '60' => 'Min60',
                '240' => 'Hour4',
                'D' => 'Day1',
                'W' => 'Week1',
                'M' => 'Month1',
            ][$interval] ?? ($minutes[$interval] ?? $interval);
        }

        return $minutes[$interval] ?? $interval;
    }

    private function marketHttp()
    {
        return Http::withOptions([
            'verify' => false, // local only
        ])
            ->withHeaders([
                'User-Agent' => 'Mozilla/5.0',
                'Accept' => '*/*',
            ])
            ->timeout(20);
    }
}
