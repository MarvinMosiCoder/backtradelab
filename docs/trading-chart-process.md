# Trading Chart Process Documentation

## Overview

The Market Analysis chart is a TradingView-style crypto chart built with React and `lightweight-charts`. It renders candlesticks and volume, supports replay mode, and includes local drawing tools for trend lines, Fibonacci retracement/extension, measurement, boxes, long/short positions, forecasting, and text notes.

Chart symbols are stored in the database through `market_symbols`. Candle data comes from the Laravel API endpoint `/api/klines`, which fetches exchange kline data and returns normalized candles to the frontend.

---

## Architecture

```text
User Browser
  resources/js/Pages/Market/Market.jsx
    imports TradingViewChart

  resources/js/Components/Market/TradingViewChart.jsx
    owns chart state, Lightweight Charts refs, data fetching, replay, drawing events

  resources/js/Components/Market/TradingViewChart/
    ChartHeader.jsx
    ReplayPanel.jsx
    ChartStage.jsx
    constants.js
    utils.js

Laravel Backend
  routes/api.php
    GET /market-symbols (authenticated)
    GET /api/market-symbol-options
    POST /market-symbols (authenticated)
    GET /api/klines

  app/Http/Controllers/MarketDataController.php
    lists/saves market symbols
    fetches available Binance, OKX, Bybit, BingX, and MEXC symbols
    validates params
    fetches exchange klines
    normalizes candles

  app/Models/MarketSymbol.php
    Eloquent model for saved symbols

  database/migrations/...create_market_symbols_table.php
    creates market_symbols table

External API
  Binance, OKX, Bybit, BingX, and MEXC market/symbol endpoints
```

---

## Component Files

| File | Purpose |
|------|---------|
| `resources/js/Pages/Public/Home.jsx` | Public front page for `/`, with dark/white localStorage theme toggle, black-theme-aligned navbar/search/hero controls, marketing hero, and sign-in dropdown |
| `resources/js/Pages/Auth/Login.jsx` | Dedicated `/login` sign-in form that reads the saved public theme preference, matches the black public theme surfaces, and offers password, Google, and Facebook sign-in with brand-colored social buttons |
| `resources/js/Pages/Public/PrivacyPolicy.jsx` | Public Google-compatible privacy notice covering OAuth identity data, workspace content, subscriptions, retention, security, and Philippine data-subject rights |
| `resources/js/Pages/Public/TermsOfService.jsx` | Public service terms covering eligibility, educational simulation, subscriptions, acceptable use, third parties, disclaimers, and Philippine governing law |
| `resources/js/Pages/Public/LegalPage.jsx` | Shared responsive, theme-aware legal-page shell |
| `config/legal.php` | Environment-backed legal operator, contact, jurisdiction, and effective-date configuration |
| `resources/js/Layouts/layout/AppContent.jsx` | Authenticated content shell with a dynamic content area so large pages like the chart can size and scroll naturally |
| `resources/js/Pages/Dashboard/Dashboard.jsx` | Superadmin dashboard cards, or chart-first trader dashboard for non-superadmin users |
| `resources/js/Layouts/layout/AppSidebar.jsx` | Authenticated sidebar shell that only renders `AdminSidebar` when the current privilege is superadmin |
| `resources/js/Layouts/layout/AppNavbar.jsx` | Authenticated navbar with normal user quick links for Chart, PnL, and saved symbol selection |
| `resources/js/Layouts/layout/TraderNavbar.jsx` | Compact role-aware trader terminal header with market selection, Chart/Journal navigation, an Assets wallet for demo-account details/history/reset, theme control, user role, and logout |
| `resources/js/Layouts/layout/TraderSidebar.jsx` | Collapsible trader navigation rail for workspace, market chart, journal, profile, and password security |
| `resources/js/Layouts/layout/AdminNavbar.jsx` | Superadmin terminal header with sidebar control, Overview/Users/Feedback/Settings shortcuts, notifications, theme control, profile identity, and themed logout dialog |
| `resources/js/Pages/Market/Market.jsx` | Market page that renders the chart without reserving extra viewport-height space below it |
| `resources/js/Pages/Market/TradeReportPage.jsx` | Trade reporting page that renders the standalone calendar module and PnL report table module |
| `resources/js/Pages/Feedback/Index.jsx` | Trader feedback form and personal submission/status/response history |
| `resources/js/Pages/Feedback/AdminIndex.jsx` | Superadmin feedback inbox with search, filtering, prioritization, workflow status, and responses |
| `resources/js/Components/Market/TradingViewChart.jsx` | Main container for chart state, refs, data fetching, replay logic, and pointer/keyboard events |
| `resources/js/Components/Market/TradeCalendar.jsx` | Standalone trade calendar module showing daily PnL and win/loss counts by close date |
| `resources/js/Components/Market/TradeReport.jsx` | PnL report module with summary cards, CSV/JSON export, closed-trades table, snapshots, and journal editing |
| `resources/js/Components/Market/TradingViewChart/ChartHeader.jsx` | Responsive chart command bar with symbol management, market/timeframe controls, replay, alerts, themed indicators, and appearance controls; fullscreen uses a compact variant |
| `resources/js/Components/Market/TradingViewChart/ReplayPanel.jsx` | TradingView-style left rail with grouped flyouts for replay controls, drawing tools, and position entry/management, plus a compact top tool editor for drawing styles and presets |
| `resources/js/Components/Market/TradingViewChart/ChartStage.jsx` | Chart DOM container, app logo brand mark, fullscreen button, SVG drawing overlay, resize handles, text input popover with icon actions |
| `resources/js/Components/Market/TradingViewChart/constants.js` | Timeframes, playback speeds, chart size, drawing colors, drawing widths |
| `resources/js/Components/Market/TradingViewChart/utils.js` | Candle normalization, coordinate helpers, drawing storage keys, drawing movement/color helpers |
| `resources/js/Context/ThemeContext.jsx` | Provides the authenticated admin theme class used by the chart to choose dark or white chart colors |
| `app/Http/Controllers/MarketDrawingController.php` | Loads and saves chart drawings per authenticated user and symbol |
| `app/Http/Controllers/MarketToolSettingController.php` | Loads and saves reusable per-user tool defaults |
| `app/Http/Controllers/MarketBacktestController.php` | Loads paper account/session state, starts/ends backtest sessions, places market/limit/trigger replay entries, updates chart-dragged SL/TP and pending entry prices, updates trade journal notes/tags, triggers pending entries, cancels pending entries, closes replay positions, and resets the demo account |
| `app/Http/Controllers/UserFeedbackController.php` | Owns trader feedback submission/history and superadmin-only inbox/update endpoints |
| `routes/api.php` | Defines public market-data endpoints `/api/market-symbol-options` and `/api/klines` |
| `routes/web.php` | Defines public `/`, `/login`, authenticated `/market-drawings`, `/market-tool-settings`, and `/market-backtest/*` routes |
| `app/Http/Controllers/MarketDataController.php` | Lists/saves symbols, fetches Binance/OKX/Bybit/BingX/MEXC symbol options, and fetches/normalizes candle data |
| `app/Models/MarketSymbol.php` | Eloquent model for symbols saved in the database |
| `app/Models/MarketDrawing.php` | Eloquent model for per-user saved chart drawings |
| `app/Models/MarketToolSetting.php` | Eloquent model for per-user reusable chart tool defaults |
| `app/Models/MarketReplayProgress.php` | Stores each user's last replay candle and selected price per market |
| `app/Models/MarketBacktestAccount.php` | Eloquent model for a user's paper backtest account |
| `app/Models/MarketBacktestSession.php` | Eloquent model for named backtest sessions that group replay positions and trades |
| `app/Models/MarketBacktestPosition.php` | Eloquent model for open/closed simulated positions |
| `app/Models/MarketBacktestTrade.php` | Eloquent model for simulated trade history |
| `database/migrations/2026_05_06_000001_create_market_symbols_table.php` | Creates the `market_symbols` table |
| `database/migrations/2026_05_12_000002_create_market_drawings_table.php` | Creates the `market_drawings` table |
| `database/migrations/2026_05_12_000003_create_market_tool_settings_table.php` | Creates the `market_tool_settings` table |
| `database/migrations/2026_05_13_000001_create_market_backtest_accounts_table.php` | Creates paper trading accounts |
| `database/migrations/2026_05_13_000002_create_market_backtest_positions_table.php` | Creates simulated position records |
| `database/migrations/2026_05_13_000003_create_market_backtest_trades_table.php` | Creates simulated trade history |
| `database/migrations/2026_05_24_000001_create_market_backtest_sessions_table.php` | Creates backtest sessions and links positions/trades to sessions |
| `database/migrations/2026_05_24_000002_add_journal_fields_to_market_backtest_positions.php` | Adds setup tags, freeform tags, reasons, mistake, emotion, and notes to closed position records |
| `database/migrations/2026_05_24_000003_create_market_backtest_snapshots_table.php` | Stores entry/exit chart snapshot file links for backtest positions |

---

## Data Flow

### 1. Public Entry and Theme

The unauthenticated root route `/` renders `resources/js/Pages/Public/Home.jsx`. Authenticated users who visit `/` are redirected to `dashboard`. The public page is a website-style hero page with a dark navbar, logo/title on the left, search plus `Products`, `Community`, `Market`, and `More` navigation in the middle, and a login dropdown on the right.

The dedicated login form lives at `/login` and renders `resources/js/Pages/Auth/Login.jsx`. The public page links to `/login` from the hero CTA and the login dropdown. The Inertia page resolver in `resources/js/app.jsx` excludes both `Auth/*` and `Public/*` pages from the authenticated app sidebar layout.

Login supports the existing admin-created email/password flow plus Google and Facebook OAuth through Laravel Socialite. Social sign-in routes are:

| Route | Purpose |
|-------|---------|
| `GET /auth/google/redirect` | Redirect to Google OAuth |
| `GET /auth/google/callback` | Handle Google OAuth callback |
| `GET /auth/facebook/redirect` | Redirect to Facebook OAuth |
| `GET /auth/facebook/callback` | Handle Facebook OAuth callback |

Google OAuth supports both sign-in and self-registration. The callback first matches an existing provider identity, then falls back to the returned email. If neither exists, it creates an active `adm_users` record with the first configured non-superadmin privilege, a secure random local password, Google identity fields, disabled password login, and a seven-day replay trial. Existing inactive accounts remain blocked. After either lookup or creation, `LoginController` reuses the same menu, privilege, theme, profile, notification, and announcement session setup as password login. Google redirects include `prompt=select_account`, so the browser displays the Google account picker even when a Google session is already active.

OAuth-linked users store their latest provider identity on `adm_users`. Newly created Google accounts and accounts that still have the admin-created temporary password keep password login disabled. From an authenticated social session, the user can create a strong local password without entering the unknown generated or temporary password; this enables email/password login afterward. Accounts that already have a real local password keep password login enabled.

The login form keeps the social actions visually recognizable in both dark and white public themes. The Google action uses a white button with the four-color Google SVG mark and dark label text. The Facebook action uses the standard Facebook blue button with white label text.

OAuth credentials are configured in `.env`:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"

FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
FACEBOOK_REDIRECT_URI="${APP_URL}/auth/facebook/callback"
```

Public legal pages are available at `/privacy-policy` and `/terms-of-service`. Both use the public dark/white theme, are linked from the homepage footer and login form, and are excluded from the authenticated application layout. Their operator identity is configured through `LEGAL_OPERATOR_NAME`, `LEGAL_CONTACT_EMAIL`, `LEGAL_JURISDICTION`, and `LEGAL_EFFECTIVE_DATE`. The Google OAuth consent screen must use the same production privacy-policy and terms URLs shown on the verified BacktradeLab domain.

Authentication entry points use named Laravel rate limiters. Password login permits five attempts per minute for an email/IP combination and thirty attempts per minute for an IP. A successful password login clears the email/IP limiter. Password-reset requests permit three attempts per minute per email/IP and ten per hour per IP; reset confirmation permits ten per minute per IP. Social-login redirects permit twenty per minute per IP and callbacks permit sixty. Production must use a shared Redis cache and correctly configured trusted proxies so these limits are consistent across application servers and use the real client IP.

The public theme preference is browser-only for now. `Home.jsx` stores the selected mode in:

```javascript
localStorage.setItem('backtradelab-theme', 'dark' | 'white');
```

`Home.jsx` toggles the value from the login dropdown. `Login.jsx` reads the same `backtradelab-theme` key on load so the sign-in page follows the visitor's selected dark or white theme. This theme preference is not saved to the database yet.

The dark public theme is aligned with the authenticated BacktradeLab black theme rather than the older blue tone. Public dark surfaces use the same visual family as the chart shell: `bg-black-screen-color` for page background, `bg-skin-black` for main panels/nav surfaces, `bg-black-table-color` for compact controls/cards, gray borders, and white primary calls to action. The white public theme remains light with dark text and subtle slate borders.

### 2. Symbol List

`TradingViewChart.jsx` loads saved symbols on mount:

```javascript
const response = await fetch('/market-symbols', {
  headers: { Accept: 'application/json' },
});
```

The response shape is:

```json
{
  "success": true,
  "symbols": [
    {
      "id": 1,
      "symbol": "BTCUSDT",
      "exchange": "bybit",
      "exchange_symbol": "BTCUSDT",
      "coin_name": "BTC",
      "base_coin": "BTC",
      "quote_coin": "USDT",
      "category": "spot"
    }
  ]
}
```

`TradingViewChart.jsx` also loads the available add-symbol options from Binance, OKX, Bybit, BingX, and MEXC through Laravel. The chart header has a Market selector for Spot or Futures; Futures uses the backend `linear` category.

```javascript
const response = await fetch('/api/market-symbol-options?category=spot', {
  headers: { Accept: 'application/json' },
});
```

The response contains tradable instruments:

```json
{
  "success": true,
  "symbols": [
    {
      "symbol": "ETHUSDT",
      "exchange": "okx",
      "exchange_symbol": "ETH-USDT",
      "category": "spot",
      "coin_name": "ETH",
      "baseCoin": "ETH",
      "quoteCoin": "USDT",
      "status": "Trading"
    }
  ]
}
```

Users add symbols from `ChartHeader.jsx` by clicking `Add Symbol`, searching the available-symbol list, then clicking the plus icon beside a symbol. The frontend sends:

```javascript
await fetch('/market-symbols', {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    symbol: normalizedSymbol,
    exchange: 'okx',
    exchange_symbol: 'ETH-USDT',
    coin_name: 'ETH',
    base_coin: 'ETH',
    quote_coin: 'USDT',
    category: 'spot',
  }),
});
```

The backend uppercases and validates symbols with `/^[A-Za-z0-9]+$/`, then stores them in `market_symbols` with the authenticated user, source exchange, market category, native exchange symbol, coin name, base coin, and quote coin. Database uniqueness is by `user + exchange + category + symbol`, so every user owns an independent saved-symbol list and the same market can be saved from multiple exchanges and as both spot and futures.

Market-category storage keeps exchange-compatible values such as `spot` and `linear`. User-facing formatters display `spot` as `Spot` and `linear`/`inverse` as `Futures / Perpetual`, so traders do not see backend category terminology in chart headers, symbol pickers, Market Summary, navbar selectors, or watchlists.

After a symbol is saved, `TradingViewChart.jsx` inserts it into the saved-symbol list, selects it as the active chart symbol, and the candle request reloads for that symbol.

The currently selected saved symbol can be removed from the normal or fullscreen chart header. Removal is presented as an icon-only trash action with an accessible label so it takes minimal toolbar space. It removes only the authenticated user's saved-symbol record; it does not delete that market's chart drawings.

### 3. Frontend Candle Request

`TradingViewChart.jsx` fetches candles whenever `symbol` or `timeframe` changes.

```javascript
const params = new URLSearchParams({
  symbol,
  exchange,
  interval,
  category: 'spot',
  limit: '1000',
  max_candles: wasInReplay ? '10000' : '5000',
});

const response = await fetch(`/api/klines?${params.toString()}`, {
  headers: { Accept: 'application/json' },
});
```

When replay mode is active, timeframe changes anchor the candle request around the current replay candle and saved drawing timestamps. The frontend passes an `end` timestamp to `/api/klines` so lower timeframes load candles around the active replay area instead of only loading the latest market data. This prevents the chart and tools from disappearing when switching from a higher timeframe to a lower one whose latest candle window would otherwise not include the old replay/drawing time.

Fetched candles are cached in memory by exchange, market category, symbol, timeframe, and replay anchor. If the user switches back to a previously loaded timeframe, `TradingViewChart.jsx` renders the cached candles immediately and refreshes them in the background. Timeframe changes do not show the blocking chart loader while existing candle data is already visible; the current chart stays on screen until cached or freshly fetched candles are applied. The full loading overlay is reserved for the initial empty chart load. Before changing timeframe, the frontend captures the current visible center time and logical bar span, then restores that bar span around the matching candle after the new timeframe renders. This avoids `fitContent()` and keeps the user's zoom density from shrinking on every timeframe switch. Replay drawing framing can still override this when it needs to keep the replay candle and drawings visible. The current active candle request is aborted when a newer timeframe request starts, so rapid timeframe clicks do not let older responses replace the newest chart. In live mode, the chart also prefetches nearby common timeframes after the active timeframe loads.

The UI timeframe is mapped to the selected exchange interval in `MarketDataController.php`.

| UI Timeframe | API Interval |
|--------------|--------------|
| `1m` | `1` |
| `3m` | `3` |
| `5m` | `5` |
| `15m` | `15` |
| `30m` | `30` |
| `1h` | `60` |
| `2h` | `120` |
| `4h` | `240` |
| `6h` | `360` |
| `12h` | `720` |
| `1d` | `D` |
| `1w` | `W` |
| `1M` | `M` |

### 4. Backend Processing

`MarketDataController.php` has four chart-related actions:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `symbols()` | `GET /market-symbols` | Return only the authenticated user's active saved symbols |
| `availableSymbols()` | `GET /api/market-symbol-options` | Return available Binance, OKX, Bybit, BingX, and MEXC instruments for the add-symbol picker |
| `storeSymbol()` | `POST /market-symbols` | Authenticated, throttled symbol validation and storage |
| `destroySymbol()` | `DELETE /market-symbols/{marketSymbol}` | Remove one symbol owned by the authenticated user without deleting chart drawings |
| `klines()` | `GET /api/klines` | Fetch normalized exchange candles |

`availableSymbols()` validates the requested category, calls the configured exchange symbol endpoints, normalizes symbol/base/quote/status/exchange metadata, sorts the symbols alphabetically, and returns them for the searchable picker. The picker displays the coin name and the source exchange beside each symbol.

`klines()` validates the requested exchange/category/interval, fetches candles from the selected exchange, deduplicates by timestamp, sorts oldest to newest, and returns normalized candle objects:

```json
{
  "time": 1672531200,
  "open": 16500.5,
  "high": 16550,
  "low": 16480,
  "close": 16520.75,
  "volume": 1250.45
}
```

### 5. Frontend Normalization

The frontend also normalizes the response with `normalizeApiCandles()` so it can tolerate either object-style or array-style candle payloads.

Normalized candles are stored in:

```javascript
const [allCandles, setAllCandles] = useState([]);
```

Replay mode derives the visible data from `allCandles`:

```javascript
const visibleCandles = useMemo(() => {
  if (!replayMode) return allCandles;
  return allCandles.slice(0, replayIndex + 1);
}, [allCandles, replayMode, replayIndex]);
```

### 6. Per-User Drawing Storage

Chart drawings are stored per authenticated user and symbol in the `market_drawings` table. The table uses `adm_user_id` and `symbol` as a unique pair, and stores the drawing list as JSON.

The frontend loads drawings with:

```javascript
axios.get('/market-drawings', {
  params: { symbol },
});
```

Drawing changes are saved with:

```javascript
axios.put('/market-drawings', {
  symbol,
  drawings: nextDrawings,
});
```

The backend returns an `exists` flag so an intentionally empty drawing list is preserved after the user clears their tools. If no server record exists, the chart starts with no drawings and does not import or upload browser-local drawings automatically. This prevents a new account on a shared browser from inheriting another user's analysis. A drawing record is created only after the user explicitly creates, edits, clears, or otherwise saves drawing state.

### 7. Reusable Tool Defaults

Reusable tool defaults are stored per authenticated user in `market_tool_settings`. These defaults are separate from symbol drawings so they can be used across symbols and timeframes.

The frontend loads defaults with:

```javascript
axios.get('/market-tool-settings');
```

Tool defaults are saved with:

```javascript
axios.put('/market-tool-settings', {
  settings: nextSettings,
});
```

When a drawing is completed, or when a selected drawing's color, width, label text, text style, or label placement is changed, `TradingViewChart.jsx` updates the saved defaults for that tool type. If no drawing is selected, the contextual editor updates the active tool's defaults directly, so line, Fibonacci, box, forecast, measure, text, and position tools can each keep their own style. New tools of the same type inherit those saved settings, including line/box/Fibonacci text placement, bold/italic text style, and text-tool draft text. `localStorage` mirrors the settings as a fallback if the server request is unavailable.

The browser fallback is scoped to the authenticated user with `market-tool-settings:{userId}`. A successful empty server response initializes `{}` and does not import the legacy unscoped `market-tool-settings` value. This prevents presets left in a shared browser from appearing for another account or being copied into that account's database record.

The same settings object also stores selectable presets by tool type under `settings.presets`. A selected text, box, line, Fibonacci, forecast, measure, long-position, or short-position drawing can be saved as a preset from the contextual editor in `ReplayPanel.jsx`. Example text presets can be `BOS`, `MSS`, `HH`, `HL`, `LH`, or `LL`. After saving, the preset appears when that tool type is active or selected. Clicking a preset applies its saved text, color, width, text style, and label placement to the selected drawing, or makes it the default for the next drawing of that type. Each preset row also has a delete button that removes only that preset for the active tool type and persists the updated settings.

---

### 8. Paper Backtest Account

Unsubmitted Entry/SL/TP plans can be cleared either from the ticket or by clicking the red chart-side `×` on the draft Entry line. This clears only the local draft and does not call the pending-order cancellation endpoint.

Replay progress is persisted separately per authenticated user, exchange, market category, and symbol in `market_replay_progress`, with a user-scoped synchronous browser mirror under `market-replay-progress:{userId}:{market}`. If that user has a saved checkpoint, its timestamp and selected replay price are restored when the chart opens. If no checkpoint exists, the chart opens live at the current price and stays out of replay until the user clicks `Start Replay`. Each server write carries `client_saved_at` so a delayed older request cannot overwrite a newer replay candle. Normal playback saves to the server with a short debounce, while component unmount and browser page exit flush the latest value. `Back to Live` returns the current view to live candles without deleting the saved replay checkpoint. The replay `Reset`/`Go Latest` action explicitly replaces the checkpoint with the latest candle.

The default candle width is `24`, and the user's later candle-width selection continues to be stored in `market-chart-candle-size` in `localStorage`.

Each authenticated user can use a database-backed demo account while replaying candles. `MarketBacktestController.php` creates a default `Demo Account` with `10,000 USDT` the first time the replay account panel is opened.

The frontend loads account state with:

```javascript
axios.get('/market-backtest/account', {
  params: { symbol, exchange, category: marketCategory, timeframe, price: executionPrice },
});
```

The account response includes `account.activeSession` when a session is active. Loading the account does not create a session by itself; the Enter Position flyout exposes `New` and `End` actions for explicit session control. Starting a new session ends any active session for the account, then creates a fresh active session for the current symbol, exchange, market category, and timeframe. If a trade is submitted while no active session exists, the backend can still create a session for that trade context.

New positions and their open/close trade rows store `market_backtest_session_id`. The Enter Position flyout filters open positions and pending entries to the active session when one exists, so each session behaves like a focused backtest run while the underlying paper account balance remains shared.

When a market entry is placed, a pending entry is placed, a pending entry triggers, or an open position closes, the chart attempts to capture the visible chart canvas and SVG drawing overlay as a PNG. Snapshot capture is best-effort and must not block the trade action; if capture fails, the open/trigger/close request still proceeds. Snapshots are uploaded to the public disk under `market-backtest-snapshots` and linked to the position as `entry` or `exit` snapshots. The Trade Report shows entry/exit snapshot links when they are available. Snapshot URLs are generated from the app base URL plus `/storage/{path}`. The public storage link must exist for snapshot URLs to resolve in the browser.

Replay orders can be placed as Market, Limit, or Trigger entries. Market entries fill immediately at the current replay execution price, or at the optional manual entry override. Limit and Trigger entries require a set price and are stored as pending positions until a replay candle trades through that level. The ticket accepts margin, leverage, optional stop loss, and optional take profit levels. For long positions, SL must be below entry and TP must be above entry; for short positions, SL must be above entry and TP must be below entry. The panel shows estimated leveraged value, risk, reward, R/R, estimated profit, and estimated loss before entry. `Risk` and `Reward` are gross SL/TP movement estimates, while `Est profit` subtracts estimated entry and exit fees from TP reward, and `Est loss` adds estimated entry and exit fees to SL risk. The submit button is disabled when margin plus entry fee would exceed available cash, and the panel shows the largest fee-adjusted margin that fits.

Pending entries are checked against the current replay candle high/low. If `low <= entryPrice <= high`, the pending entry is triggered at its configured entry price, the open trade is recorded, margin is locked, and the entry fee is charged. The candle where the order was placed is skipped so a pending order cannot trigger from price action that already happened before placement. Pending entries can also be cancelled from the Enter Position panel before they trigger.

Backtest order levels render on the chart as exchange-style horizontal lines. Hovering the chart shows a stable circular `+` price action beside the right price scale, and right-clicking the chart provides the same shortcut. Either action opens the Enter Position ticket at that chart price with Limit selected. Draft Entry, SL, and TP lines appear only after this explicit chart-order action, rather than immediately when the position flyout opens; these lines retain their full chart width but use a thin `1px` stroke, and blank SL/TP fields use live 1% planned levels that follow entry-price and side changes. The visible planned SL/TP values are authoritative and are submitted with the order even if their inputs remain blank. A `Remove Entry / SL / TP Plan` action explicitly clears the three draft lines. Their chart labels show live fee-adjusted estimated loss/profit and stay inside the chart area before the right price scale. After a pending entry triggers, the replacement open-position TP/SL labels continue showing fee-adjusted PnL calculated from the filled entry price and quantity. The open entry line also displays fee-adjusted live unrealized PnL based on the current replay/market price; its line and badge turn green while profitable and red while losing. Pending entry lines are amber and dashed, TP lines are green, and SL lines are red. Pending entry prices, pending SL/TP, and open-position SL/TP lines can be dragged on the chart; the frontend updates the account locally while dragging, then saves the new prices through `/market-backtest/positions/{position}/risk` on mouse-up. Pending entry lines also show a small red `x` control near the right edge of the chart that cancels the pending order through `/market-backtest/positions/{position}/cancel`. Open position entry lines are display-only.

As replay advances, open positions are checked against the current candle high/low. A long closes at SL when `low <= stopLoss`, or at TP when `high >= takeProfit`; a short closes at SL when `high >= stopLoss`, or at TP when `low <= takeProfit`. The entry candle is skipped so a newly opened trade is not closed by price movement that happened before the simulated entry. If SL and TP are both inside the same candle, SL is treated as hit first because the intrabar path is unknown from OHLC data.

Paper futures trading treats the entered size as margin/collateral. Leverage can be set from `1x` to `125x`; quantity, risk, reward, PnL, and fees are calculated from `margin * leverage`, while only margin plus entry fee is reserved from cash. If the requested margin is within the cash balance but the entry fee would push required cash over the balance, the entry margin is reduced slightly so the fee fits inside available cash. The simulated taker fee is `0.04%` on leveraged entry/exit notional. Closing returns margin plus or minus gross PnL and charges the exit fee.

| Route | Purpose |
|-------|---------|
| `GET /market-backtest/account` | Load demo account, open positions, recent trades, and account metrics |
| `GET /market-backtest/report` | Load closed-position win/loss report data for the report table and calendar |
| `GET /market-backtest/report/export` | Download closed-position report data as CSV or JSON, including journal fields and snapshot URLs |
| `POST /market-backtest/sessions` | End the current active session and start a new session for the current chart context |
| `POST /market-backtest/sessions/{session}/end` | End an active session |
| `POST /market-backtest/positions` | Place a market entry or pending limit/trigger entry |
| `PUT /market-backtest/positions/{position}/risk` | Update pending entry price, pending SL/TP, or open-position SL/TP from dragged chart lines |
| `POST /market-backtest/positions/{position}/trigger` | Trigger a pending entry when replay price reaches the entry |
| `POST /market-backtest/positions/{position}/cancel` | Cancel a pending entry |
| `POST /market-backtest/positions/{position}/close` | Close an open replay position at the current replay price |
| `POST /market-backtest/positions/{position}/snapshot` | Upload an entry or exit chart snapshot image for a position |
| `PUT /market-backtest/trades/{position}/journal` | Update setup tag, tags, entry/exit reasons, mistake, emotion, and journal notes on a closed position |
| `POST /market-backtest/reset` | Reset the demo account back to the starting balance |

`ReplayPanel.jsx` exposes execution through the Enter Position flyout. It contains active-session New/End actions, display-currency controls, market/limit/trigger modes, long/short entry controls, margin/leverage/value planning, optional entry/SL/TP fields, risk/reward estimates, pending-entry cancellation, and open-position close actions. It no longer presents the demo-account overview.

The Enter Position flyout keeps its header visible and scrolls its execution controls internally. Demo-account details are available from the trader navbar's Assets wallet instead of being mixed into the order ticket.

The paper account remains internally quote-currency based, normally `USDT`. The Enter Position flyout and Trade Report can display account-sized values in `USDT` or `PHP`. When `PHP` is selected, the user can edit the `PHP / USDT` rate; order margin, leveraged value, risk, reward, estimated profit/loss, fees, and report values are converted for display, and PHP margin inputs are converted back to USDT before orders are submitted. Market prices such as entry, stop loss, take profit, trigger, and chart price remain in the symbol's quote price scale.

The trader navbar's `Assets` wallet owns the demo-account overview. It shows the account name and simulated badge, equity, available cash, locked margin, unrealized and realized PnL, starting balance, fees paid, open/pending counts, active session, and recent demo transactions. It also provides refresh and a confirmation-protected reset to `10,000 USDT`. `TradingViewChart.jsx` and `TraderNavbar.jsx` synchronize account changes through browser events so entries, closes, triggers, and navbar resets update both surfaces without a page reload. The Assets values are simulation data and never represent custody of real user funds.

### Trade Report

`TradeReportPage.jsx` displays reporting as two separate modules: `TradeCalendar.jsx` for daily calendar PnL and `TradeReport.jsx` for the PnL report table. It is available from the sidebar at `/trade-report`.

`TradeCalendar.jsx` and `TradeReport.jsx` read the authenticated admin theme from `ThemeContext`. When the theme is `bg-skin-black`, the report uses the same black chart surfaces (`bg-skin-black`, `bg-black-table-color`, gray borders, and white text). Other admin themes render the report with white/light slate surfaces so the Trade Report remains readable in white mode.

Both report modules use `GET /market-backtest/report`, which reads closed `market_backtest_positions` for the authenticated user's active demo account. Closed positions are used instead of raw trade rows because each closed position contains the full entry, exit, margin, leverage, entry fee, exit fee, and realized PnL in one record.

Closed trades can be expanded inline from the report table to edit journal fields. The journal stores a primary setup tag, comma-separated freeform tags, entry reason, exit reason, mistake/improvement note, emotion, and general notes on the closed position. Saving calls `PUT /market-backtest/trades/{position}/journal` and updates the row without a full report reload.

The report header includes CSV and JSON export actions. Exports call `GET /market-backtest/report/export` and include trade metrics, session IDs, journal fields, and entry/exit snapshot URLs.

The report includes:

| View | Purpose |
|------|---------|
| Summary cards | Net PnL, loss net PnL, win rate, wins, losses, and fees |
| Trade Calendar module | Daily PnL plus daily win/loss counts by close date, with month arrows and a click-open month/year selector |
| PnL Report table | Symbol, side, entry, exit, leverage, margin, leveraged value, fees, PnL, PnL percent, snapshot links, journal summary/edit action, and win/loss result |

The user sidebar and trader navbar both expose Trade Report/PnL navigation for non-superadmin trading users. The report is intentionally separate from the chart page so the chart workspace stays focused on analysis and replay.

### Trader Dashboard UI

Non-superadmin users get a chart-first dashboard. `Dashboard.jsx` checks `auth.sessions.admin_is_superadmin`; superadmin users keep the existing dashboard card layout, while normal users render `TradingViewChart` directly on `/dashboard`.

The authenticated layout now has two visual shells. Superadmins retain the existing administration navbar/sidebar so management screens keep their established controls. Non-superadmin users receive the dedicated trading-terminal shell from `TraderNavbar.jsx` and `TraderSidebar.jsx`. The trader shell uses compact TradingView-inspired surfaces, a persistent market selector, direct Chart/Journal links, a visible `Trader` role label, and a collapsible navigation rail. Trader pages omit administrative breadcrumbs and the footer so the chart and reports use more of the viewport.

The superadmin shell uses the same deep terminal surfaces, compact borders, blue active states, icon-only collapsed rail, and role-aware navbar pattern as the trader UI while retaining its database-driven administrative menus. `AdminNavbar.jsx` provides compact Overview, Users, Feedback, and Settings shortcuts plus notifications, theme control, profile identity, and the same themed sign-out confirmation used by the trader experience. Its dashboard reports real total, active, inactive, and new-this-month user counts plus an active-account health bar. Profiles support display name, unique username, timezone, and trading-experience level in addition to profile images, email, and privilege.

Trader logout uses a themed confirmation dialog inside `TraderNavbar.jsx` instead of the browser confirmation prompt. The change-password page uses the terminal theme, per-field show/hide controls, a live password-strength checklist, matching confirmation feedback, and server-enforced mixed-case/number/symbol requirements. After a successful password update, a non-dismissible success dialog counts down for three seconds before automatically logging the user out; an immediate sign-out action is also available. Both paths use a guarded one-time logout function so React Strict Mode cannot submit a duplicate POST after the first request invalidates the session and produce a `419 Page Expired` response.

The mandatory `ForceChangePassword.jsx` flow uses the same responsive security design and three-second automatic logout dialog. It remains non-dismissible until the password is changed or an eligible scheduled change is waived. Waiver processing checks the server-side waiver limit before submitting the waiver, preventing the older race where the waive request could continue before eligibility was known. Temporary/default-password users cannot waive the required update.

The public home and login pages use the same terminal visual language: deep chart surfaces, blue execution accents, live/replay status cues, replay-preview graphics, and messaging organized around the `choose market → replay → execute → journal` practice loop.

### User Feedback Workflow

Authenticated traders can open `/feedback` from the trader navigation. Feedback is categorized as enhancement, additional feature, bug, usability, performance, or other. Each submission stores its title, detailed description, originating page URL, workflow status, priority, and any admin response. Users only receive their own feedback history and can follow statuses from submitted through reviewing, planned, in progress, completed, or declined.

Superadmins can open `/admin/feedback` from the fixed `Feedback Inbox` entry in the admin sidebar. The inbox supports search and status/category/priority filters. Admins can set priority, move feedback through the workflow, and publish a response visible to the submitting user. User endpoints are ownership-scoped; admin listing and update actions additionally verify the superadmin session flag. Submission and update writes are rate-limited.

`AppSidebar.jsx` already keeps the superadmin sidebar hidden for normal users by rendering `AdminSidebar` only when `auth.sessions.admin_privileges == 1`. Normal users keep their user sidebar access, such as Dashboard, Chart, and Trade Report/PnL, based on their assigned menu privileges.

`AppNavbar.jsx` adds a compact trader control strip for non-superadmin users with:

| Control | Behavior |
|---------|----------|
| Chart | Opens `/dashboard` |
| PnL | Opens `/trade-report` |
| Symbols | Loads the authenticated user's saved symbols from `/market-symbols`, shows exchange/category details, stores the selection under the user-scoped `backtradelab-active-symbol:{userId}` key, and reloads the dashboard chart |

The selected symbol is passed into `TradingViewChart` as its initial symbol, exchange, and market category. The chart component is keyed by the selected symbol tuple so changing the navbar symbol remounts the chart with the new market context.

---

## Chart Rendering

`TradingViewChart.jsx` creates the Lightweight Charts instance and stores chart/series instances in refs:

```javascript
const chartRef = useRef(null);
const candleSeriesRef = useRef(null);
const volumeSeriesRef = useRef(null);
```

The chart uses:

| Series | Purpose |
|--------|---------|
| `CandlestickSeries` | Price candles |
| `HistogramSeries` | Volume bars |

The chart has visible time labels, a right price scale, and enabled native pan/zoom behavior.

Chart colors are aligned with the authenticated admin theme from `ThemeContext`. When the admin theme is `bg-skin-black`, `TradingViewChart.jsx` applies the dark chart palette. Any other admin theme uses the white chart palette. The active palette controls the Lightweight Charts background, grid, axis text, price/time scale borders, selected replay price line, chart wrapper background in `ChartStage.jsx`, chart loading overlay, chart header/navbar panel, chart replay/tool sidebar panel, fullscreen background, text-input popover, and the background color used when entry/exit snapshots are captured. The chart grid intentionally uses low-opacity RGBA colors so the grid boxes stay visible without competing with candles: dark mode uses `rgba(148, 163, 184, 0.06)`, and white mode uses `rgba(100, 116, 139, 0.08)`. `ReplayPanel.jsx` also uses the active chart theme for rail icons, flyout text, tool buttons, tool editor dropdowns, preset controls, grouped drawing tools, and backtest account fields/cards so the controls remain readable in both dark and white themes.

The initial loading overlay uses a full-canvas chart skeleton in `TradingViewChart.jsx` with gridlines, neutral-gray candle bodies and wicks, volume bars, toolbar placeholders, price-axis labels, time-axis labels, and a loading badge. It supports dark and light surfaces, contains no red/green trading colors, covers only the chart workspace, and does not replace the surrounding application navigation.

The Lightweight Charts TradingView attribution logo is disabled in chart layout options. `ChartStage.jsx` renders the configured application logo from `/applogo` in the bottom-left chart position as the BacktradeLab chart brand mark.

| Admin Theme | Chart Background | Notes |
|-------------|------------------|-------|
| `bg-skin-black` | Deep dark `#0b0d10` chart, `#151617` chart panels | Matches the sidebar black and authenticated admin navbar black, with softened `0.06` opacity grid lines |
| Other theme classes | White `#ffffff` | Uses softened `0.08` opacity grid lines, light axis text, borders, and loading overlay |

`Market.jsx` lets the chart content determine the page height. It should not reserve a fixed multi-viewport wrapper height around `TradingViewChart`, otherwise the market page shows a large blank area below the chart. The authenticated layout's `AppContent.jsx` content area is also dynamic rather than fixed to `600px`, so the chart panel can size naturally without overflowing a hardcoded container.

Outside fullscreen, `ChartHeader.jsx` uses a TradingView-style command bar. At desktop widths the active symbol, market category, timeframe, replay action, appearance, indicators, and alert action occupy one row. Visible form labels and the duplicate current-price card were removed so the chart retains more vertical space; accessible labels remain available to screen readers, and the chart price scale is the primary live-price display. The active symbol is green, exchange/category metadata is secondary, and the Indicators action shows the number of enabled indicators.

Below the `lg` breakpoint, both embedded and fullscreen headers collapse into a hamburger labeled with the active symbol. Activating it opens a scrollable, theme-aware controls dropdown; at `lg` and above the normal command bar is restored. The fullscreen compact header uses the available viewport width below `lg`, capped at `36rem`, so its mobile/tablet dropdown does not inherit a narrow button width.

The embedded Indicators menu is explicitly themed rather than inheriting page text colors. Volume, SMA, EMA, and RSI are grouped into dark or light cards with matching borders and surfaces, blue-accent checkboxes/sliders, editable periods, and percentage readouts for Volume and RSI pane sizes.

Fullscreen mode uses the compact wrapping header variant with the same active symbol and indicator state. Its symbol picker uses green symbol labels, explicit `Open` buttons, and theme-aware search/results. Its Indicators menu exposes Volume size, SMA/EMA/RSI periods, and RSI pane size. The compact header remains above the chart, while `ReplayPanel` uses a higher stacking layer so drawing Tool Settings, replay controls, and flyouts remain visible above the header when they overlap.

Volume bars are derived from visible candles:

```javascript
const visibleVolume = visibleCandles.map((c) => ({
  time: c.time,
  value: c.volume,
  color: c.close >= c.open ? '#26a69a88' : '#ef535088',
}));
```

---

## Replay Mode

Keyboard playback can start replay around 30% through the loaded candle set:

```javascript
const startIndex = Math.max(0, Math.floor(allCandles.length * 0.3));
```

When replay mode is enabled:

| Control | Behavior |
|---------|----------|
| Back | Moves one candle backward |
| Play/Pause | Starts or stops interval playback |
| Forward | Moves one candle forward |
| Reset | Stays in replay mode and jumps to the latest/current candle price |
| Follow Replay | Scrolls chart to the replay edge |
| Set Replay Price | Arms the next chart click to pick replay candle/price |
| Speed buttons | Changes playback interval inside the replay flyout |

Clicking `Start Replay` does not immediately change the visible candle set. It arms replay-point selection first. While selection is armed, a dashed vertical line follows the pointer and the future chart area to its right is covered by a dark TradingView-style preview mask. Clicking the chart selects that candle and price, removes the preview, and starts replay from the chosen point.

Playback speeds are defined in `constants.js`.

Replay controls live on the same chart surface as the live chart. The compact left rail is always available, and pressing Play, Forward, Back, or Set Replay Price from the live chart starts or arms replay behavior without opening a separate replay chart. Leaving replay returns the same chart to the latest live candle view.

| Label | Interval |
|-------|----------|
| `0.25x` | `3000ms` |
| `0.5x` | `2000ms` |
| `1x` | `1000ms` |
| `2x` | `500ms` |
| `4x` | `250ms` |
| `10x` | `100ms` |
| `20x` | `50ms` |

Replay price selection creates a dashed price line with `candleSeries.createPriceLine()`.

Changing timeframe while replay is active keeps replay mode enabled, pauses playback, preserves the selected drawing tool, preserves the selected replay price, and moves the replay index to the nearest matching timestamp in the newly loaded candle set. If drawings exist, the chart frames the replay candle plus drawing timestamps after the new candles load instead of forcing follow mode, so boxes/lines do not disappear when switching between lower and higher timeframes.

The selected replay price is also included in the candlestick series `autoscaleInfoProvider`. This keeps the dashed selected-price line visible after changing timeframe, even if the new candle range would normally autoscale away from that price.

The selected-price line effect depends on `timeframe` and `visibleCandles.length`, not only the selected price value. This matters because `candleSeries.setData()` can refresh the series during timeframe changes even when the selected replay price value is unchanged, so the line is recreated after the new data is applied.

---

## Drawing Tools

Drawing tools are available on the live chart and in replay mode. `TradingViewChart.jsx` renders `ChartStage.jsx` as the single chart workspace and overlays `ReplayPanel.jsx` as a compact left rail. Clicking the replay, tools, or backtest rail icons opens a flyout for that group, similar to TradingView's drawing toolbar behavior, so the chart keeps the full available width.

The rail currently has four main flyout groups:

| Group | Behavior |
|-------|----------|
| Replay | Start replay, back/play/forward, reset/go latest, follow, price picking, candle count, and playback speed |
| Tools | Grouped drawing tool selection plus clear-all action |
| Enter Position | Replay-session controls, market/limit/trigger long/short entry, pending-entry cancellation, and open-position closing using the live or replay execution price |
| Tool Editor | Compact top toolbar with dropdowns for color, width, line style, label/text, text style, presets, selected-drawing duplicate, and selected-drawing delete |

The Tools flyout groups drawing tools as `Trend Lines`, `Fibonacci`, `Forecasting`, `Geometric Shape`, and `Annotation`.

The Tool Editor opens automatically after a tool is clicked or a drawing is selected. It appears across the top of the chart beside the rail instead of as a large left flyout. The color, width, line style, label/text, text style, and preset buttons each open a compact dropdown list. If a drawing is selected, edits apply to that drawing and update the saved defaults for its type. If only a tool is active, edits update the defaults for the next drawing of that type. The selected drawing duplicate and delete actions live in this top toolbar; the tools flyout keeps the broader clear-all action.

Replay, Tools, Tool Editor, and Enter Position controls share the chart theme. In dark mode, inactive controls and flyout cards use `bg-black-table-color` with gray borders, panel shells use `bg-skin-black`, and selected or primary neutral controls use a high-contrast white button treatment. This removes the older blue/slate control tone from the replay modal, tools flyout, presets editor, fullscreen button, text-label popover, and position panel. White theme controls use light surfaces with dark text and subtle borders. Semantic trading actions keep their meaning colors, such as green for long/success actions, red for short/destructive actions, and amber for price-pick warning actions.

High-frequency replay, drawing, and account controls use accessible `aria-label` descriptions without native browser `title` tooltips, preventing repetitive hover popups while working on the chart. Tool-specific hints remain only on compact controls where the meaning would otherwise be unclear.

Replay flyouts and the top Tool Editor calculate their maximum width from the actual chart overlay width. They reserve a safe area for the right-side price scale, wrap editor controls before reaching that scale, and reduce their width responsively on smaller charts. This prevents tool panels from covering or overflowing into the price-number sidebar.

| Tool | Placement | Saved Shape |
|------|-----------|-------------|
| Line | Click start, click end | `{ type: 'line', start, end, strokeWidth, lineStyle, color }` |
| Horizontal Ray | Click anchor, click to finish | `{ type: 'horizontal-ray', start, end, strokeWidth, lineStyle, color }` |
| Path | Click each point, press `Enter` or double-click to finish | `{ type: 'path', points, strokeWidth, lineStyle, color }` |
| Fibonacci Retracement | Click start, click end | `{ type: 'fib-retracement', start, end, strokeWidth, lineStyle, color }` |
| Trend-Based Fibonacci Extension | Click trend start, click trend end, click extension anchor | `{ type: 'fib-extension', start, end, anchor, strokeWidth, lineStyle, color }` |
| Long Position | Click entry, click target/time | `{ type: 'long-position', start, end, strokeWidth, color }` |
| Short Position | Click entry, click target/time | `{ type: 'short-position', start, end, strokeWidth, color }` |
| Forecast | Click start, click end | `{ type: 'forecast', start, end, strokeWidth, color }` |
| Measure | Click start, click end | `{ type: 'measure', start, end, strokeWidth, color }` |
| Box | Click first corner, click opposite corner | `{ type: 'rect', start, end, strokeWidth, lineStyle, color }` |
| Text | Click point, enter label | `{ type: 'text', point, text, color }` |

After a two-point drawing is completed, the active tool is reset to default so the next click does not keep drawing the same tool. Trend-based Fibonacci extension uses three clicks and resets after the extension anchor is placed. Path drawings keep collecting clicked points until `Enter` or double-click completes the path.

Long and short position drawings use the same stored chart coordinates as lines. The first click sets entry; the second click sets the target/time and creates an initial mirrored stop. After placement, the target and stop have separate resize handles, so the green profit zone and red loss zone can be adjusted independently. The overlay shows reward/risk, target percent, stop percent, and duration. The profit/loss zones use transparent green/red fills without a full dark backdrop. Visible candles after the entry are scanned with high/low prices; when price reaches the target or stop box edge, the time-progressing area stops at that price, while otherwise it follows the latest post-entry candle close. A 1px gray dashed connector line runs from the entry point to the current/hit price. Entry, target, and stop prices also render as plain colored text on the right-side vertical price area: neutral for entry, green for target, and red for stop. Forecast displays price delta, percent change, and elapsed time with a dashed arrow pointing to the forecast endpoint. Fibonacci retracement and trend-based extension drawings render TradingView-style horizontal levels projected to the right side of the chart, with each ratio and price shown in its own small badge inside the chart overlay rather than in the right price panel; each level uses a fixed level color while the guide/anchor line keeps the tool color.

Drawings are stored per symbol:

```javascript
`replay-drawings:${symbol}`
```

Drawings are saved to the backend through `/market-drawings` and may be mirrored in `localStorage` for the current browser, but browser-local data is never loaded or uploaded into an account automatically when no server record exists.

Older timeframe-specific drawing keys may remain in browser storage from earlier versions but are no longer read or migrated automatically:

```javascript
`replay-drawings:${symbol}:${timeframe}`
```

This lets drawings made on one timeframe remain available on other timeframes for the same symbol.

### Drawing Colors

Drawing colors are defined in `constants.js`:

```javascript
export const DRAWING_COLORS = [
  '#60a5fa',
  '#38bdf8',
  '#22d3ee',
  '#2dd4bf',
  '#fbbf24',
  '#facc15',
  '#34d399',
  '#22c55e',
  '#84cc16',
  '#fb7185',
  '#ef4444',
  '#dc2626',
  '#a78bfa',
  '#8b5cf6',
  '#d946ef',
  '#ec4899',
  '#f97316',
  '#ea580c',
  '#94a3b8',
  '#64748b',
  '#f8fafc',
  '#000000',
];
```

The active color applies to the selected drawing or to the active tool defaults. Line, Horizontal Ray, Path, Fibonacci, Forecast, Measure, Box, Text, Long, and Short can each keep a separate saved color/default style. The color dropdown includes square preset swatches and a hex color input; valid `#rgb` and `#rrggbb` values are normalized and saved through the same drawing color path. Box fill uses the same color with transparency, Fibonacci level lines use fixed per-level colors, and long/short position tools use fixed green profit and red loss zones.

---

## Drawing Coordinates

Drawings are stored in chart coordinates, not screen pixels.

| Stored Field | Meaning |
|--------------|---------|
| `time` | Candle timestamp in seconds |
| `logical` | Lightweight Charts logical index, used for accurate placement beyond the last candle |
| `price` | Price value on the candle series scale |
| `points` | Ordered chart-coordinate points for path drawings |
| `labelText` | Optional text displayed on line-like drawings and boxes |
| `labelVertical` | Optional label vertical placement: `top`, `middle`, or `bottom` |
| `labelHorizontal` | Optional label horizontal placement: `left`, `center`, or `right` |
| `textBold` | Optional boolean for bold overlay labels and standalone text |
| `textItalic` | Optional boolean for italic overlay labels and standalone text |

When the user clicks or drags on the chart, screen coordinates are converted to chart coordinates:

```javascript
const logical = chart.timeScale().coordinateToLogical(x);
const rawTime = chart.timeScale().coordinateToTime(x);
const rawPrice = candleSeries.coordinateToPrice(y);
```

When drawing the overlay, chart coordinates are converted back to screen coordinates:

```javascript
const logicalFromTime = estimateDrawingLogicalFromTime(allCandles, point.time, intervalSeconds);
const x = chart.timeScale().logicalToCoordinate(logicalFromTime);
const y = candleSeries.priceToCoordinate(price);
```

This is why drawings stay attached to candle time/price while the chart scrolls or zooms. Logical coordinates also allow drawing tools to extend beyond the last loaded candle instead of snapping back to the final candle.

For `30m` and higher timeframes, existing intraday drawing timestamps are rendered on the candle bucket that contains the saved timestamp. This keeps tools aligned to higher timeframe candles instead of placing an intraday timestamp fractionally between two wider candles. The saved drawing timestamp is not mutated, so switching back to a lower timeframe can still use the original precise time.

When switching timeframe, drawing timestamps are projected through the full loaded candle set and then rendered onto the active replay series. This keeps shared drawings aligned even when the replay series only shows candles up to the current replay index. On `30m` and higher timeframes, intraday drawing timestamps snap to the containing candle bucket so lower-timeframe tools do not drift toward the side of the chart. Boxes use a minimum visible rectangle size so very short lower-timeframe boxes do not collapse into a 1px sliver on higher timeframes.

During timeframe changes, loading and error states render as absolute overlays on top of the existing chart instead of taking normal layout space above it. This keeps the chart container and drawing overlay dimensions stable while candles reload, preventing temporary chart/overlay misalignment when moving from higher timeframes such as `1h` to lower timeframes such as `15m`. Drawing projection uses the timeframe of the candle data currently loaded on screen until the new candle data has arrived, so saved drawing timestamps are not temporarily recalculated against the wrong interval during the loading gap.

Timeframe changes restore the previous center time with a logical span reduced to 72% of the prior span, producing a consistent zoom-in. The live price display also shows a one-second-updating countdown to the active timeframe candle close; replay mode hides that live countdown.

---

## Drawing Overlay

The chart itself is rendered by Lightweight Charts. Drawings are rendered above it with a React/SVG overlay in `ChartStage.jsx`.

| Drawing Type | Rendered As |
|--------------|-------------|
| Line | SVG `<line>` |
| Horizontal Ray | SVG `<line>` from anchor to the chart's right edge |
| Path | SVG `<path>` through all saved points with point handles |
| Fibonacci Retracement | SVG guide line plus horizontal ratio levels with TradingView-style numeric labels and fixed per-level colors |
| Trend-Based Fibonacci Extension | SVG trend line, extension anchor guide, and projected horizontal ratio levels with fixed per-level colors |
| Long Position | Transparent green profit zone and red loss zone, entry/target/stop lines, reward/risk label, and colored right-axis price text |
| Short Position | Transparent green profit zone and red loss zone, entry/target/stop lines, reward/risk label, and colored right-axis price text |
| Forecast | Dashed SVG `<line>` with arrowhead and projection label |
| Measure | Dashed SVG `<line>` with endpoint dots and delta label |
| Box | SVG `<rect>` with square corners and color-based transparent fill |
| Text | Plain absolutely positioned React text without a background box |
| Resize handles | Small SVG `<rect>` handles |
| Backtest order levels | Horizontal SVG entry, SL, and TP lines with right-side drag handles |
| Fullscreen | In-page maximized chart shell on the chart wrapper |

The overlay is intentionally `pointer-events: none`; mouse events are handled by the chart wrapper in `TradingViewChart.jsx`.

`ChartStage.jsx` includes a fullscreen button in the chart's top-right corner. Fullscreen mode uses an in-page fixed-position chart shell instead of the browser Fullscreen API, so the operating system taskbar can still appear when the user hovers an auto-hidden taskbar area. The normal chart command bar is replaced with an absolutely positioned compact floating `ChartHeader` overlay. This keeps controls reachable while letting the chart consume nearly the full viewport. The chart and overlay are both resized through the same wrapper, so drawing alignment is preserved.

### Overlay Refresh

Lightweight Charts can pan/zoom internally without React state changes. To keep overlay drawings aligned, `TradingViewChart.jsx` uses `overlayRenderVersion` and `scheduleOverlayRender()` to force recalculation after:

| Trigger | Why |
|---------|-----|
| Visible range changes | User pan/zoom or follow replay scroll |
| Mouse wheel/move/up/leave | Native chart viewport interaction |
| ResizeObserver events | Chart/container size changed |
| Data updates | Visible candles changed |
| Programmatic `fitContent()` / `scrollToPosition()` | Chart viewport moved through code |

Right price-scale wheel scrolling is handled separately from the chart's default wheel behavior. When the cursor is over the right-side price number panel, `TradingViewChart.jsx` intercepts the wheel event before Lightweight Charts handles it, prevents the default time-scale zoom, and updates `chart.priceScale('right').setVisibleRange()` instead. Scrolling up shrinks the visible price range for vertical zoom-in; scrolling down expands the visible price range for vertical zoom-out.

---

## Selection, Moving, and Resizing

### Selection

`hitTestDrawing()` checks drawings from topmost to bottommost and returns the selected drawing ID.

| Drawing | Hit Test |
|---------|----------|
| Line, Horizontal Ray, Forecast, Measure, Fibonacci | Distance to line segment or Fibonacci level line |
| Path | Distance to any path segment or point |
| Long Position, Short Position | Pointer inside the position zone |
| Box | Pointer inside rectangle bounds |
| Text | Pointer near the text label anchor |

### Moving

Dragging a selected drawing moves it by calculating:

```javascript
const deltaTime = coords.time - startMouse.time;
const deltaLogical = coords.logical - startMouse.logical;
const deltaPrice = coords.price - startMouse.price;
```

`offsetDrawing()` applies that delta to the drawing's stored chart coordinates.

When a drawing or resize handle is dragged, the wrapper intercepts the mouse event in capture phase, stops propagation, and temporarily disables chart `handleScroll`/`handleScale`. This prevents the chart from panning while the drawing itself is being moved.

### Duplicating

Selected drawings can be duplicated from the top Tool Editor copy button or with `Ctrl+D` / `Cmd+D`. The duplicate keeps the original drawing type, coordinates, color, width, line style, label/text, position stop, and Fibonacci anchor data, then receives a new drawing ID. It is nudged one candle forward and one visible price step upward with `offsetDrawing()`, selected immediately, and saved through the same drawing persistence path as manual edits.

### Resizing

`hitTestResizeHandle()` checks selected drawing handles before normal drawing hit tests.

| Drawing | Handles |
|---------|---------|
| Line, Forecast, Measure, Fibonacci Retracement | Start endpoint, end endpoint |
| Trend-Based Fibonacci Extension | Trend start, trend end, extension anchor |
| Horizontal Ray | Anchor endpoint |
| Path | Every saved path point |
| Long Position, Short Position | Entry point, target/time point, stop/time point |
| Box | Four corners and four side midpoints |

Box resize behavior:

| Handle | Behavior |
|--------|----------|
| Corner handles | Resize width and height together |
| Left/right side handles | Resize width only |
| Top/bottom side handles | Resize height only |

Resizing updates stored `time` and/or `price`, so resized drawings remain attached to the chart when scrolling or zooming.

### Stroke Width

Selected line, path, Fibonacci, measure, long/short position, forecast, and box drawings show width controls in the top Tool Editor in `ReplayPanel.jsx`. When no drawing is selected, the same controls update the active tool's default width.

Available stroke widths:

```javascript
[1, 2, 3, 4, 6, 8]
```

New line, path, Fibonacci, measure, box, forecast, and position drawings default to the saved width for that tool type, falling back to `1px`. The selected `strokeWidth` is saved on the drawing object and persisted with the drawing.

### Line Style

Line, horizontal ray, path, Fibonacci, and box drawings support a saved `lineStyle` value. The top Tool Editor shows a style dropdown with `Solid` and `Dashed`. New drawings default to the saved style for that tool type, falling back to `solid`. Forecast drawings keep their built-in dashed projection style.

### Drawing Labels

Selected line-like drawings and boxes show label controls in the top Tool Editor in `ReplayPanel.jsx`. The label text is saved directly on the drawing, with vertical placement (`top`, `middle`, `bottom`) and horizontal placement (`left`, `center`, `right`). The same toolbar includes bold and italic text-style toggles, stored as `textBold` and `textItalic`, for line labels, Fibonacci labels, measure/forecast labels, boxes, text notes, and position labels. When only a supported tool is active, label and text-style edits become the defaults for the next drawing of that type. Selected standalone text drawings show an editable text input in the same toolbar. `ChartStage.jsx` renders labels and text on the overlay and keeps them attached to the drawing as the chart scrolls, zooms, or changes timeframe. When a line label is placed at `center` and `middle`, the renderer keeps the text in the middle and splits the line around it to create horizontal space.

### Color

Line, path, Fibonacci, measure, forecast, box, text, and position drawings support a saved `color` value. The selected color is stored on the drawing object as `color` and persisted with the drawing. Fibonacci drawings use this color for the guide/anchor line while ratio levels use fixed level colors. Long/short position drawings still keep fixed green and red zones for profit/loss readability.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Cancel temp drawing, close text input, clear active resize/drag, exit price pick |
| `Delete` | Delete selected drawing |
| `Backspace` | Delete selected drawing |
| `Enter` | Finish the active path drawing |
| `Ctrl` / `Cmd` + `Z` | Undo the last drawing delete or clear action for the active symbol |
| `Ctrl` / `Cmd` + `D` | Duplicate selected drawing |
| `Space` | Start replay if needed, then toggle play/pause |
| `Alt` + `L` | Quick-open a market long position using the current execution price and the smaller of `1000` margin or fee-adjusted available cash |
| `Alt` + `S` | Quick-open a market short position using the current execution price and the smaller of `1000` margin or fee-adjusted available cash |
| `ArrowLeft` / `ArrowRight` | Move selected drawing one candle backward/forward |
| `ArrowUp` / `ArrowDown` | Move selected drawing up/down by a small visible price step |
| `Shift` + `Arrow` | Move selected drawing faster |

Keyboard shortcuts are ignored while typing in inputs or editable elements.

---

## Chart Interaction Modes

| Mode | Activation | Behavior |
|------|------------|----------|
| Default | No drawing tool, no replay price pick | Native chart pan/zoom, select/move/resize drawings |
| Drawing | Line, Path, Fibonacci, Measure, Long, Short, Forecast, Box, or Text selected | Place a new drawing |
| Replay Price Pick | `Set Replay Price` armed | Next chart click picks replay candle and price |
| Replay Playback | Press `Space` | Start replay if needed, then toggle play/pause |

`handleScroll` and `handleScale` are adjusted so drawing tools do not fight with native chart interaction.

Mouse-wheel behavior depends on pointer position. Over the main chart area, Lightweight Charts keeps its native time-scale wheel zoom and scroll behavior. Over the right price number panel, the custom price-scale wheel handler changes price height/range only.

The chart wrapper keeps its normal cursor during ordinary interaction. The `grabbing` cursor appears only while the left mouse button is held for chart drag interaction; drawing and replay-pick modes continue using the crosshair. Draft Entry, SL, and TP lines are visible only while the active Enter Position ticket is preparing that plan. Closing/switching away from the ticket or a submission that does not create an order clears the local draft. After successful creation, server-backed pending/open order lines remain on the chart.

---

## Error Handling

Frontend fetch errors set an error message and clear chart/drawing state for the failed load:

```javascript
setError(err.message || 'Failed to load chart');
setAllCandles([]);
setDrawings([]);
drawingsRef.current = [];
```

Backend errors are returned as JSON responses from `MarketDataController.php`.

---

## Performance Notes

| Technique | Purpose |
|-----------|---------|
| `useMemo` | Derive visible candles, volume data, current price, selected drawing, rendered drawing screen coordinates |
| `useRef` | Keep chart instances and latest drawing/tool state available to event handlers |
| `requestAnimationFrame` | Throttle overlay re-render requests during chart viewport movement |
| `ResizeObserver` | Keep chart and overlay dimensions synchronized |
| Theme palette updates | Apply the admin dark/white chart palette without recreating the chart instance |
| `localStorage` | Mirror drawing edits/tool settings without auto-importing drawings; store public `backtradelab-theme` and user-scoped trader active-symbol preference |
| Database | Persist the user's available market symbols, drawings, reusable tool defaults, and paper backtest records |

---

## Build Verification

After backend/database changes, run:

```bash
php artisan migrate
```

After chart changes, run:

```bash
npm run build
```

Current known build warnings are unrelated to the chart changes:

| Warning | Notes |
|---------|-------|
| Browserslist data outdated | Dependency metadata warning |
| `lottie-web` uses `eval` | Warning from dependency |
| Large Vite chunks | Bundle-size warning |

---

## Summary

## July 2026 workspace and market-summary update

- `/market` is the default post-login landing page for non-superadmin traders and appears before Workspace in trader navigation. `/dashboard` remains the chart-first Workspace. Superadmins continue to land on `/dashboard`.
- Market Summary reads the authenticated user's saved market symbols and opens a selected market in Workspace. Browser-persisted, user-scoped watchlist group management is located directly above the Workspace chart.
- Fullscreen and embedded chart headers share symbol search, market/timeframe selection, replay, alert, indicator, and appearance controls.
- Active Rise/Drop alerts are persisted per user, drawn as gray dashed price lines, checked against a latest-candle refresh every five seconds, and removed immediately after triggering. A trigger creates an admin notification and an in-workspace notice; browser notification remains an optional enhancement.
- Hovering a price exposes an order `+` shortcut on the right and an alarm shortcut at the left endpoint of the same horizontal price line. Moving onto either control preserves the hovered price action. The alarm shortcut opens the Set Alert modal with that chart price prefilled.
- RSI uses a native, resizable lower pane. Disabling RSI moves the hidden series back to the primary pane so the empty lower pane is removed.
- Executed trades use custom 18px rounded rectangular badges: green with a centered `B` for buy and red with a centered `S` for sell. The badges have no contrasting border. Long/short planning regions use lighter translucent fills so candles remain readable.
- Drawing categories are collapsible, new drawing labels start empty, and the tool editor accepts both expanded swatches and direct hex colors.
- Initial chart loading uses a full gray chart skeleton with grid, candles, volume, toolbar, and axis placeholders instead of a generic page loader.
- The shared sidebar toggle accepts an explicit boolean as well as toggle behavior. The admin navbar has two intentionally separate controls: the left hamburger toggles the existing sidebar, while the final mobile-only hamburger replaces hidden navbar module links with a dropdown for Overview, Users, Customer Support, Payments, Pricing, Payment Setup, and Settings.
- Customer Support includes payment, subscription, account, and product categories and is available to administrators as a prioritized inbox.

### Watchlist storage

Watchlist groups currently use `backtradelab-watchlists:{userId}` in `localStorage`; the actual available symbols remain database-backed and user-scoped through `/market-symbols`. Group creation uses a themed modal with empty/duplicate-name validation. Groups can be renamed without changing their assigned markets and deleted through a confirmation modal; deleting a group never deletes its database-backed saved symbols, and deleting the last group recreates an empty `Main` group.

Workspace renders groups as a compact single-open accordion. Each expanded group has its own saved-market selector and a horizontally scrollable row of market chips. A chip opens that market in the chart or removes it from only that group. Market Summary remains focused on discovery and opening symbols. A future cross-device watchlist feature should migrate group membership to dedicated server tables without changing the Workspace interaction.

### Alert runtime boundary

Alerts trigger while Workspace is open because the browser refreshes the latest candle and calls the authenticated alert checker. Offline/background alert delivery still requires a scheduled server worker or exchange stream.

## Indicators, alerts, onboarding, and replay access

### Indicators and volume

The chart Appearance menu manages candle styling plus removable Volume, configurable volume height, SMA, EMA, and RSI indicators. SMA, EMA, and RSI periods are editable. Indicator visibility, periods, and volume height are stored in the browser under `market-chart-indicators`.

### Price alerts

Authenticated users can create persistent price alerts through `/market-price-alerts`. Active alerts checked against live chart prices transition to `triggered`, create an `adm_notifications` record, and can request a browser notification while the chart is open. Production deployments that must trigger alerts while users are offline still require a scheduled exchange-price polling worker.

### Onboarding and help

The permanent `/help` page documents the chart-to-journal workflow and is linked from the trader sidebar. Each user receives a dismissible first-login tour on Market Summary, the normal trader landing page. The final step opens Workspace; direct first access to Workspace retains the chart-level tour as a fallback. Completion is stored server-side in `adm_users.chart_tour_completed_at`, so completing or skipping either presentation dismisses it everywhere and across browsers. The first step clearly announces the seven-day trial and links the workflow to the Subscription page.

### Replay trial and access enforcement

New accounts receive a seven-day replay trial through `replay_trial_started_at` and `replay_trial_ends_at` on `adm_users`. Paid access is stored separately in `replay_access_ends_at`. Existing accounts without trial timestamps receive their trial timestamps when replay access is first evaluated.

Replay progress writes and paper-backtest actions are protected server-side by the `replay.access` middleware. Superadmins bypass this restriction. All frontend replay entry paths also call `/replay-access`: restoring saved progress, Start Replay, Set Replay Price, Back, Forward, and Play. Active replay is rechecked once per minute and closes when access expires. An expired user receives HTTP `402` with the `replay_subscription_required` code and the chart opens the subscription interface instead of starting replay.

Users can inspect their current access at `/subscription`. The page displays:

- Free trial, active membership, or expired status.
- Trial and paid-access expiration dates.
- Remaining access days.
- Manual payment request history.
- Pending, approved, or rejected review status.
- Reference, recorded amount, submission/review timestamps, proof link, and admin notes.

The trader subscription page reads `ThemeContext` and uses separate dark and white palettes for its hero, access metrics, payment-history cards, status badges, metadata, admin notes, proof actions, and empty state. The plan/payment modal and payment conversation use the same active theme so the subscription workflow remains consistent with the trader shell.

### Database-controlled subscription plans

Plan definitions are stored in `subscription_plans` rather than hard-coded in React.

| Field | Purpose |
|------|---------|
| `code` | Stable plan identifier such as `monthly`, `quarterly`, or `yearly` |
| `name` | User-facing plan name |
| `duration_days` | Replay-access days granted after approval |
| `price` | Required plan amount; nullable until configured |
| `currency` | Display currency, currently `PHP` |
| `description` | Short plan-card description |
| `is_featured` | Highlights the plan as popular |
| `is_active` | Controls whether traders can select the plan |
| `sort_order` | Controls plan-card ordering |

The authenticated `GET /subscription-plans` endpoint returns active plans to traders and all plans to superadmins. Plans without a configured price display `Price pending` and cannot be selected. The backend loads the selected active plan and assigns its database price to the payment request; it does not trust an amount submitted by the browser.

Superadmins manage prices, durations, descriptions, featured state, and availability at `/admin/subscription-plans`. The three initial records are created without prices, so an administrator must configure them before accepting subscriptions.

### Manual payment and approval workflow

The subscription modal first displays Monthly, Quarterly, and Yearly plan cards, database prices, durations, features, and featured-plan styling. The payment step preserves the selected-plan feature list and displays database-controlled GCash instructions. It includes the account name and number, a copy-number action, payment rules, and an optional QR code positioned beside the account details. The user then enters the GCash reference and optional image proof.

GCash instructions are stored in `payment_settings` and managed by superadmins at `/admin/payment-settings`. QR images are served through an authenticated route instead of relying on a public storage URL.

No GCash account number or account name is seeded or committed in source control. A superadmin must configure the intended receiving account, rules, and optional QR image in `/admin/payment-settings`; these operational settings belong in the database rather than `.env` because administrators manage them at runtime and customers must see the recipient details during checkout. The legacy committed default is removed by `2026_07_13_000001_remove_committed_payment_defaults.php` only when the untouched template metadata still matches, preserving an administrator-customized record.

Using a personal GCash wallet for real subscription collections may violate GCash's restriction on commercial use without prior written authorization. Development/testing may use manual settings, but production operators should obtain written authorization or an approved GCash for Business arrangement and meet applicable Philippine registration, tax, invoicing, and consumer-protection obligations before accepting customer payments.

Manual requests are stored in `subscription_requests` with the selected plan code, server-assigned price, payment method, reference, proof path, provider metadata, review state, reviewer, timestamps, notes, and a unique submission token. Superadmins review requests at `/admin/subscriptions`.

Submission tokens make retries idempotent. A database lock serializes submissions from multiple tabs, and the backend permits only one pending request per user. Retrying a completed HTTP submission returns the existing request rather than creating another record or notification.

Each request owns a two-sided conversation in `subscription_messages`. Users and admins can send text, images, PDF files, documents, spreadsheets, CSV, or text attachments up to 10 MB. Proofs and chat attachments use authenticated download routes. After payment submission, chat opens automatically. While open, it polls every five seconds for messages and review status.

When a request is approved:

1. The backend reloads the plan duration from `subscription_plans`.
2. `adm_users.replay_access_ends_at` is extended from the later of the approval time or the current paid expiry.
3. The request records its reviewer and review timestamp.
4. The user receives an in-system subscription notification and an automatic payment-chat response.
5. The open user chat displays a Subscription Successful modal with enabled features and the access expiration time.
6. Confirming the success modal redirects the user to `/dashboard`.

Rejections also notify the user and can include an admin note. Provider-neutral fields (`provider` and `provider_payment_id`) allow a future payment gateway webhook to reuse the same entitlement process.

### Subscription files and routes

| File or route | Purpose |
|------|---------|
| `resources/js/Components/Market/TradingViewChart/SubscriptionModal.jsx` | Responsive plan comparison and manual-payment submission |
| `resources/js/Pages/Subscriptions/UserIndex.jsx` | User access summary and payment history |
| `resources/js/Pages/Subscriptions/AdminIndex.jsx` | Superadmin request review |
| `resources/js/Pages/Subscriptions/AdminPlans.jsx` | Superadmin database pricing controls |
| `resources/js/Pages/Subscriptions/AdminPaymentSettings.jsx` | Editable GCash account, rules, and QR configuration |
| `resources/js/Components/Subscriptions/PaymentChat.jsx` | User/admin payment conversation, attachments, polling, and approval result modal |
| `app/Http/Controllers/ReplayAccessController.php` | Trial status, plans, requests, pricing updates, and approvals |
| `app/Http/Middleware/EnsureReplayAccess.php` | Server-side replay authorization |
| `app/Models/SubscriptionPlan.php` | Database plan model |
| `app/Models/SubscriptionRequest.php` | Manual/provider payment request model |
| `app/Models/SubscriptionMessage.php` | Payment conversation message and attachment model |
| `app/Models/PaymentSetting.php` | Dynamic manual-payment instructions |
| `GET /subscription` | User subscription page |
| `GET /subscription-plans` | Available plan data |
| `POST /subscription-requests` | Submit a manual payment request |
| `GET/POST /subscription-requests/{request}/messages` | Load or send payment chat messages |
| `GET /admin/payment-settings` | Admin GCash settings page |
| `POST /admin/payment-settings` | Save GCash details, rules, and QR image |
| `GET /admin/subscriptions` | Admin payment review page |
| `GET /admin/subscription-plans` | Admin plan-pricing page |
| `PUT /admin/subscription-plans` | Save plan configuration |

The chart now includes:

1. Public `/` front page with navbar search, product/community/market/more links, hero content, login dropdown, browser-local dark/white theme preference, and black-theme-aligned dark controls.
2. Dedicated `/login` sign-in form that follows the saved public theme, uses the same black dark-theme surfaces, and supports password, Google, and Facebook sign-in with brand-colored social buttons; Google can create a new non-admin trader account and always displays the account picker.
3. Chart-first `/dashboard` for non-superadmin trader users, with superadmin keeping the existing dashboard cards.
4. Trader navbar quick links for Chart, PnL, saved symbol selection, and an Assets wallet for synchronized demo-account details, recent transactions, refresh, and reset.
5. Lightweight Charts candlestick and volume rendering.
6. Per-user database-backed market symbol reads and writes through authenticated `/market-symbols` routes; new users start with an empty saved-symbol list.
7. Laravel/exchange candle data flow through `/api/klines`.
8. Searchable Binance, OKX, Bybit, BingX, and MEXC add-symbol picker in the chart header, with Spot/Futures switching.
9. A single live/replay chart with a compact black-theme-aligned left rail, grouped flyouts for replay controls, drawing tools, and focused position entry/management, plus a top toolbar for per-tool style/preset editing.
10. Componentized React structure for header, replay controls, chart stage, constants, and helpers.
11. Drawing tools for line, Fibonacci retracement/extension, measure, long/short position, forecast, box, and text on the live chart and in replay mode.
12. Per-tool drawing colors, stroke widths, labels, presets, selection, duplicating, moving, and resizing.
13. Drawing persistence per user/market in the database, with no automatic browser-local import for new accounts.
14. Paper account retesting with market and conditional long/short entries, pending entry cancellation, close actions, equity, cash, open PnL, and recent trades.
15. Sidebar-accessible Trade Report with closed-trade win/loss table and calendar view.
16. Admin-theme-aligned chart background, grid, axis text, borders, chart workspace loading skeleton, fullscreen shell, chart control surfaces, and snapshot background.
17. Time/price/logical anchored drawings that stay aligned during pan/zoom and across timeframe changes.
18. Fullscreen chart mode.
