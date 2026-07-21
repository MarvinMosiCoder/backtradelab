<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const MENUS = ['Menu Management', 'Module Generator', 'API Generator'];

    public function up(): void
    {
        if (Schema::hasTable('adm_admin_menuses')) {
            DB::table('adm_admin_menuses')->whereIn('name', self::MENUS)->update(['is_active' => 0]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('adm_admin_menuses')) {
            DB::table('adm_admin_menuses')->whereIn('name', self::MENUS)->update(['is_active' => 1]);
        }
    }
};
