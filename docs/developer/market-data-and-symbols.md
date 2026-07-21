# Market Data and Symbols

## Purpose

The market layer discovers instruments from supported exchanges, normalizes historical candles, and stores each user's saved symbols.

| Route/file | Responsibility |
|---|---|
| `GET /api/market-symbol-options` | Public exchange symbol discovery |
| `GET /api/klines` | Public normalized candles |
| `GET /api/featured-coins` | Public fixed BTC/ETH/SOL market and fundamentals summary |
| `GET/POST/DELETE /market-symbols` | Authenticated saved-symbol collection |
| `GET /market-metadata` | Authenticated normalized exchange statistics and optional fundamentals |
| `POST /market-metadata/batch` | Authenticated metadata for up to 50 saved markets |
| `GET /market-overview` | Authenticated featured markets, active announcements, and configured tips |
| `MarketDataController.php` | Validation, exchange HTTP calls, normalization, caching |
| `MarketMetadataService.php` | Exchange ticker normalization and optional CoinMarketCap enrichment |
| `MarketOverviewService.php` | Compact Market Summary overview configuration and announcement excerpts |
| `MarketSymbol.php` | User-owned saved symbol |
| `utils/marketLabels.js` | Frontend market labels |

The public API routes are:

```php
Route::get('/market-symbol-options', [MarketDataController::class, 'availableSymbols']);
Route::get('/klines', [MarketDataController::class, 'klines']);
Route::get('/featured-coins', FeaturedCoinController::class);
```

The featured-coins endpoint accepts no market input. It exposes only the fixed Bybit Spot BTCUSDT, ETHUSDT, and SOLUSDT set, sanitizes the existing metadata service output, isolates failures per coin, and uses a dedicated per-IP rate limit.

## Data flow

1. The chart requests available symbols for an exchange/category.
2. `MarketDataController` validates the exchange/category and calls the appropriate public exchange API.
3. Responses are converted into a common symbol shape.
4. Candle requests validate symbol/timeframe/range and return normalized OHLCV rows.
5. Authenticated save/delete actions scope `market_symbols` to `adm_user_id`.

Workspace loads metadata only when Market Info is opened. Market Summary loads `/market-overview`, merges its configured featured markets with the user's saved markets, deduplicates by exchange/category/symbol, and makes one metadata batch request. Exchange statistics are cached for 10 seconds. CoinMarketCap is the primary fundamentals provider when `COINMARKETCAP_API_KEY` is configured; exact-symbol mappings and static coin information are cached for 24 hours and changing fundamentals for five minutes. When CoinMarketCap is unconfigured, unavailable, invalid, rate-limited, or has no exact match, an optional `COINGECKO_API_KEY` (`COINGECKO_MODE=demo` or `pro`) supplies the fallback with the same mapping and fundamentals cache durations. Provider failures produce nullable fundamentals and warnings while the overview, saved-market list, and chart candles continue normally. CoinMarketCap's free latest-data endpoints do not reliably provide ATH/ATL, so those fields remain nullable unless the CoinGecko fallback supplies them.

Featured market defaults and rotating educational tips live in `config/market_overview.php`. Deployments can override that configuration without coupling dashboard content to React. The default highlights are Bybit spot BTCUSDT, ETHUSDT, and SOLUSDT.

Normalized statistics include price/change/high/low, base volume, quote turnover, bid/ask, and supported derivative mark/index/funding/open-interest values. Fundamentals include identity/logo, rank, market cap, FDV, supply, ATH, and ATL.

Supported exchange-specific behavior is implemented in the controller and live-stream module; consult both before adding an exchange.

## Maintenance and failure handling

- Normalize timestamps, numeric OHLCV values, ordering, and duplicates at the boundary.
- Keep completed historical candles cacheable; `fresh=1` is used for live fallback.
- Route exchange REST calls through `ExchangeMarketDataGateway`, which coalesces identical requests, enforces per-exchange budgets, serves stale successes during cooldowns, and honors 429/418 backoff.
- Normal history is capped by `MARKET_DATA_NORMAL_MAX_PAGES`; Replay uses `MARKET_DATA_REPLAY_MAX_PAGES`, accepts partial valid history, and tries at most one compatible fallback exchange.
- Validate saved-symbol ownership on delete.
- Expect partial exchange outages and return a usable error without leaking upstream details.
- When adding an exchange, update REST discovery, REST candles, WebSocket streaming, labels, UI options, CSP/network policy, and tests.

## Verification

- Each exchange/category/timeframe.
- Empty/invalid symbol and upstream timeout.
- Candle order and unique timestamps.
- Two users cannot see/delete each other's symbols.
- Cache and `fresh=1` behavior.
- Metadata authentication, validation, provider fixtures, caching, and graceful partial responses.
- Overview authentication, featured/saved deduplication, partial loading, empty-watchlist CTA, and responsive dark/light layouts.
- Dedicated public limits: symbol discovery 6/minute and candles 10/minute, or 30/minute for latest-candle fallback, per user/IP.
- Featured coins are limited to 30 requests/minute per IP and never expose provider credentials or raw upstream errors.

Related: [Live streaming](live-market-streaming.md), [Trading chart](trading-chart.md).
