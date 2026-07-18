<?php

namespace Tests\Feature;

use App\Models\AdmModels\AdmNotifications;
use App\Models\AdmUser;
use App\Models\MarketPriceAlert;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MarketPriceAlertCheckTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated alert feature tests.');
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        Schema::create('adm_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password')->nullable();
            $table->string('status')->default('ACTIVE');
            $table->rememberToken();
            $table->timestamps();
        });
        Schema::create('market_price_alerts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('adm_user_id');
            $table->string('exchange', 30);
            $table->string('category', 30);
            $table->string('symbol', 40);
            $table->decimal('target_price', 24, 10);
            $table->string('direction', 10);
            $table->decimal('last_price', 24, 10)->nullable();
            $table->string('status')->default('active');
            $table->timestamp('triggered_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
        Schema::create('adm_notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('adm_user_id');
            $table->string('type');
            $table->string('source_type', 50)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('content');
            $table->json('metadata')->nullable();
            $table->string('url')->default('');
            $table->boolean('is_read')->default(false);
            $table->timestamps();
            $table->unique(['source_type', 'source_id']);
        });
    }

    public function test_check_triggers_only_the_authenticated_users_matching_alert_once(): void
    {
        $user = $this->user('trader@example.test');
        $other = $this->user('other@example.test');
        $owned = $this->alert($user, 'above', 100, 95);
        $otherAlert = $this->alert($other, 'above', 100, 95);

        $payload = ['exchange' => 'BINANCE', 'category' => 'SPOT', 'symbol' => 'btcusdt', 'price' => 101];
        $first = $this->actingAs($user)->postJson('/market-price-alerts/check', $payload)
            ->assertOk()
            ->assertJsonCount(1, 'triggered')
            ->assertJsonPath('triggered.0.alert_id', $owned->id);

        $notificationId = $first->json('triggered.0.notification_id');
        $this->assertNotNull($notificationId);
        $this->assertDatabaseHas('market_price_alerts', ['id' => $owned->id, 'status' => 'triggered']);
        $this->assertDatabaseHas('market_price_alerts', ['id' => $otherAlert->id, 'status' => 'active']);
        $this->assertDatabaseHas('adm_notifications', [
            'id' => $notificationId,
            'adm_user_id' => $user->id,
            'source_type' => 'market_price_alert',
            'source_id' => $owned->id,
        ]);

        $this->postJson('/market-price-alerts/check', $payload)
            ->assertOk()
            ->assertJsonCount(0, 'triggered');
        $this->assertSame(1, AdmNotifications::query()->count());
    }

    public function test_check_updates_non_triggering_alert_and_triggers_a_drop(): void
    {
        $user = $this->user('drop@example.test');
        $alert = $this->alert($user, 'below', 90, 100);

        $this->actingAs($user)->postJson('/market-price-alerts/check', [
            'exchange' => 'binance', 'category' => 'spot', 'symbol' => 'BTCUSDT', 'price' => 95,
        ])->assertOk()->assertJsonCount(0, 'triggered');
        $this->assertSame(95.0, (float) $alert->fresh()->last_price);

        $this->postJson('/market-price-alerts/check', [
            'exchange' => 'binance', 'category' => 'spot', 'symbol' => 'BTCUSDT', 'price' => 89,
        ])->assertOk()->assertJsonCount(1, 'triggered');
    }

    public function test_check_validates_the_payload(): void
    {
        $user = $this->user('validation@example.test');

        $this->actingAs($user)->postJson('/market-price-alerts/check', ['price' => 0])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['exchange', 'category', 'symbol', 'price']);
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

    private function alert(AdmUser $user, string $direction, float $target, float $last): MarketPriceAlert
    {
        return MarketPriceAlert::query()->create([
            'adm_user_id' => $user->id,
            'exchange' => 'binance',
            'category' => 'spot',
            'symbol' => 'BTCUSDT',
            'target_price' => $target,
            'direction' => $direction,
            'last_price' => $last,
            'status' => 'active',
        ]);
    }
}
