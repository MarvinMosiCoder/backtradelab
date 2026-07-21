<?php

namespace Tests\Feature;

use Database\Seeders\AdminSidebarMenuses;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AdminMenuVisibilityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated admin menu tests.');
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        Schema::create('adm_admin_menuses', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('type');
            $table->string('slug');
            $table->string('color')->nullable();
            $table->string('icon')->nullable();
            $table->unsignedBigInteger('parent_id')->default(0);
            $table->boolean('is_active')->default(true);
            $table->integer('sorting')->default(0);
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function test_seeder_hides_generators_but_keeps_operational_menus(): void
    {
        (new AdminSidebarMenuses())->run();

        $hidden = DB::table('adm_admin_menuses')
            ->whereIn('name', ['Menu Management', 'Module Generator', 'API Generator'])
            ->pluck('is_active', 'name');
        $visible = DB::table('adm_admin_menuses')
            ->whereIn('name', ['Privileges', 'Announcements', 'Notifications', 'Log User Access', 'Module Activity History', 'System Error Logs'])
            ->pluck('is_active', 'name');

        $this->assertCount(3, $hidden);
        $this->assertTrue($hidden->every(fn ($active) => (int) $active === 0));
        $this->assertCount(6, $visible);
        $this->assertTrue($visible->every(fn ($active) => (int) $active === 1));
    }
}
