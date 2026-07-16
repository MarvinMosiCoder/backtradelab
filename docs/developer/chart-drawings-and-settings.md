# Chart Drawings and Settings

## Purpose

Users create chart annotations and save reusable tool defaults. Drawings are scoped to a user and market identity.

| Route/file | Responsibility |
|---|---|
| `GET/PUT /market-drawings` | Load/save drawing collection |
| `GET/PUT /market-tool-settings` | Load/save tool presets |
| `MarketDrawingController.php` | Drawing validation and ownership |
| `MarketToolSettingController.php` | Preset validation and ownership |
| `MarketDrawing.php`, `MarketToolSetting.php` | Persistence |
| `ChartStage.jsx`, `ReplayPanel.jsx`, `utils.js` | Editing UI and geometry |

## Flow

1. Active exchange/category/symbol changes.
2. The chart requests that user's drawing record for the market.
3. Pointer actions create/select/move/resize drawing data.
4. Saves are serialized so an older request cannot overwrite newer state.
5. The server updates or creates the user-and-market record.
6. Tool presets load once per user and are saved independently of drawings.

Browser mirrors use scoped keys such as `replay-drawings:{userId}:{exchange}:{category}:{symbol}`. They are recovery/cache aids, not authorization or the source of truth.

## Maintenance

- Add a new tool in constants/tool menus, creation state, rendering, hit testing, movement, resizing, serialization, and validation.
- Preserve unknown/new drawing fields during compatible updates where appropriate.
- Keep SVG overlay boundaries aligned with the main price pane.
- Never query drawings or settings without `adm_user_id`.

## Verification

- Every drawing type create/select/move/resize/delete.
- Reload and market switching.
- Two users in one browser remain isolated.
- Rapid saves preserve the latest state.
- Indicator panes do not receive drawing overlays.

Related: [Trading chart](trading-chart.md), [Replay](replay-and-progress.md).
