<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\AdmModels\AdmUserProfiles;
use App\Models\AdmUser;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ProfileAvatarSelectionTest extends TestCase
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
            $table->string('email')->unique();
            $table->string('status')->default('ACTIVE');
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('adm_user_profiles', function (Blueprint $table) {
            $table->id();
            $table->integer('adm_user_id')->nullable();
            $table->string('file_name')->nullable();
            $table->string('ext')->nullable();
            $table->integer('created_by')->nullable();
            $table->date('archived')->nullable();
            $table->timestamps();
        });
    }

    public function test_selecting_a_valid_avatar_creates_an_active_row(): void
    {
        $user = $this->user();

        $this->actingAs($user)->withSession(['admin_id' => $user->id])->postJson('/profile/avatar', ['avatar_key' => 'bull'])
            ->assertOk()
            ->assertJsonPath('file_name', 'avatar:bull');

        $active = AdmUserProfiles::where('adm_user_id', $user->id)->whereNull('archived')->first();
        $this->assertSame('avatar:bull', $active->file_name);
    }

    public function test_selecting_an_invalid_avatar_key_is_rejected(): void
    {
        $user = $this->user();

        $this->actingAs($user)->withSession(['admin_id' => $user->id])->postJson('/profile/avatar', ['avatar_key' => 'dragon'])
            ->assertStatus(422);

        $this->assertSame(0, AdmUserProfiles::where('adm_user_id', $user->id)->count());
    }

    public function test_selecting_an_avatar_archives_the_previously_active_uploaded_photo(): void
    {
        $user = $this->user();
        $uploaded = AdmUserProfiles::create([
            'adm_user_id' => $user->id, 'file_name' => $user->id.'-1.jpg', 'ext' => 'jpg', 'created_by' => $user->id,
        ]);

        $this->actingAs($user)->withSession(['admin_id' => $user->id])->postJson('/profile/avatar', ['avatar_key' => 'whale'])->assertOk();

        $this->assertNotNull($uploaded->fresh()->archived);
        $active = AdmUserProfiles::where('adm_user_id', $user->id)->whereNull('archived')->first();
        $this->assertSame('avatar:whale', $active->file_name);
    }

    public function test_the_uploads_gallery_excludes_avatar_rows(): void
    {
        $user = $this->user();
        AdmUserProfiles::create(['adm_user_id' => $user->id, 'file_name' => 'avatar:fox', 'created_by' => $user->id]);
        AdmUserProfiles::create(['adm_user_id' => $user->id, 'file_name' => $user->id.'-2.jpg', 'ext' => 'jpg', 'created_by' => $user->id]);

        $response = $this->actingAs($user)->withSession(['admin_id' => $user->id])->getJson('/profiles')->assertOk();

        $fileNames = collect($response->json())->pluck('file_name');
        $this->assertTrue($fileNames->contains($user->id.'-2.jpg'));
        $this->assertFalse($fileNames->contains('avatar:fox'));
    }

    private function user(): AdmUser
    {
        $id = DB::table('adm_users')->insertGetId([
            'name' => 'Test User', 'email' => 'user'.uniqid().'@example.test', 'status' => 'ACTIVE',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return AdmUser::query()->findOrFail($id);
    }
}
