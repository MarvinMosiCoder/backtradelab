# Market Data and Symbols

## Purpose

The market layer discovers instruments from supported exchanges, normalizes historical candles, and stores each user's saved symbols.

| Route/file | Responsibility |
|---|---|
| `GET /api/market-symbol-options` | Public exchange symbol discovery |
| `GET /api/klines` | Public normalized candles |
| `GET/POST/DELETE /market-symbols` | Authenticated saved-symbol collection |
| `GET /market-metadata` | Authenticated normalized exchange statistics and optional fundamentals |
| `POST /market-metadata/batch` | Authenticated metadata for up to 50 saved markets |
| `GET /market-overview` | Authenticated featured markets, active announcements, and configured tips |
| `MarketDataController.php` | Validation, exchange HTTP calls, normalization, caching |
| `MarketMetadataService.php` | Exchange ticker normalization and optional CoinGecko enrichment |
| `MarketOverviewService.php` | Compact Market Summary overview configuration and announcement excerpts |
| `MarketSymbol.php` | User-owned saved symbol |
| `utils/marketLabels.js` | Frontend market labels |

The public API routes are:

```php
Route::get('/market-symbol-options', [MarketDataController::class, 'availableSymbols']);
Route::get('/klines', [MarketDataController::class, 'klines']);
```

## Data flow

1. The chart requests available symbols for an exchange/category.
2. `MarketDataController` validates the exchange/category and calls the appropriate public exchange API.
3. Responses are converted into a common symbol shape.
4. Candle requests validate symbol/timeframe/range and return normalized OHLCV rows.
5. Authenticated save/delete actions scope `market_symbols` to `adm_user_id`.

Workspace loads metadata only when Market Info is opened. Market Summary loads `/market-overview`, merges its configured featured markets with the user's saved markets, deduplicates by exchange/category/symbol, and makes one metadata batch request. Exchange statistics are cached for 10 seconds. If `COINGECKO_API_KEY` is configured, exact-symbol search mappings are cached for 24 hours and fundamentals for five minutes; `COINGECKO_MODE` selects `demo` or `pro`. Missing keys, ambiguous assets, rate limits, and provider outages produce nullable fundamentals and warnings while the overview, saved-market list, and chart candles continue normally.

Featured market defaults and rotating educational tips live in `config/market_overview.php`. Deployments can override that configuration without coupling dashboard content to React. The default highlights are Bybit spot BTCUSDT, ETHUSDT, and SOLUSDT.

Normalized statistics include price/change/high/low, base volume, quote turnover, bid/ask, and supported derivative mark/index/funding/open-interest values. Fundamentals include identity/logo, rank, market cap, FDV, supply, ATH, and ATL.

Supported exchange-specific behavior is implemented in the controller and live-stream module; consult both before adding an exchange.

## Maintenance and failure handling

- Normalize timestamps, numeric OHLCV values, ordering, and duplicates at the boundary.
- Keep completed historical candles cacheable; `fresh=1` is used for live fallback.
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

Related: [Live streaming](live-market-streaming.md), [Trading chart](trading-chart.md).
