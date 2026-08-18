<?php

namespace Tests\Feature;

use App\Http\Controllers\MarketBacktestShareLinkController;
use App\Http\Controllers\MentorReviewController;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\AdmUser;
use App\Models\MarketBacktestAccount;
use App\Models\MarketBacktestPosition;
use App\Models\MarketBacktestSession;
use App\Models\MarketBacktestShareLink;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MarketBacktestShareLinkTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated share-link feature tests.');
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
            $table->unsignedBigInteger('id_adm_privileges')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('market_backtest_accounts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('adm_user_id');
            $table->string('name', 80)->default('Demo Account');
            $table->string('quote_currency', 16)->default('USDT');
            $table->decimal('starting_balance', 24, 8)->default(10000);
            $table->decimal('cash_balance', 24, 8)->default(10000);
            $table->decimal('realized_pnl', 24, 8)->default(0);
            $table->decimal('fees_paid', 24, 8)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('market_backtest_sessions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('market_backtest_account_id');
            $table->unsignedBigInteger('adm_user_id');
            $table->string('name', 120);
            $table->string('symbol', 32)->default('BTCUSDT');
            $table->string('exchange', 32)->default('bybit');
            $table->string('market_category', 32)->default('spot');
            $table->string('timeframe', 16)->default('15m');
            $table->decimal('starting_balance', 24, 8)->default(10000);
            $table->unsignedBigInteger('started_at_time')->nullable();
            $table->unsignedBigInteger('ended_at_time')->nullable();
            $table->string('status', 16)->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('market_backtest_positions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('market_backtest_account_id');
            $table->unsignedBigInteger('market_backtest_session_id')->nullable();
            $table->unsignedBigInteger('market_backtest_playbook_id')->nullable();
            $table->string('symbol', 32);
            $table->string('side', 8);
            $table->decimal('quantity', 24, 10)->default(1);
            $table->decimal('original_quantity', 24, 10)->nullable();
            $table->decimal('entry_price', 24, 8)->default(0);
            $table->decimal('margin', 24, 8)->default(0);
            $table->decimal('original_margin', 24, 8)->nullable();
            $table->decimal('leverage', 8, 2)->nullable();
            $table->decimal('entry_fee', 24, 8)->default(0);
            $table->decimal('original_entry_fee', 24, 8)->nullable();
            $table->decimal('exit_fee', 24, 8)->default(0);
            $table->decimal('realized_pnl', 24, 8)->default(0);
            $table->decimal('exit_price', 24, 8)->nullable();
            $table->unsignedBigInteger('opened_at_time')->nullable();
            $table->unsignedBigInteger('closed_at_time')->nullable();
            $table->decimal('stop_loss', 24, 8)->nullable();
            $table->decimal('take_profit', 24, 8)->nullable();
            $table->string('status', 16)->default('open');
            $table->string('close_reason', 32)->nullable();
            $table->string('setup_tag', 80)->nullable();
            $table->json('tags')->nullable();
            $table->text('entry_reason')->nullable();
            $table->text('exit_reason')->nullable();
            $table->text('mistake')->nullable();
            $table->string('emotion', 80)->nullable();
            $table->text('journal_notes')->nullable();
            $table->json('playbook_snapshot')->nullable();
            $table->json('checklist_answers')->nullable();
            $table->timestamps();
        });

        // Required because MarketBacktestReportService::serializeReportPosition() eager-loads
        // / queries the `snapshots` relation on every position it serializes — this table has
        // to exist even though this test's spec-listed table set didn't call it out.
        Schema::create('market_backtest_snapshots', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('market_backtest_account_id');
            $table->unsignedBigInteger('market_backtest_session_id')->nullable();
            $table->unsignedBigInteger('market_backtest_position_id');
            $table->string('type', 16);
            $table->string('path')->nullable();
            $table->string('url')->nullable();
            $table->unsignedBigInteger('captured_at_time')->nullable();
            $table->timestamps();
        });

        Schema::create('market_backtest_share_links', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('adm_user_id');
            $table->unsignedBigInteger('market_backtest_account_id');
            $table->string('token_hash', 64)->unique();
            $table->string('label', 120)->nullable();
            $table->string('scope_type', 16);
            $table->unsignedBigInteger('session_id')->nullable();
            $table->unsignedBigInteger('range_start_time')->nullable();
            $table->unsignedBigInteger('range_end_time')->nullable();
            $table->json('trade_ids')->nullable();
            $table->boolean('include_journal')->default(true);
            $table->boolean('include_snapshots')->default(true);
            $table->boolean('include_analytics')->default(true);
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('last_viewed_at')->nullable();
            $table->unsignedInteger('view_count')->default(0);
            $table->timestamps();
        });

        // Authenticated management side.
        Route::middleware(['web', 'auth'])->group(function () {
            Route::get('/_test/share-links', [MarketBacktestShareLinkController::class, 'index']);
            Route::post('/_test/share-links', [MarketBacktestShareLinkController::class, 'store']);
            Route::delete('/_test/share-links/{shareLink}', [MarketBacktestShareLinkController::class, 'destroy']);
        });

        // Public side — no auth middleware, matching how it will really be registered.
        Route::middleware(['web'])->group(function () {
            Route::get('/_test/mentor-review/{token}', [MentorReviewController::class, 'show']);
        });
    }

    public function test_store_returns_url_with_token_and_never_exposes_token_hash(): void
    {
        $user = $this->user('owner@example.test');
        $account = $this->account($user);
        $position = $this->closedPosition($account, ['realized_pnl' => 50]);

        $response = $this->actingAs($user)->postJson('/_test/share-links', [
            'label' => 'For my coach',
            'scope_type' => 'trade_ids',
            'trade_ids' => [$position->id],
        ])->assertCreated();

        $url = $response->json('url');
        $this->assertNotEmpty($url);
        $this->assertStringContainsString('/mentor-review/', $url);

        $token = substr($url, strrpos($url, '/') + 1);
        $this->assertNotEmpty($token);

        $shareLink = MarketBacktestShareLink::firstOrFail();
        $this->assertSame(hash('sha256', $token), $shareLink->token_hash);
        $this->assertNotSame($token, $shareLink->token_hash);

        // token_hash must never be present in the store() JSON response.
        $response->assertJsonMissingPath('shareLink.token_hash')
            ->assertJsonMissingPath('shareLink.tokenHash');
        $this->assertStringNotContainsString($shareLink->token_hash, $response->getContent());

        // ...nor in a follow-up index() call.
        $indexResponse = $this->actingAs($user)->getJson('/_test/share-links')->assertOk();
        $indexResponse->assertJsonMissingPath('shareLinks.0.token_hash')
            ->assertJsonMissingPath('shareLinks.0.tokenHash');
        $this->assertStringNotContainsString($shareLink->token_hash, $indexResponse->getContent());
        $this->assertStringNotContainsString($token, $indexResponse->getContent());
    }

    public function test_public_show_scopes_to_the_declared_session_only(): void
    {
        $user = $this->user('session-owner@example.test');
        $account = $this->account($user);
        $session = $this->createSession($account, $user);

        $inScope = $this->closedPosition($account, ['market_backtest_session_id' => $session->id, 'symbol' => 'INSCOPE']);
        $otherSession = $this->closedPosition($account, ['market_backtest_session_id' => $session->id + 999, 'symbol' => 'OTHERSESSION']);

        $otherAccountUser = $this->user('other-account@example.test');
        $otherAccount = $this->account($otherAccountUser);
        // Same numeric session id, but a position on a completely different account — must
        // still be excluded by the account hard floor.
        $foreignAccount = $this->closedPosition($otherAccount, ['market_backtest_session_id' => $session->id, 'symbol' => 'FOREIGNACCOUNT']);

        $shareLink = MarketBacktestShareLink::create([
            'adm_user_id' => $user->id,
            'market_backtest_account_id' => $account->id,
            'token_hash' => hash('sha256', 'session-token'),
            'scope_type' => 'session',
            'session_id' => $session->id,
        ]);

        $symbols = $this->getVisibleSymbols('session-token');

        $this->assertSame(['INSCOPE'], $symbols);
    }

    public function test_public_show_scopes_to_the_declared_date_range_only(): void
    {
        $user = $this->user('range-owner@example.test');
        $account = $this->account($user);

        $inScope = $this->closedPosition($account, ['closed_at_time' => 1000, 'symbol' => 'INSCOPE']);
        $beforeRange = $this->closedPosition($account, ['closed_at_time' => 500, 'symbol' => 'BEFORE']);
        $afterRange = $this->closedPosition($account, ['closed_at_time' => 5000, 'symbol' => 'AFTER']);

        $otherAccountUser = $this->user('range-other-account@example.test');
        $otherAccount = $this->account($otherAccountUser);
        $foreignAccount = $this->closedPosition($otherAccount, ['closed_at_time' => 1000, 'symbol' => 'FOREIGNACCOUNT']);

        MarketBacktestShareLink::create([
            'adm_user_id' => $user->id,
            'market_backtest_account_id' => $account->id,
            'token_hash' => hash('sha256', 'range-token'),
            'scope_type' => 'date_range',
            'range_start_time' => 900,
            'range_end_time' => 1100,
        ]);

        $symbols = $this->getVisibleSymbols('range-token');

        $this->assertSame(['INSCOPE'], $symbols);
    }

    public function test_public_show_scopes_to_the_declared_trade_ids_only(): void
    {
        $user = $this->user('trades-owner@example.test');
        $account = $this->account($user);

        $inScope = $this->closedPosition($account, ['symbol' => 'INSCOPE']);
        $notSelected = $this->closedPosition($account, ['symbol' => 'NOTSELECTED']);

        $otherAccountUser = $this->user('trades-other-account@example.test');
        $otherAccount = $this->account($otherAccountUser);
        $foreignAccount = $this->closedPosition($otherAccount, ['symbol' => 'FOREIGNACCOUNT']);

        // Created directly (bypassing store()'s ownership validation) specifically to prove
        // the public controller's own hard-floor account check is real defense-in-depth, not
        // just relying on store() having validated correctly.
        MarketBacktestShareLink::create([
            'adm_user_id' => $user->id,
            'market_backtest_account_id' => $account->id,
            'token_hash' => hash('sha256', 'trades-token'),
            'scope_type' => 'trade_ids',
            'trade_ids' => [$inScope->id, $foreignAccount->id],
        ]);

        $symbols = $this->getVisibleSymbols('trades-token');

        $this->assertSame(['INSCOPE'], $symbols);
    }

    public function test_revoked_link_returns_410(): void
    {
        $user = $this->user('revoked@example.test');
        $account = $this->account($user);
        $this->closedPosition($account);

        MarketBacktestShareLink::create([
            'adm_user_id' => $user->id,
            'market_backtest_account_id' => $account->id,
            'token_hash' => hash('sha256', 'revoked-token'),
            'scope_type' => 'trade_ids',
            'trade_ids' => [],
            'revoked_at' => now(),
        ]);

        $this->getJson('/_test/mentor-review/revoked-token')->assertStatus(410);
    }

    public function test_expired_link_returns_410(): void
    {
        $user = $this->user('expired@example.test');
        $account = $this->account($user);
        $this->closedPosition($account);

        MarketBacktestShareLink::create([
            'adm_user_id' => $user->id,
            'market_backtest_account_id' => $account->id,
            'token_hash' => hash('sha256', 'expired-token'),
            'scope_type' => 'trade_ids',
            'trade_ids' => [],
            'expires_at' => now()->subMinute(),
        ]);

        $this->getJson('/_test/mentor-review/expired-token')->assertStatus(410);
    }

    public function test_unknown_token_returns_404(): void
    {
        $this->getJson('/_test/mentor-review/does-not-exist')->assertStatus(404);
    }

    public function test_include_journal_false_strips_journal_fields(): void
    {
        $user = $this->user('journal-owner@example.test');
        $account = $this->account($user);
        $position = $this->closedPosition($account, [
            'setup_tag' => 'Breakout',
            'tags' => ['momentum'],
            'entry_reason' => 'Broke resistance',
            'exit_reason' => 'Hit target',
            'mistake' => 'Sized too big',
            'emotion' => 'Confident',
            'journal_notes' => 'Solid execution',
        ]);

        MarketBacktestShareLink::create([
            'adm_user_id' => $user->id,
            'market_backtest_account_id' => $account->id,
            'token_hash' => hash('sha256', 'no-journal-token'),
            'scope_type' => 'trade_ids',
            'trade_ids' => [$position->id],
            'include_journal' => false,
        ]);

        $response = $this->withHeader('X-Inertia', 'true')->getJson('/_test/mentor-review/no-journal-token')->assertOk();

        $response->assertJsonPath('props.trades.0.setupTag', null)
            ->assertJsonPath('props.trades.0.entryReason', null)
            ->assertJsonPath('props.trades.0.exitReason', null)
            ->assertJsonPath('props.trades.0.mistake', null)
            ->assertJsonPath('props.trades.0.emotion', null)
            ->assertJsonPath('props.trades.0.journalNotes', null)
            ->assertJsonPath('props.trades.0.tags', []);
    }

    public function test_include_snapshots_false_strips_snapshot_urls(): void
    {
        $user = $this->user('snapshot-owner@example.test');
        $account = $this->account($user);
        $position = $this->closedPosition($account);

        DB::table('market_backtest_snapshots')->insert([
            'market_backtest_account_id' => $account->id,
            'market_backtest_session_id' => null,
            'market_backtest_position_id' => $position->id,
            'type' => 'entry',
            'path' => null,
            'url' => 'https://example.test/entry.png',
            'captured_at_time' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        MarketBacktestShareLink::create([
            'adm_user_id' => $user->id,
            'market_backtest_account_id' => $account->id,
            'token_hash' => hash('sha256', 'no-snapshot-token'),
            'scope_type' => 'trade_ids',
            'trade_ids' => [$position->id],
            'include_snapshots' => false,
        ]);

        $response = $this->withHeader('X-Inertia', 'true')->getJson('/_test/mentor-review/no-snapshot-token')->assertOk();

        $response->assertJsonPath('props.trades.0.entrySnapshotUrl', null)
            ->assertJsonPath('props.trades.0.exitSnapshotUrl', null);
    }

    public function test_another_user_cannot_revoke_someone_elses_link(): void
    {
        $owner = $this->user('link-owner@example.test');
        $intruder = $this->user('link-intruder@example.test');
        $account = $this->account($owner);

        $shareLink = MarketBacktestShareLink::create([
            'adm_user_id' => $owner->id,
            'market_backtest_account_id' => $account->id,
            'token_hash' => hash('sha256', 'protected-token'),
            'scope_type' => 'trade_ids',
            'trade_ids' => [],
        ]);

        $this->actingAs($intruder)->deleteJson("/_test/share-links/{$shareLink->id}")->assertNotFound();

        $this->assertNull($shareLink->fresh()->revoked_at);
    }

    public function test_view_count_and_last_viewed_at_update_on_each_public_view(): void
    {
        $user = $this->user('viewed@example.test');
        $account = $this->account($user);
        $this->closedPosition($account);

        $shareLink = MarketBacktestShareLink::create([
            'adm_user_id' => $user->id,
            'market_backtest_account_id' => $account->id,
            'token_hash' => hash('sha256', 'viewed-token'),
            'scope_type' => 'trade_ids',
            'trade_ids' => [],
        ])->refresh();

        $this->assertSame(0, $shareLink->view_count);
        $this->assertNull($shareLink->last_viewed_at);

        $this->getJson('/_test/mentor-review/viewed-token')->assertOk();
        $shareLink->refresh();
        $this->assertSame(1, $shareLink->view_count);
        $this->assertNotNull($shareLink->last_viewed_at);
        $firstViewedAt = $shareLink->last_viewed_at;

        $this->travel(1)->minutes();
        $this->getJson('/_test/mentor-review/viewed-token')->assertOk();
        $shareLink->refresh();
        $this->assertSame(2, $shareLink->view_count);
        $this->assertTrue($shareLink->last_viewed_at->gt($firstViewedAt));
    }

    /**
     * @return array<int, string> symbols of the trades visible in the public response, in
     *  response order — used by the scope tests above to assert exactly the right set of
     *  trades is present, nothing more.
     */
    private function getVisibleSymbols(string $token): array
    {
        $response = $this->withHeader('X-Inertia', 'true')->getJson("/_test/mentor-review/{$token}")->assertOk();

        return collect($response->json('props.trades'))->pluck('symbol')->all();
    }

    private function user(string $email): AdmUser
    {
        // AdmUser::boot()'s `creating` hook (app/Models/AdmUser.php) unconditionally overwrites
        // name/email/id_adm_privileges from the current request's input rather than from the
        // attributes passed to create() — merge the intended values into the request here so a
        // direct AdmUser::create() call (outside of the real admin-user HTTP flow that hook was
        // written for) still produces the record this test asked for.
        request()->merge(['name' => 'Trader', 'email' => $email, 'privilege_id' => null]);

        return AdmUser::create([
            'name' => 'Trader',
            'email' => $email,
            'password' => 'password',
            'status' => 'ACTIVE',
        ]);
    }

    private function account(AdmUser $user): MarketBacktestAccount
    {
        return MarketBacktestAccount::create([
            'adm_user_id' => $user->id,
            'name' => 'Demo Account',
            'quote_currency' => 'USDT',
            'starting_balance' => 10000,
            'cash_balance' => 10000,
            'realized_pnl' => 0,
            'fees_paid' => 0,
            'is_active' => true,
        ]);
    }

    private function createSession(MarketBacktestAccount $account, AdmUser $user): MarketBacktestSession
    {
        return MarketBacktestSession::create([
            'market_backtest_account_id' => $account->id,
            'adm_user_id' => $user->id,
            'name' => 'Session',
            'symbol' => 'BTCUSDT',
            'status' => 'active',
        ]);
    }

    private function closedPosition(MarketBacktestAccount $account, array $overrides = []): MarketBacktestPosition
    {
        return MarketBacktestPosition::create(array_merge([
            'market_backtest_account_id' => $account->id,
            'symbol' => 'BTCUSDT',
            'side' => 'long',
            'quantity' => 1,
            'entry_price' => 100,
            'margin' => 100,
            'leverage' => 1,
            'entry_fee' => 0,
            'exit_fee' => 0,
            'realized_pnl' => 10,
            'exit_price' => 110,
            'opened_at_time' => 100,
            'closed_at_time' => 200,
            'status' => 'closed',
        ], $overrides));
    }
}
