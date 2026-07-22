<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const DEFAULT_ROLE = 'Users';

    public function up(): void
    {
        if (!Schema::hasColumn('adm_privileges', 'is_admin')) {
            Schema::table('adm_privileges', function (Blueprint $table) {
                $table->boolean('is_admin')->default(false)->after('is_superadmin');
            });
        }

        DB::table('adm_privileges')->whereNull('is_superadmin')->update(['is_superadmin' => false]);
        DB::table('adm_privileges')->where('is_superadmin', true)->update(['is_admin' => true]);

        $defaultRoleId = DB::table('adm_privileges')->where('name', self::DEFAULT_ROLE)->value('id');
        if (!$defaultRoleId) {
            $defaultRoleId = DB::table('adm_privileges')->insertGetId([
                'name' => self::DEFAULT_ROLE,
                'is_admin' => false,
                'is_superadmin' => false,
                'theme_color' => 'skin-blue',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            DB::table('adm_privileges')->where('id', $defaultRoleId)->update([
                'is_admin' => false,
                'is_superadmin' => false,
            ]);
        }

        DB::table('adm_users')
            ->whereNull('id_adm_privileges')
            ->orWhereNotExists(function ($query) {
                $query->selectRaw('1')->from('adm_privileges')
                    ->whereColumn('adm_privileges.id', 'adm_users.id_adm_privileges');
            })
            ->update(['id_adm_privileges' => $defaultRoleId]);

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE adm_privileges MODIFY is_superadmin TINYINT(1) NOT NULL DEFAULT 0');
            DB::statement('ALTER TABLE adm_privileges MODIFY is_admin TINYINT(1) NOT NULL DEFAULT 0');
            DB::statement('ALTER TABLE adm_users MODIFY id_adm_privileges INT UNSIGNED NOT NULL');
            Schema::table('adm_users', function (Blueprint $table) {
                $table->foreign('id_adm_privileges', 'adm_users_privilege_foreign')
                    ->references('id')->on('adm_privileges')->restrictOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            Schema::table('adm_users', function (Blueprint $table) {
                $table->dropForeign('adm_users_privilege_foreign');
            });
            DB::statement('ALTER TABLE adm_users MODIFY id_adm_privileges INT NULL');
            DB::statement('ALTER TABLE adm_privileges MODIFY is_superadmin INT NULL');
        }

        if (Schema::hasColumn('adm_privileges', 'is_admin')) {
            Schema::table('adm_privileges', fn (Blueprint $table) => $table->dropColumn('is_admin'));
        }
    }
};
