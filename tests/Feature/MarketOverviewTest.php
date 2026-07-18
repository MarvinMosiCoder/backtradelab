<?php

namespace Tests\Feature;

use App\Models\AdmUser;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MarketOverviewTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated market overview feature tests.');
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
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->string('title')->nullable();
            $table->text('message')->nullable();
            $table->string('status')->default('ACTIVE');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
        });
        Schema::create('announcement_user', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('announcement_id');
            $table->unsignedBigInteger('adm_user_id');
            $table->timestamps();
            $table->unique(['announcement_id', 'adm_user_id']);
        });
    }

    public function test_overview_returns_featured_markets_and_latest_active_announcements(): void
    {
        $user = $this->user();
        $ids = [];
        foreach (range(1, 5) as $number) {
            $ids[] = DB::table('announcements')->insertGetId([
                'title' => "Update {$number}",
                'message' => $number === 5 ? '<p>Safe <strong>market</strong> update.</p><script>bad()</script>' : "Message {$number}",
                'status' => 'ACTIVE',
                'created_at' => now()->subMinutes(5 - $number),
                'updated_at' => now()->subMinutes(5 - $number),
            ]);
        }
        DB::table('announcements')->insert([
            'title' => 'Inactive update', 'message' => 'Hidden', 'status' => 'INACTIVE',
            'created_at' => now()->addMinute(), 'updated_at' => now()->addMinute(),
        ]);
        DB::table('announcement_user')->insert([
            'announcement_id' => $ids[4], 'adm_user_id' => $user->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $response = $this->actingAs($user)->getJson('/market-overview')
            ->assertOk()
            ->assertJsonCount(3, 'featured_markets')
            ->assertJsonCount(4, 'announcements')
            ->assertJsonPath('featured_markets.0.symbol', 'BTCUSDT')
            ->assertJsonPath('announcements.0.title', 'Update 5')
            ->assertJsonPath('announcements.0.excerpt', 'Safe market update.')
            ->assertJsonPath('announcements.0.is_read', true);

        $this->assertNotEmpty($response->json('tips'));
        $this->assertNotEmpty($response->json('generated_at'));
        $this->assertNotContains('Inactive update', collect($response->json('announcements'))->pluck('title')->all());
    }

    public function test_marking_an_announcement_read_is_idempotent(): void
    {
        $user = $this->user();
        $announcementId = DB::table('announcements')->insertGetId([
            'title' => 'Release', 'message' => 'Details', 'status' => 'ACTIVE',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->actingAs($user)->postJson('/read-announcement', ['announcement_id' => $announcementId])->assertOk();
        $this->postJson('/read-announcement', ['announcement_id' => $announcementId])->assertOk();

        $this->assertSame(1, DB::table('announcement_user')
            ->where('announcement_id', $announcementId)
            ->where('adm_user_id', $user->id)
            ->count());
    }

    public function test_overview_requires_authentication(): void
    {
        $this->getJson('/market-overview')->assertUnauthorized();
    }

    private function user(): AdmUser
    {
        $id = DB::table('adm_users')->insertGetId([
            'name' => 'Market Trader',
            'email' => 'market@example.test',
            'password' => bcrypt('password'),
            'status' => 'ACTIVE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return AdmUser::query()->findOrFail($id);
    }
}
