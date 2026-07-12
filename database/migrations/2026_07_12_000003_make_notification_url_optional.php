<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement('ALTER TABLE adm_notifications MODIFY url VARCHAR(255) NULL DEFAULT NULL');
    }

    public function down(): void
    {
        DB::table('adm_notifications')->whereNull('url')->update(['url' => '']);
        DB::statement("ALTER TABLE adm_notifications MODIFY url VARCHAR(255) NOT NULL DEFAULT ''");
    }
};
