<?php

namespace Tests\Feature;

use App\Http\Controllers\MarketBacktestPlaybookController;
use App\Http\Controllers\MarketBacktestRiskSettingController;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\AdmUser;
use App\Models\MarketBacktestPlaybook;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MarketBacktestPlaybookTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated playbook feature tests.');
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');
        $this->withoutMiddleware(HandleInertiaRequests::class);

        Schema::create('adm_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('status')->default('ACTIVE');
            $table->rememberToken();
            $table->timestamps();
        });
        Schema::create('market_backtest_playbooks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('adm_user_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->text('entry_rules')->nullable();
            $table->text('confirmation_rules')->nullable();
            $table->text('invalidation_rules')->nullable();
            $table->text('stop_rules')->nullable();
            $table->text('target_rules')->nullable();
            $table->json('checklist')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['adm_user_id', 'name']);
        });
        Schema::create('market_backtest_risk_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('adm_user_id')->unique();
            $table->string('mode')->default('warning');
            $table->decimal('max_daily_loss', 24, 8)->nullable();
            $table->unsignedSmallInteger('max_trades_per_day')->nullable();
            $table->unsignedSmallInteger('max_concurrent_positions')->nullable();
            $table->unsignedSmallInteger('max_consecutive_losses')->nullable();
            $table->boolean('is_enabled')->default(false);
            $table->timestamps();
        });

        Route::middleware(['web', 'auth'])->group(function () {
            Route::get('/_test/playbooks', [MarketBacktestPlaybookController::class, 'index']);
            Route::post('/_test/playbooks', [MarketBacktestPlaybookController::class, 'store']);
            Route::put('/_test/playbooks/{playbook}', [MarketBacktestPlaybookController::class, 'update']);
            Route::delete('/_test/playbooks/{playbook}', [MarketBacktestPlaybookController::class, 'destroy']);
            Route::get('/_test/risk-settings', [MarketBacktestRiskSettingController::class, 'show']);
            Route::put('/_test/risk-settings', [MarketBacktestRiskSettingController::class, 'update']);
        });
    }

    public function test_user_can_create_and_list_a_normalized_playbook(): void
    {
        $user = $this->user('owner@example.test');

        $this->actingAs($user)->postJson('/_test/playbooks', [
            'name' => 'Breakout Retest',
            'entry_rules' => 'Wait for the retest.',
            'checklist' => [' Trend confirmed ', 'Stop defined', 'trend confirmed'],
        ])->assertCreated()
            ->assertJsonPath('playbook.name', 'Breakout Retest')
            ->assertJsonCount(2, 'playbook.checklist');

        $this->actingAs($user)->getJson('/_test/playbooks')
            ->assertOk()
            ->assertJsonCount(1, 'playbooks');
    }

    public function test_user_cannot_update_or_archive_another_users_playbook(): void
    {
        $owner = $this->user('owner@example.test');
        $other = $this->user('other@example.test');
        $playbook = MarketBacktestPlaybook::create([
            'adm_user_id' => $owner->id,
            'name' => 'Owner setup',
            'checklist' => ['Rule one'],
        ]);

        $this->actingAs($other)->putJson("/_test/playbooks/{$playbook->id}", [
            'name' => 'Stolen setup',
            'checklist' => [],
        ])->assertNotFound();

        $this->actingAs($other)->deleteJson("/_test/playbooks/{$playbook->id}")->assertNotFound();
        $this->assertTrue($playbook->fresh()->is_active);
    }

    public function test_archive_hides_playbook_from_default_order_entry_list(): void
    {
        $user = $this->user('owner@example.test');
        $playbook = MarketBacktestPlaybook::create([
            'adm_user_id' => $user->id,
            'name' => 'Old setup',
            'checklist' => [],
        ]);

        $this->actingAs($user)->deleteJson("/_test/playbooks/{$playbook->id}")->assertOk();
        $this->actingAs($user)->getJson('/_test/playbooks')->assertJsonCount(0, 'playbooks');
        $this->actingAs($user)->getJson('/_test/playbooks?include_archived=1')->assertJsonCount(1, 'playbooks');
    }

    public function test_user_can_enable_enforced_risk_guardrails(): void
    {
        $user = $this->user('risk-owner@example.test');

        $this->actingAs($user)->putJson('/_test/risk-settings', [
            'mode' => 'enforced',
            'max_daily_loss' => 250,
            'max_trades_per_day' => 8,
            'max_concurrent_positions' => 2,
            'max_consecutive_losses' => 3,
            'is_enabled' => true,
        ])->assertOk()
            ->assertJsonPath('settings.mode', 'enforced')
            ->assertJsonPath('settings.maxDailyLoss', 250)
            ->assertJsonPath('settings.isEnabled', true);

        $this->actingAs($user)->getJson('/_test/risk-settings')
            ->assertJsonPath('settings.maxTradesPerDay', 8);
    }

    public function test_risk_guardrail_limits_reject_zero_values(): void
    {
        $user = $this->user('risk-validation@example.test');

        $this->actingAs($user)->putJson('/_test/risk-settings', [
            'mode' => 'enforced',
            'max_trades_per_day' => 0,
            'is_enabled' => true,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('max_trades_per_day');
    }

    private function user(string $email): AdmUser
    {
        return AdmUser::create([
            'name' => 'Trader',
            'email' => $email,
            'password' => 'password',
            'status' => 'ACTIVE',
        ]);
    }
}
