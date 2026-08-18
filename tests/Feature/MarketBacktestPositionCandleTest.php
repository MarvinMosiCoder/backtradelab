<?php

namespace Tests\Feature;

use App\Http\Controllers\MarketBacktestController;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\AdmUser;
use App\Models\MarketBacktestAccount;
use App\Models\MarketBacktestPosition;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MarketBacktestPositionCandleTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated backtest feature tests.');
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        $this->withoutMiddleware(HandleInertiaRequests::class);
        $this->createSchema();

        Route::middleware(['web', 'auth'])->post(
            '/_test/positions/{position}/process-candle',
            [MarketBacktestController::class, 'processPositionCandle']
        );
    }

    public function test_long_position_adverse_price_tracks_the_lowest_low_and_never_recovers_upward(): void
    {
        [$user, , $position] = $this->openPosition([
            'side' => 'long',
            'entry_price' => 100,
            'favorable_price' => 100,
            'adverse_price' => 100,
        ]);

        $this->actingAs($user)->postJson("/_test/positions/{$position->id}/process-candle", [
            'high' => 105,
            'low' => 90,
            'price' => 95,
            'executed_at_time' => 1700000100,
        ])->assertOk()->assertJsonPath('triggered', false);

        $position->refresh();
        $this->assertSame(90.0, (float) $position->adverse_price);
        $this->assertSame(105.0, (float) $position->favorable_price);
        $this->assertSame('open', $position->status);

        // A subsequent candle whose low is higher must not pull the worst-case price back up.
        $this->actingAs($user)->postJson("/_test/positions/{$position->id}/process-candle", [
            'high' => 110,
            'low' => 95,
            'price' => 102,
            'executed_at_time' => 1700000200,
        ])->assertOk()->assertJsonPath('triggered', false);

        $position->refresh();
        $this->assertSame(90.0, (float) $position->adverse_price);
        $this->assertSame(110.0, (float) $position->favorable_price);
    }

    public function test_short_position_adverse_price_tracks_the_highest_high_and_never_recovers_downward(): void
    {
        [$user, , $position] = $this->openPosition([
            'side' => 'short',
            'entry_price' => 100,
            'favorable_price' => 100,
            'adverse_price' => 100,
        ]);

        $this->actingAs($user)->postJson("/_test/positions/{$position->id}/process-candle", [
            'high' => 110,
            'low' => 95,
            'price' => 105,
            'executed_at_time' => 1700000100,
        ])->assertOk()->assertJsonPath('triggered', false);

        $position->refresh();
        $this->assertSame(110.0, (float) $position->adverse_price);
        $this->assertSame(95.0, (float) $position->favorable_price);

        // A subsequent candle whose high is lower must not pull the worst-case price back down.
        $this->actingAs($user)->postJson("/_test/positions/{$position->id}/process-candle", [
            'high' => 105,
            'low' => 90,
            'price' => 98,
            'executed_at_time' => 1700000200,
        ])->assertOk()->assertJsonPath('triggered', false);

        $position->refresh();
        $this->assertSame(110.0, (float) $position->adverse_price);
        $this->assertSame(90.0, (float) $position->favorable_price);
    }

    public function test_stop_loss_still_triggers_via_process_candle_with_adverse_price_column_present(): void
    {
        [$user, , $position] = $this->openPosition([
            'side' => 'long',
            'entry_price' => 100,
            'stop_loss' => 90,
            'favorable_price' => 100,
            'adverse_price' => 100,
        ]);

        $this->actingAs($user)->postJson("/_test/positions/{$position->id}/process-candle", [
            'high' => 95,
            'low' => 85,
            'price' => 88,
            'executed_at_time' => 1700000100,
        ])->assertOk()->assertJsonPath('success', true);

        $position->refresh();
        $this->assertSame('closed', $position->status);
        $this->assertSame('stop_loss', $position->close_reason);
        $this->assertSame(90.0, (float) $position->exit_price);
        // The excursion for the triggering candle is still captured before the position closes.
        $this->assertSame(85.0, (float) $position->adverse_price);
    }

    public function test_take_profit_still_triggers_via_process_candle_with_adverse_price_column_present(): void
    {
        [$user, , $position] = $this->openPosition([
            'side' => 'long',
            'entry_price' => 100,
            'take_profit' => 120,
            'favorable_price' => 100,
            'adverse_price' => 100,
        ]);

        $this->actingAs($user)->postJson("/_test/positions/{$position->id}/process-candle", [
            'high' => 125,
            'low' => 115,
            'price' => 122,
            'executed_at_time' => 1700000100,
        ])->assertOk()->assertJsonPath('success', true);

        $position->refresh();
        $this->assertSame('closed', $position->status);
        $this->assertSame('take_profit', $position->close_reason);
        $this->assertSame(120.0, (float) $position->exit_price);
        $this->assertSame(125.0, (float) $position->favorable_price);
        // The low never dipped below entry, so the running worst price stays at its seed value.
        $this->assertSame(100.0, (float) $position->adverse_price);
    }

    public function test_liquidation_still_triggers_via_process_candle_with_adverse_price_column_present(): void
    {
        [$user, , $position] = $this->openPosition([
            'side' => 'long',
            'entry_price' => 100,
            'liquidation_price' => 80,
            'favorable_price' => 100,
            'adverse_price' => 100,
        ]);

        $this->actingAs($user)->postJson("/_test/positions/{$position->id}/process-candle", [
            'high' => 82,
            'low' => 75,
            'price' => 78,
            'executed_at_time' => 1700000100,
        ])->assertOk()->assertJsonPath('success', true);

        $position->refresh();
        $this->assertSame('closed', $position->status);
        $this->assertSame('liquidation', $position->close_reason);
        $this->assertSame(80.0, (float) $position->exit_price);
        $this->assertSame(75.0, (float) $position->adverse_price);
    }

    public function test_processing_a_candle_for_a_position_with_null_adverse_price_does_not_error(): void
    {
        // Simulates a legacy row created before the adverse_price migration: favorable_price is
        // already populated by the earlier migration, but adverse_price is still null.
        [$user, , $position] = $this->openPosition([
            'side' => 'long',
            'entry_price' => 100,
            'favorable_price' => 100,
            'adverse_price' => null,
        ]);

        $this->assertNull($position->adverse_price);

        $this->actingAs($user)->postJson("/_test/positions/{$position->id}/process-candle", [
            'high' => 105,
            'low' => 95,
            'price' => 102,
            'executed_at_time' => 1700000100,
        ])->assertOk()->assertJsonPath('triggered', false);

        $position->refresh();
        $this->assertSame(95.0, (float) $position->adverse_price);
    }

    private function createSchema(): void
    {
        Schema::create('adm_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password')->nullable();
            $table->string('status')->default('ACTIVE');
            $table->string('timezone')->nullable();
            $table->unsignedBigInteger('id_adm_privileges')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
        Schema::create('market_backtest_accounts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('adm_user_id');
            $table->string('name')->default('Demo Account');
            $table->string('quote_currency')->default('USDT');
            $table->decimal('starting_balance', 24, 8)->default(1000);
            $table->decimal('cash_balance', 24, 8)->default(1000);
            $table->decimal('realized_pnl', 24, 8)->default(0);
            $table->decimal('fees_paid', 24, 8)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('market_backtest_sessions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('adm_user_id');
            $table->unsignedBigInteger('market_backtest_account_id');
            $table->string('name');
            $table->string('symbol');
            $table->string('exchange')->nullable();
            $table->string('market_category')->nullable();
            $table->string('timeframe')->nullable();
            $table->decimal('starting_balance', 24, 8)->default(0);
            $table->unsignedBigInteger('started_at_time')->nullable();
            $table->unsignedBigInteger('ended_at_time')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });
        Schema::create('market_backtest_positions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('market_backtest_account_id');
            $table->unsignedBigInteger('market_backtest_session_id')->nullable();
            $table->string('symbol');
            $table->string('side');
            $table->decimal('quantity', 24, 10);
            $table->decimal('entry_price', 24, 8);
            $table->decimal('margin', 24, 8);
            $table->decimal('leverage', 8, 2)->default(1);
            $table->decimal('entry_fee', 24, 8)->default(0);
            $table->decimal('exit_fee', 24, 8)->default(0);
            $table->decimal('realized_pnl', 24, 8)->default(0);
            $table->decimal('exit_price', 24, 8)->nullable();
            $table->unsignedBigInteger('opened_at_time')->nullable();
            $table->unsignedBigInteger('closed_at_time')->nullable();
            $table->decimal('stop_loss', 24, 8)->nullable();
            $table->decimal('take_profit', 24, 8)->nullable();
            $table->decimal('liquidation_price', 24, 8)->nullable();
            $table->decimal('favorable_price', 24, 8)->nullable();
            $table->decimal('adverse_price', 24, 8)->nullable();
            $table->boolean('partial_take_profit_executed')->default(false);
            $table->string('close_reason', 32)->nullable();
            $table->string('status')->default('open');
            $table->timestamps();
        });
        Schema::create('market_backtest_trades', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('market_backtest_account_id');
            $table->unsignedBigInteger('market_backtest_session_id')->nullable();
            $table->unsignedBigInteger('market_backtest_position_id')->nullable();
            $table->string('symbol');
            $table->string('side');
            $table->string('action');
            $table->decimal('quantity', 24, 10);
            $table->decimal('price', 24, 8);
            $table->decimal('notional', 24, 8);
            $table->decimal('fee', 24, 8)->default(0);
            $table->decimal('pnl', 24, 8)->nullable();
            $table->unsignedBigInteger('executed_at_time')->nullable();
            $table->timestamps();
        });
    }

    private function user(string $email): AdmUser
    {
        return AdmUser::query()->create([
            'name' => 'Trader',
            'email' => $email,
            'password' => 'password',
            'status' => 'ACTIVE',
        ]);
    }

    private function openPosition(array $overrides = []): array
    {
        $user = $this->user(uniqid('trader-', true).'@example.test');
        $account = MarketBacktestAccount::query()->create([
            'adm_user_id' => $user->id,
            'name' => 'Demo Account',
            'quote_currency' => 'USDT',
            'starting_balance' => 1000,
            'cash_balance' => 1000,
            'realized_pnl' => 0,
            'fees_paid' => 0,
            'is_active' => true,
        ]);

        $position = MarketBacktestPosition::query()->create(array_merge([
            'market_backtest_account_id' => $account->id,
            'symbol' => 'BTCUSDT',
            'side' => 'long',
            'quantity' => 10,
            'entry_price' => 100,
            'margin' => 100,
            'leverage' => 10,
            'entry_fee' => 0.4,
            'status' => 'open',
        ], $overrides));

        return [$user, $account, $position];
    }
}
