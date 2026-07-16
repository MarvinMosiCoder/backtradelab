# Replay and Progress

## Purpose

Replay hides future candles, advances historical data at selected speeds, and resumes a user's last market-specific candle/price.

| Route/file | Responsibility |
|---|---|
| `GET/PUT /market-replay-progress` | Read/write resume state |
| `MarketReplayProgressController.php` | Validation, ownership, conflict ordering |
| `MarketReplayProgress.php` | Per-user/per-market progress |
| `TradingViewChart.jsx`, `ReplayPanel.jsx` | Replay selection, playback, controls |
| `GET /replay-access` | Entitlement gate |

The update route requires replay access:

```php
Route::put('/market-replay-progress', [MarketReplayProgressController::class, 'update'])
    ->middleware('replay.access');
```

## Flow

1. User starts replay; the chart first checks `/replay-access`.
2. If denied, the subscription modal opens. Access checking is deduplicated in the UI.
3. The user selects a historical candle and playback begins.
4. Live socket/polling stops and only candles through the replay index render.
5. Progress is periodically saved with market identity and `client_saved_at`.
6. On reload/market return, the server record restores the replay location.

## Safety and maintenance

- Scope progress by authenticated user, exchange, category, symbol, and timeframe.
- Use client/server ordering data to prevent a delayed request overwriting newer progress.
- Trial activation must be explicit; loading the workspace must not start it.
- New replay state must be added to both persistence payload and restoration logic.

## Verification

- Denied, trial, paid, expired, timeout, and retry states.
- Resume after reload and across markets.
- Rapid save ordering and multiple tabs.
- Back-to-live restarts streaming and goes to current time.

Related: [Subscriptions](subscriptions-trials-and-paymongo.md), [Streaming](live-market-streaming.md).
