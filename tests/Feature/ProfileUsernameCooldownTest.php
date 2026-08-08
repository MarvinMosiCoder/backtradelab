<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\AdmUser;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ProfileUsernameCooldownTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated profile tests.');
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');
        $this->withoutMiddleware(HandleInertiaRequests::class);

        Schema::create('adm_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamp('name_changed_at')->nullable();
            $table->string('username', 60)->nullable()->unique();
            $table->timestamp('username_changed_at')->nullable();
            $table->string('email')->unique();
            $table->string('password')->nullable();
            $table->string('status')->default('ACTIVE');
            $table->string('timezone')->nullable();
            $table->string('trading_experience')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_first_username_change_succeeds_and_starts_the_cooldown(): void
    {
        $user = $this->user(['username' => null]);

        $this->actingAs($user)->putJson('/profile/details', [
            'name' => $user->name,
            'username' => 'trader_one',
        ])->assertOk();

        $fresh = $user->fresh();
        $this->assertSame('trader_one', $fresh->username);
        $this->assertNotNull($fresh->username_changed_at);
    }

    public function test_changing_username_again_within_the_cooldown_is_rejected(): void
    {
        $user = $this->user(['username' => 'trader_one', 'username_changed_at' => now()->subDays(5)]);

        $response = $this->actingAs($user)->putJson('/profile/details', [
            'name' => $user->name,
            'username' => 'trader_two',
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('You can change your username again on', $response->json('message'));
        $this->assertSame('trader_one', $user->fresh()->username);
    }

    public function test_changing_username_after_the_cooldown_elapses_succeeds(): void
    {
        $user = $this->user(['username' => 'trader_one', 'username_changed_at' => now()->subDays(31)]);

        $this->actingAs($user)->putJson('/profile/details', [
            'name' => $user->name,
            'username' => 'trader_two',
        ])->assertOk();

        $this->assertSame('trader_two', $user->fresh()->username);
    }

    public function test_updating_username_without_changing_name_does_not_touch_the_name_lock(): void
    {
        $user = $this->user(['username' => 'trader_one', 'username_changed_at' => now()->subDays(5)]);

        $this->actingAs($user)->putJson('/profile/details', [
            'name' => $user->name,
            'username' => 'trader_one',
            'timezone' => 'UTC',
        ])->assertOk();

        $this->assertNull($user->fresh()->name_changed_at);
    }

    public function test_first_name_change_succeeds_and_permanently_locks_it(): void
    {
        $user = $this->user(['name' => 'Original Name']);

        $this->actingAs($user)->putJson('/profile/details', [
            'name' => 'Changed Name',
        ])->assertOk();

        $fresh = $user->fresh();
        $this->assertSame('Changed Name', $fresh->name);
        $this->assertNotNull($fresh->name_changed_at);
    }

    public function test_a_second_name_change_is_rejected_even_long_after_the_first(): void
    {
        $user = $this->user(['name' => 'Already Changed', 'name_changed_at' => now()->subYear()]);

        $response = $this->actingAs($user)->putJson('/profile/details', [
            'name' => 'Trying Again',
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('already been changed once', $response->json('message'));
        $this->assertSame('Already Changed', $user->fresh()->name);
    }

    public function test_resubmitting_the_same_name_after_it_was_already_changed_is_not_blocked(): void
    {
        $user = $this->user(['name' => 'Already Changed', 'name_changed_at' => now()->subYear()]);

        $this->actingAs($user)->putJson('/profile/details', [
            'name' => 'Already Changed',
            'timezone' => 'UTC',
        ])->assertOk();
    }

    private function user(array $overrides = []): AdmUser
    {
        $id = DB::table('adm_users')->insertGetId(array_merge([
            'name' => 'Test User', 'email' => 'user'.uniqid().'@example.test', 'status' => 'ACTIVE',
            'created_at' => now(), 'updated_at' => now(),
        ], $overrides));
        return AdmUser::query()->findOrFail($id);
    }
}
