<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('adm_menuses')) return;

        DB::table('adm_menuses')->where('name', 'Dashboard')->update(['sorting' => 1]);
        DB::table('adm_menuses')->where('name', 'Market')->update(['sorting' => 2]);
        DB::table('adm_menuses')->where('name', 'PNL')->update(['sorting' => 4]);

        DB::table('adm_menuses')->updateOrInsert(
            ['name' => 'Workspace Chart'],
            [
                'type' => 'Route',
                'path' => 'admin.workspace',
                'slug' => 'admin/workspace',
                'color' => null,
                'icon' => 'fa fa-chart-line',
                'parent_id' => 0,
                'is_active' => 1,
                'is_dashboard' => 1,
                'id_adm_privileges' => 1,
                'sorting' => 3,
                'updated_at' => now(),
            ]
        );

        if (!Schema::hasTable('adm_menus_privileges') || !Schema::hasTable('adm_privileges')) return;

        $menuId = DB::table('adm_menuses')->where('name', 'Workspace Chart')->value('id');
        foreach (DB::table('adm_privileges')->where('is_superadmin', 1)->pluck('id') as $privilegeId) {
            DB::table('adm_menus_privileges')->updateOrInsert([
                'id_adm_menus' => $menuId,
                'id_adm_privileges' => $privilegeId,
            ]);
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('adm_menuses')) return;
        $menuId = DB::table('adm_menuses')->where('name', 'Workspace Chart')->value('id');
        if ($menuId && Schema::hasTable('adm_menus_privileges')) {
            DB::table('adm_menus_privileges')->where('id_adm_menus', $menuId)->delete();
        }
        DB::table('adm_menuses')->where('id', $menuId)->delete();
    }
};
