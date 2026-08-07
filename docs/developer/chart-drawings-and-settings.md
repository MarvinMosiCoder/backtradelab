# Chart Drawings and Settings

## Purpose

Users create chart annotations and save reusable tool defaults. Drawings are scoped to a user and market identity.

| Route/file | Responsibility |
|---|---|
| `GET/PUT /market-drawings` | Load/save drawing collection |
| `GET/PUT /market-tool-settings` | Load/save tool templates |
| `MarketDrawingController.php` | Drawing validation and ownership |
| `MarketToolSettingController.php` | Template validation and ownership |
| `MarketDrawing.php`, `MarketToolSetting.php` | Persistence |
| `ChartStage.jsx`, `ReplayPanel.jsx`, `utils.js` | Editing UI and geometry |

## Flow

1. Active exchange/category/symbol changes.
2. The chart requests that user's drawing record for the market.
3. Pointer actions create/select/move/resize drawing data.
4. Saves are serialized so an older request cannot overwrite newer state.
5. The server updates or creates the user-and-market record.
6. Tool templates load once per user and are saved independently of drawings. The persisted settings key remains `presets` for backward compatibility.

Browser mirrors use scoped keys such as `replay-drawings:{userId}:{exchange}:{category}:{symbol}`. They are recovery/cache aids, not authorization or the source of truth.

Drawings are market-scoped rather than timeframe-scoped. Loading drawings is independent from candle loading, a failed refresh retains the last local/server copy, and absolute drawing times are projected onto the active timeframe. Price Range uses a rectangular two-axis shape with corner and edge handles. Long/short Entry, TP, and SL values render in a dedicated right-axis label layer and remain visible whether or not the drawing is hovered or selected.

Price Range also renders a vertical directional arrow centered in the box (`ChartStage.jsx`, in the same `'rect'`/`'price-range'`/`'date-range'`/`'price-date-range'` box-render block, gated to `d.type === 'price-range'` only): green pointing up when `end.price > start.price`, red pointing down when lower, hidden while flat (`end.price === start.price`) or during the live drag preview (`temp-` id). Direction is based purely on the price delta, not which corner the user dragged from — reuses the existing `getArrowHeadPoints` helper already used for the `forecast`/`arrow` tool types rather than a new arrowhead implementation. Date Range and Price & Date Range do not get this arrow (a duration/bar-count range has no up/down direction to show).

## Maintenance

- Add a new tool in constants/tool menus, creation state, rendering, hit testing, movement, resizing, serialization, and validation.
- Preserve unknown/new drawing fields during compatible updates where appropriate.
- Keep SVG overlay boundaries aligned with the main price pane.
- Never query drawings or settings without `adm_user_id`.

## Verification

- Every drawing type create/select/move/resize/delete.
- Reload and market switching.
- Create on 5m, switch to 1h and back to 5m, and confirm geometry and selection remain available.
- Resize Price Range independently from every edge and corner.
- Price Range arrow points up (green) when the box's end price is higher than its start price, down (red) when lower, regardless of which corner was dragged first; no arrow when the two prices are equal.
- Confirm long/short Entry, TP, and SL axis labels remain visible before, during, and after hover/selection.
- Hover each long/short profit or stop zone and confirm the centered Target/Stop and Open P&L details appear, then disappear on pointer leave when the drawing is not selected.
- Select a long/short drawing and confirm its detail labels remain visible after pointer leave. Target and Stop must each stay centered on one line; Open P&L and Risk/Reward remain a two-line badge.
- Two users in one browser remain isolated.
- Rapid saves preserve the latest state.
- Indicator panes do not receive drawing overlays.

Related: [Trading chart](trading-chart.md), [Replay](replay-and-progress.md).
# Ready tools and expanded drawing set

Each left-rail drawing category has a ready-tool button and a separate list trigger. Choosing a tool updates that category's ready icon and saves `readyTools` through `/market-tool-settings`, with the existing per-user local fallback. The ready button activates the saved tool immediately.

The chart supports lines, rays, arrows, horizontal/vertical lines, paths, Fibonacci tools, parallel channels, position/forecast tools, rectangles, annotations, and Price Range, Date Range, and Price & Date Range. Range labels show price/percentage movement, duration, and candle count as applicable. Saving a template over an existing case-insensitive name requires confirmation.

The chart context menu's **Clear Tools** action clears drawings through the same confirmation, persistence, and undo path as the drawing rail. It is disabled when no drawings exist and does not remove indicators, alerts, positions, or templates.

Selecting the toolbar settings action opens a staged drawing editor with Style, Text, Coordinates, and Visibility tabs. **Ok** persists the edited drawing while **Cancel** discards the draft. Coordinate fields update supported point-based drawings, visibility can be limited to the active timeframe, and locked drawings remain selectable but cannot be moved or resized.

Long/short position drawings use an exchange-style risk/reward layout with distinct profit and stop zones and draggable entry, target, and stop handles. The zones have no outer, top, or bottom border; a thin entry divider separates them. TP/Entry/SL price-axis badges are always visible. Hovering anywhere inside either zone, or selecting the drawing, reveals the detailed labels: centered single-line Target and Stop badges plus a centered two-line Open P&L and Risk/Reward badge. Pointer leave hides those details only when the drawing is not selected. Long targets/stops are constrained above/below entry respectively; short drawings use the inverse ordering, including while creating or resizing the tool.
