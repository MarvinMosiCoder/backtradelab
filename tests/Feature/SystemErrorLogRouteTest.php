<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\AdmUser;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SystemErrorLogRouteTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated admin route tests.');
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

        Schema::create('system_error_logs', function (Blueprint $table) {
            $table->id();
            $table->string('area', 40)->default('general');
            $table->string('level', 20)->default('error');
            $table->string('exception_class');
            $table->text('message');
            $table->string('file')->nullable();
            $table->unsignedInteger('line')->nullable();
            $table->longText('trace')->nullable();
            $table->string('url')->nullable();
            $table->string('method', 10)->nullable();
            $table->string('ip', 45)->nullable();
            $table->unsignedBigInteger('adm_user_id')->nullable();
            $table->json('context')->nullable();
            $table->unsignedInteger('occurrences')->default(1);
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function test_non_superadmin_cannot_list_error_logs(): void
    {
        $trader = $this->user('trader@example.test');

        $this->actingAs($trader)->withSession(['admin_is_superadmin' => false])
            ->getJson('/admin/system-errors/items')->assertForbidden();
    }

    public function test_superadmin_can_list_and_resolve_an_error_log(): void
    {
        $admin = $this->user('admin@example.test');
        $logId = DB::table('system_error_logs')->insertGetId([
            'area' => 'payments', 'exception_class' => 'RuntimeException', 'message' => 'Refund failed.',
            'occurrences' => 1, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->actingAs($admin)->withSession(['admin_is_superadmin' => true, 'admin_privileges' => 1])
            ->getJson('/admin/system-errors/items')
            ->assertOk()
            ->assertJsonPath('data.0.exceptionClass', 'RuntimeException');

        $this->actingAs($admin)->withSession(['admin_is_superadmin' => true, 'admin_privileges' => 1])
            ->postJson("/admin/system-errors/{$logId}/resolve")
            ->assertOk()
            ->assertJsonPath('log.resolvedAt', fn ($value) => $value !== null);
    }

    private function user(string $email): AdmUser
    {
        $id = DB::table('adm_users')->insertGetId([
            'name' => 'Test', 'email' => $email, 'status' => 'ACTIVE',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return AdmUser::query()->findOrFail($id);
    }
}
