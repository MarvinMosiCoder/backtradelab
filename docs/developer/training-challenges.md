# Training Challenges

## Purpose

Structured training challenges are measurable practice exercises — e.g. "complete 20 trades using one playbook while risking at most 1% each" — scored on both profitability and rule adherence. They sit on top of the existing simulated backtest account/position data; they do not add a second trading engine.

| Route/file | Responsibility |
|---|---|
| `GET /training-challenges` | Renders the Inertia page (`TrainingChallengesPage.jsx`) |
| `GET /training-challenges/catalog` | Active challenge catalog plus the caller's most recent attempt per challenge — `TrainingChallengeController::index()` |
| `POST /training-challenges/{challenge}/attempts` | Start a new attempt on a challenge — `TrainingChallengeController::startAttempt()` |
| `GET /training-challenges/attempts` | The caller's attempt history, newest first — `TrainingChallengeController::listMyAttempts()` |
| `GET /training-challenges/attempts/{attempt}` | Read one attempt; scores/transitions it if still active — `TrainingChallengeController::showAttempt()` |
| `POST /training-challenges/attempts/{attempt}/abandon` | Abandon an active attempt — `TrainingChallengeController::abandonAttempt()` |
| `TrainingChallengeController.php` | Ownership checks, attempt lifecycle transitions |
| `TrainingChallengeScoringService.php` | On-demand scoring against closed `MarketBacktestPosition` rows |
| `TrainingChallenge.php`, `TrainingChallengeAttempt.php` | Domain records/relations |
| `TrainingChallengeCatalog.jsx` | Catalog + progress/violations UI on `TrainingChallengesPage.jsx` |

The JSON catalog intentionally lives at `/training-challenges/catalog`, a different path from the page route `/training-challenges`, so the page route can render Inertia while the catalog route returns JSON without a route-name collision.

## Catalog: seeded in a migration, not `db:seed`

`training_challenges` is a small, fixed, effectively-static list (four starter challenges as of this writing). Its rows are inserted directly inside `create_training_challenges_table`'s `up()` method via `DB::table('training_challenges')->insert([...])`, immediately after `Schema::create`, rather than in a `database/seeders/` class.

This matches how this app actually deploys: [Deployment and production](deployment-and-production.md) lists the recommended production deploy commands, and `php artisan db:seed` is deliberately **not** among them — only `php artisan migrate --force` runs. A `Seeder` class would silently never execute in production. Putting the catalog rows inside the migration's `up()` guarantees they exist everywhere migrations run, with no separate seeding step to remember or forget.

Each row's `rules` column is a JSON object interpreted by `TrainingChallengeScoringService`:

| Key | Meaning |
|---|---|
| `requiredTrades` | Number of closed trades needed to be eligible to pass |
| `maxRiskPercentPerTrade` | Maximum allowed risk, as a percent of the attempt's starting balance snapshot, on any single closed trade |
| `requirePlaybookId` | `true` means **any** attached playbook is required — i.e. "the position's `market_backtest_playbook_id` must not be null." This is a boolean flag, not a specific playbook id. A future "must use this exact playbook" variant would need a separate rule key (e.g. `requiredPlaybookId: <id>`); `requirePlaybookId === true` should not be read as that. |
| `maxConsecutiveLosses` | Largest allowed run of consecutive losing closed trades before the challenge hard-fails |

Starter catalog:

| Slug | Rules |
|---|---|
| `risk-discipline-20` | 20 trades, max 1% risk/trade |
| `playbook-consistency-15` | 15 trades, playbook required on every trade |
| `loss-streak-control-10` | 10 trades, no 3-trade loss streak |
| `combined-discipline-25` | 25 trades, max 1.5% risk/trade, playbook required, no 4-trade loss streak |

## Attempt lifecycle

A `training_challenge_attempts` row tracks one user's run at one challenge:

1. **`active`** — created by `startAttempt()`. A user may only have one `active` attempt per challenge at a time (a second `startAttempt()` call for the same challenge while one is already active returns `422`). Starting an attempt resolves the user's `MarketBacktestAccount` (creating the default demo account if none exists yet, mirroring `MarketBacktestController::getOrCreateAccount()`) and snapshots its current `cash_balance` into `starting_balance_snapshot` — this fixed number is what risk-percent scoring is measured against for the lifetime of the attempt.
2. **`completed`** — set by `showAttempt()` when scoring reports `passed === true` (required trade count reached, zero violations).
3. **`failed`** — set by `showAttempt()` when scoring reports `hardFailed === true` (a `maxConsecutiveLosses` breach) and the attempt did not also pass.
4. **`abandoned`** — set by `abandonAttempt()`, user-initiated, only while `active`. Abandoning an already-completed/failed/abandoned attempt is rejected.

Whenever an attempt transitions out of `active`, its `result_snapshot` is frozen to the scoring result that triggered the transition and `completed_at` is set. Reads of a non-active attempt reuse that frozen snapshot instead of rescoring, so a finished attempt's recorded result never drifts even if, say, the underlying position rows were later edited by an admin tool.

## On-demand scoring philosophy

`TrainingChallengeScoringService::score()` computes everything by querying already-closed `MarketBacktestPosition` rows at read time — it does not hook into position close. This matches this app's existing analytics style everywhere else: `MarketBacktestReportService`, `MarketBacktestAdvancedAnalyticsService`, and `MarketBacktestInsightService` all compute their numbers lazily from closed positions when a report is requested, and there are no event hooks anywhere in this codebase that fire on position close. Training challenges follow the same pattern rather than introducing the first one:

- No changes were made to `MarketBacktestController::closePosition()` or `processPositionCandle()`.
- Progress and violations are simply a query — `market_backtest_account_id` matches the attempt's account, `status = 'closed'`, and `closed_at_time` falls inside the attempt's window (`>= started_at`, and additionally `<= completed_at` once the attempt is no longer active) — evaluated fresh each time `showAttempt()` or the catalog (`index()`, for any still-`active` attempt) is called.
- This keeps challenges a purely additive, read-side feature: any trade closed anywhere in the app (backtest replay, manual entry, etc.) that falls in an active attempt's window and belongs to its account counts toward that attempt automatically, with no coordination required from the code path that closed it.

## Risk-percent definition

For a rule with `maxRiskPercentPerTrade`, each closed position's risk is computed as:

- **Stop-loss based (preferred):** `abs(entry_price - stop_loss) * original_quantity` (falling back to `quantity` if `original_quantity` is unset), when the position has a `stop_loss`.
- **Margin-based (fallback):** `original_margin` (falling back to `margin`), when the position has no `stop_loss` — the actual capital committed stands in for an undefined stop distance.

That risk amount is then expressed as a percent of the attempt's **fixed `starting_balance_snapshot`** — the account's `cash_balance` at the moment the attempt started, not the account's balance at the moment each individual trade was opened.

This is a deliberate simplification, not an oversight: this app has no ledger of historical account-balance-at-trade-time (no snapshot is taken per trade), so there is no mechanism to reconstruct "1% of balance as it stood right before this specific trade." Anchoring to one fixed snapshot at attempt start is a reasonable, auditable approximation for a bounded challenge (10–25 trades), but it means a challenge that runs long enough for the account balance to move meaningfully will score risk-% against a number that no longer matches the live balance. If a more precise per-trade balance basis is ever needed, it requires adding a balance-at-open snapshot to `MarketBacktestPosition` (or a parallel ledger) first — this feature does not add one.

## Hard-fail vs. accumulate severity model

Violations are not all equally terminal:

- **`maxConsecutiveLosses` hard-fails immediately** (`hardFailed = true` in the score result). A loss-streak breach is treated as a decisive discipline failure — the next `showAttempt()` call flips the attempt straight to `failed`, regardless of how many trades remain.
- **`maxRiskPercentPerTrade` and `requirePlaybookId` violations accumulate** in the `violations` array instead of stopping anything early. They simply prevent `passed` from ever becoming `true` for this attempt — the trader can keep trading toward `requiredTrades`, but the attempt cannot complete successfully with any accumulated violation outstanding.

The reasoning: a single over-risked trade or one trade without a playbook shouldn't instantly end a 20-trade challenge — the trader should be able to see the mark against them and finish the exercise (failing to pass, but not being cut off). Blowing a hard loss-streak limit is different in kind — it represents a live discipline breakdown worth stopping the exercise for, so it ends the attempt rather than just tainting the eventual result.

## Maintenance

- Keep scoring server-authoritative and purely a function of `(challenge.rules, attempt.starting_balance_snapshot, attempt.started_at, attempt.completed_at, closed positions in that window)` — no other stored state.
- Never write to `MarketBacktestPosition` or `MarketBacktestAccount` from this feature; challenges only read them.
- New rule keys should get a corresponding block in `TrainingChallengeScoringService::score()` and a line in the risk-percent/plain-language rule summary tables above and in `TrainingChallengeCatalog.jsx`'s `summarizeRules()`.
- Every attempt-scoped route must re-check `adm_user_id === $request->user()->id` before returning or mutating a `TrainingChallengeAttempt` — never trust the route-bound model alone.

## Verification

- Starting an attempt snapshots the account's current `cash_balance`, not its `starting_balance`.
- A second `startAttempt()` on the same challenge while one is already `active` returns `422`; starting a different challenge, or restarting after the prior attempt finished, is allowed.
- Positions closed before `started_at` are excluded from scoring.
- A risk-percent rule flags an over-risked closed position and leaves an in-bounds one alone.
- A `requirePlaybookId` rule flags a closed position with a null `market_backtest_playbook_id`.
- A `maxConsecutiveLosses` breach sets `hardFailed = true` and the next `showAttempt()` call flips the attempt to `failed`.
- Reaching `requiredTrades` with zero violations flips the attempt to `completed` and freezes `result_snapshot`.
- `abandonAttempt()` only succeeds while `active`; abandoning a finished attempt is rejected.
- Cross-user `showAttempt`/`abandonAttempt` on another user's attempt returns `404`.

Related: [Backtesting and orders](backtesting-and-orders.md), [Trade reports and journals](trade-reports-and-journals.md).
