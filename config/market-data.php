<?php

return [
    'require_redis_in_production' => env('MARKET_DATA_REQUIRE_REDIS', true),
    'latest_cache_seconds' => max(1, (int) env('MARKET_DATA_LATEST_CACHE_SECONDS', 5)),
    'request_cache_seconds' => max(1, (int) env('MARKET_DATA_REQUEST_CACHE_SECONDS', 30)),
    'stale_cache_seconds' => max(30, (int) env('MARKET_DATA_STALE_CACHE_SECONDS', 300)),
    'poll_seconds' => max(5, (int) env('MARKET_DATA_POLL_SECONDS', 10)),
    'cooldown_max_seconds' => max(30, (int) env('MARKET_DATA_COOLDOWN_MAX_SECONDS', 900)),
    'normal_max_pages' => max(1, (int) env('MARKET_DATA_NORMAL_MAX_PAGES', 10)),
    'replay_max_pages' => max(1, (int) env('MARKET_DATA_REPLAY_MAX_PAGES', 20)),
    'budgets_per_second' => [
        'binance' => max(1, (int) env('MARKET_DATA_BINANCE_RPS', 20)),
        'bybit' => max(1, (int) env('MARKET_DATA_BYBIT_RPS', 60)),
        'okx' => max(1, (int) env('MARKET_DATA_OKX_RPS', 8)),
        'bingx' => max(1, (int) env('MARKET_DATA_BINGX_RPS', 8)),
        'mexc' => max(1, (int) env('MARKET_DATA_MEXC_RPS', 8)),
    ],
];
