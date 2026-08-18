<?php

namespace Tests\Feature;

use App\Http\Controllers\TrainingChallengeController;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\AdmUser;
use App\Models\MarketBacktestAccount;
use App\Models\MarketBacktestPosition;
use App\Models\TrainingChallenge;
use App\Models\TrainingChallengeAttempt;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class TrainingChallengeTest extends TestCase
{
    private const BASE_TIME = 1700000000;

    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated training-challenge feature tests.');
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        $this->withoutMiddleware(HandleInertiaRequests::class);
        $this->createSchema();

        Route::middleware(['web', 'auth'])->get(
            '/_test/training-challenges/catalog',
            [TrainingChallengeController::class, 'index']
        );
        Route::middleware(['web', 'auth'])->post(
            '/_test/training-challenges/{challenge}/attempts',
            [TrainingChallengeController::class, 'startAttempt']
        );
        Route::middleware(['web', 'auth'])->get(
            '/_test/training-challenges/attempts',
            [TrainingChallengeController::class, 'listMyAttempts']
        );
        Route::middleware(['web', 'auth'])->get(
            '/_test/training-challenges/attempts/{attempt}',
            [TrainingChallengeController::class, 'showAttempt']
        );
        Route::middleware(['web', 'auth'])->post(
            '/_test/training-challenges/attempts/{attempt}/abandon',
            [TrainingChallengeController::class, 'abandonAttempt']
        );
    }

    public function test_start_attempt_snapshots_the_accounts_current_cash_balance(): void
    {
        $user = $this->user('starter@example.test');
        $account = $this->account($user, 750.5);
        $challenge = $this->challenge('risk-discipline-20-test', ['requiredTrades' => 5]);

        $this->actingAs($user)->postJson("/_test/training-challenges/{$challenge->id}/attempts")
            ->assertCreated()
            ->assertJsonPath('attempt.status', 'active')
            ->assertJsonPath('attempt.startingBalanceSnapshot', 750.5);

        $this->assertDatabaseHas('training_challenge_attempts', [
            'adm_user_id' => $user->id,
            'training_challenge_id' => $challenge->id,
            'market_backtest_account_id' => $account->id,
            'starting_balance_snapshot' => 750.5,
            'status' => 'active',
        ]);
    }

    public function test_starting_a_second_attempt_while_one_is_active_is_rejected(): void
    {
        $user = $this->user('double-start@example.test');
        $this->account($user, 1000);
        $challenge = $this->challenge('double-start-test', ['requiredTrades' => 5]);

        $this->actingAs($user)->postJson("/_test/training-challenges/{$challenge->id}/attempts")->assertCreated();
        $this->actingAs($user)->postJson("/_test/training-challenges/{$challenge->id}/attempts")->assertStatus(422);

        $this->assertSame(1, TrainingChallengeAttempt::query()
            ->where('adm_user_id', $user->id)
            ->where('training_challenge_id', $challenge->id)
            ->count());
    }

    public function test_scoring_excludes_positions_closed_before_the_attempt_started(): void
    {
        $user = $this->user('window@example.test');
        $account = $this->account($user, 1000);
        $challenge = $this->challenge('window-test', ['requiredTrades' => 5]);
        $attempt = $this->attempt($user, $account, $challenge, [
            'started_at' => Carbon::createFromTimestamp(self::BASE_TIME),
        ]);

        $this->closedPosition($account, ['closed_at_time' => self::BASE_TIME - 100]);
        $this->closedPosition($account, ['closed_at_time' => self::BASE_TIME + 100]);

        $this->actingAs($user)->getJson("/_test/training-challenges/attempts/{$attempt->id}")
            ->assertOk()
            ->assertJsonPath('score.tradeCount', 1);
    }

    public function test_risk_percent_rule_flags_the_over_risked_trade_and_passes_the_in_bounds_trade(): void
    {
        $user = $this->user('risk@example.test');
        $account = $this->account($user, 1000);
        $challenge = $this->challenge('risk-test', ['requiredTrades' => 5, 'maxRiskPercentPerTrade' => 1.0]);
        $attempt = $this->attempt($user, $account, $challenge, [
            'started_at' => Carbon::createFromTimestamp(self::BASE_TIME),
        ]);

        $overRisked = $this->closedPosition($account, [
            'entry_price' => 100,
            'stop_loss' => 90,
            'quantity' => 2,
            'original_quantity' => 2,
            'closed_at_time' => self::BASE_TIME + 10,
        ]);
        $this->closedPosition($account, [
            'entry_price' => 100,
            'stop_loss' => 99,
            'quantity' => 5,
            'original_quantity' => 5,
            'closed_at_time' => self::BASE_TIME + 20,
        ]);

        $response = $this->actingAs($user)->getJson("/_test/training-challenges/attempts/{$attempt->id}")
            ->assertOk()
            ->assertJsonPath('score.tradeCount', 2)
            ->assertJsonCount(1, 'score.violations')
            ->assertJsonPath('score.violations.0.type', 'risk_percent')
            ->assertJsonPath('score.violations.0.positionId', $overRisked->id);
    }

    public function test_require_playbook_rule_flags_a_position_missing_a_playbook(): void
    {
        $user = $this->user('playbook@example.test');
        $account = $this->account($user, 1000);
        $challenge = $this->challenge('playbook-test', ['requiredTrades' => 5, 'requirePlaybookId' => true]);
        $attempt = $this->attempt($user, $account, $challenge, [
            'started_at' => Carbon::createFromTimestamp(self::BASE_TIME),
        ]);

        $missingPlaybook = $this->closedPosition($account, [
            'market_backtest_playbook_id' => null,
            'closed_at_time' => self::BASE_TIME + 10,
        ]);
        $this->closedPosition($account, [
            'market_backtest_playbook_id' => 42,
            'closed_at_time' => self::BASE_TIME + 20,
        ]);

        $this->actingAs($user)->getJson("/_test/training-challenges/attempts/{$attempt->id}")
            ->assertOk()
            ->assertJsonCount(1, 'score.violations')
            ->assertJsonPath('score.violations.0.type', 'missing_playbook')
            ->assertJsonPath('score.violations.0.positionId', $missingPlaybook->id);
    }

    public function test_max_consecutive_losses_hard_fails_and_the_next_show_flips_status_to_failed(): void
    {
        $user = $this->user('streak@example.test');
        $account = $this->account($user, 1000);
        $challenge = $this->challenge('streak-test', ['requiredTrades' => 10, 'maxConsecutiveLosses' => 3]);
        $attempt = $this->attempt($user, $account, $challenge, [
            'started_at' => Carbon::createFromTimestamp(self::BASE_TIME),
        ]);

        for ($i = 0; $i < 4; $i++) {
            $this->closedPosition($account, [
                'realized_pnl' => -10,
                'closed_at_time' => self::BASE_TIME + 10 + $i,
            ]);
        }

        $this->actingAs($user)->getJson("/_test/training-challenges/attempts/{$attempt->id}")
            ->assertOk()
            ->assertJsonPath('score.hardFailed', true)
            ->assertJsonPath('attempt.status', 'failed');

        $fresh = $attempt->fresh();
        $this->assertSame('failed', $fresh->status);
        $this->assertNotNull($fresh->completed_at);
        $this->assertTrue($fresh->result_snapshot['hardFailed']);
    }

    public function test_reaching_required_trades_with_no_violations_completes_and_freezes_the_snapshot(): void
    {
        $user = $this->user('complete@example.test');
        $account = $this->account($user, 1000);
        $challenge = $this->challenge('complete-test', ['requiredTrades' => 3]);
        $attempt = $this->attempt($user, $account, $challenge, [
            'started_at' => Carbon::createFromTimestamp(self::BASE_TIME),
        ]);

        for ($i = 0; $i < 3; $i++) {
            $this->closedPosition($account, [
                'realized_pnl' => 10,
                'closed_at_time' => self::BASE_TIME + 10 + $i,
            ]);
        }

        $this->actingAs($user)->getJson("/_test/training-challenges/attempts/{$attempt->id}")
            ->assertOk()
            ->assertJsonPath('score.passed', true)
            ->assertJsonPath('score.tradeCount', 3)
            ->assertJsonPath('attempt.status', 'completed');

        $fresh = $attempt->fresh();
        $this->assertSame('completed', $fresh->status);
        $this->assertSame(3, $fresh->result_snapshot['tradeCount']);

        // A trade closed after completion must not change the frozen result.
        $this->closedPosition($account, [
            'realized_pnl' => 10,
            'closed_at_time' => self::BASE_TIME + 50,
        ]);

        $this->actingAs($user)->getJson("/_test/training-challenges/attempts/{$attempt->id}")
            ->assertOk()
            ->assertJsonPath('score.tradeCount', 3)
            ->assertJsonPath('attempt.status', 'completed');
    }

    public function test_abandon_attempt_sets_status_and_rejects_abandoning_an_already_completed_attempt(): void
    {
        $user = $this->user('abandon@example.test');
        $account = $this->account($user, 1000);
        $challenge = $this->challenge('abandon-test', ['requiredTrades' => 5]);

        $activeAttempt = $this->attempt($user, $account, $challenge);
        $this->actingAs($user)->postJson("/_test/training-challenges/attempts/{$activeAttempt->id}/abandon")
            ->assertOk()
            ->assertJsonPath('attempt.status', 'abandoned');

        $freshActive = $activeAttempt->fresh();
        $this->assertSame('abandoned', $freshActive->status);
        $this->assertNotNull($freshActive->completed_at);

        $completedAttempt = $this->attempt($user, $account, $challenge, [
            'status' => 'completed',
            'completed_at' => now(),
            'result_snapshot' => ['tradeCount' => 5, 'passed' => true, 'hardFailed' => false, 'violations' => []],
        ]);
        $this->actingAs($user)->postJson("/_test/training-challenges/attempts/{$completedAttempt->id}/abandon")
            ->assertStatus(422);

        $this->assertSame('completed', $completedAttempt->fresh()->status);
    }

    public function test_cross_user_show_and_abandon_return_not_found(): void
    {
        $owner = $this->user('owner@example.test');
        $account = $this->account($owner, 1000);
        $challenge = $this->challenge('cross-user-test', ['requiredTrades' => 5]);
        $attempt = $this->attempt($owner, $account, $challenge);

        $other = $this->user('intruder@example.test');

        $this->actingAs($other)->getJson("/_test/training-challenges/attempts/{$attempt->id}")->assertNotFound();
        $this->actingAs($other)->postJson("/_test/training-challenges/attempts/{$attempt->id}/abandon")->assertNotFound();

        $this->assertSame('active', $attempt->fresh()->status);
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
            // AdmUser::boot()'s creating() hook unconditionally sets this column.
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
        Schema::create('market_backtest_positions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('market_backtest_account_id');
            $table->unsignedBigInteger('market_backtest_session_id')->nullable();
            $table->unsignedBigInteger('market_backtest_playbook_id')->nullable();
            $table->string('symbol')->default('BTCUSDT');
            $table->string('side')->default('long');
            $table->decimal('quantity', 24, 10)->default(1);
            $table->decimal('original_quantity', 24, 10)->nullable();
            $table->decimal('entry_price', 24, 8)->default(100);
            $table->decimal('margin', 24, 8)->default(100);
            $table->decimal('original_margin', 24, 8)->nullable();
            $table->decimal('leverage', 8, 2)->default(1);
            $table->decimal('entry_fee', 24, 8)->default(0);
            $table->decimal('exit_fee', 24, 8)->default(0);
            $table->decimal('realized_pnl', 24, 8)->default(0);
            $table->decimal('exit_price', 24, 8)->nullable();
            $table->unsignedBigInteger('opened_at_time')->nullable();
            $table->unsignedBigInteger('closed_at_time')->nullable();
            $table->decimal('stop_loss', 24, 8)->nullable();
            $table->decimal('take_profit', 24, 8)->nullable();
            $table->string('status')->default('closed');
            $table->timestamps();
        });
        Schema::create('training_challenges', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 60)->unique();
            $table->string('name', 120);
            $table->text('description');
            $table->json('rules');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('training_challenge_attempts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('adm_user_id');
            $table->unsignedBigInteger('training_challenge_id');
            $table->unsignedBigInteger('market_backtest_account_id');
            $table->decimal('starting_balance_snapshot', 24, 8);
            $table->timestamp('started_at');
            $table->string('status', 16)->default('active');
            $table->timestamp('completed_at')->nullable();
            $table->json('result_snapshot')->nullable();
            $table->timestamps();

            $table->index(['adm_user_id', 'status']);
        });
    }

    private function user(string $email): AdmUser
    {
        // AdmUser::boot()'s creating() hook overwrites name/email/id_adm_privileges from the
        // current bound request (it's designed for the one real admin-create endpoint that
        // calls AdmUser::create() mid-request). Outside of a dispatched HTTP request there is
        // no such input, so fixture users are inserted directly and rehydrated instead of going
        // through Eloquent's create(), sidestepping that hook entirely.
        $id = DB::table('adm_users')->insertGetId([
            'name' => 'Trader',
            'email' => $email,
            'password' => 'password',
            'status' => 'ACTIVE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return AdmUser::query()->findOrFail($id);
    }

    private function account(AdmUser $user, float $cashBalance = 1000): MarketBacktestAccount
    {
        return MarketBacktestAccount::query()->create([
            'adm_user_id' => $user->id,
            'name' => 'Demo Account',
            'quote_currency' => 'USDT',
            'starting_balance' => 1000,
            'cash_balance' => $cashBalance,
            'realized_pnl' => 0,
            'fees_paid' => 0,
            'is_active' => true,
        ]);
    }

    private function challenge(string $slug, array $rules): TrainingChallenge
    {
        $id = DB::table('training_challenges')->insertGetId([
            'slug' => $slug,
            'name' => 'Test Challenge',
            'description' => 'Test challenge seeded directly in the test.',
            'rules' => json_encode($rules),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return TrainingChallenge::query()->findOrFail($id);
    }

    private function attempt(AdmUser $user, MarketBacktestAccount $account, TrainingChallenge $challenge, array $overrides = []): TrainingChallengeAttempt
    {
        return TrainingChallengeAttempt::query()->create(array_merge([
            'adm_user_id' => $user->id,
            'training_challenge_id' => $challenge->id,
            'market_backtest_account_id' => $account->id,
            'starting_balance_snapshot' => $account->cash_balance,
            'started_at' => now(),
            'status' => 'active',
        ], $overrides));
    }

    private function closedPosition(MarketBacktestAccount $account, array $overrides = []): MarketBacktestPosition
    {
        return MarketBacktestPosition::query()->create(array_merge([
            'market_backtest_account_id' => $account->id,
            'symbol' => 'BTCUSDT',
            'side' => 'long',
            'quantity' => 1,
            'original_quantity' => 1,
            'entry_price' => 100,
            'margin' => 100,
            'original_margin' => 100,
            'leverage' => 1,
            'entry_fee' => 0,
            'exit_fee' => 0,
            'realized_pnl' => 0,
            'exit_price' => 100,
            'opened_at_time' => self::BASE_TIME - 1000,
            'closed_at_time' => self::BASE_TIME,
            'stop_loss' => null,
            'take_profit' => null,
            'market_backtest_playbook_id' => null,
            'status' => 'closed',
        ], $overrides));
    }
}
