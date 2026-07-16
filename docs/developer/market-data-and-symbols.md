# Market Data and Symbols

## Purpose

The market layer discovers instruments from supported exchanges, normalizes historical candles, and stores each user's saved symbols.

| Route/file | Responsibility |
|---|---|
| `GET /api/market-symbol-options` | Public exchange symbol discovery |
| `GET /api/klines` | Public normalized candles |
| `GET/POST/DELETE /market-symbols` | Authenticated saved-symbol collection |
| `MarketDataController.php` | Validation, exchange HTTP calls, normalization, caching |
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

Related: [Live streaming](live-market-streaming.md), [Trading chart](trading-chart.md).
