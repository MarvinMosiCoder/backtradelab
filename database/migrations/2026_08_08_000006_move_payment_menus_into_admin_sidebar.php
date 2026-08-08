<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('adm_admin_menuses')) return;

        $now = now();
        $nextSorting = 1 + (int) DB::table('adm_admin_menuses')->where('parent_id', 0)->max('sorting');

        $paymentsParentId = DB::table('adm_admin_menuses')->insertGetId([
            'name' => 'Payments', 'type' => 'URL', 'slug' => 'payments_group', 'icon' => 'fa fa-credit-card',
            'parent_id' => 0, 'is_active' => 1, 'sorting' => $nextSorting,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        // The child page is named "Transactions", not "Payments" — the seeder equivalent of this
        // migration (database/seeders/AdminSidebarMenuses.php) matches rows by `name` via
        // updateOrInsert(), so reusing the parent dropdown's own label here would collide with it and
        // corrupt both rows on re-seed. This migration itself uses plain insert(), so it isn't
        // vulnerable to that specific bug, but keeps the same name for consistency with the seeder.
        DB::table('adm_admin_menuses')->insert([
            ['name' => 'Transactions', 'type' => 'Route', 'slug' => 'admin/subscriptions', 'icon' => 'fa fa-credit-card', 'parent_id' => $paymentsParentId, 'is_active' => 1, 'sorting' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Pricing', 'type' => 'Route', 'slug' => 'admin/subscription-plans', 'icon' => 'fa fa-tags', 'parent_id' => $paymentsParentId, 'is_active' => 1, 'sorting' => 2, 'created_at' => $now, 'updated_at' => $now],
        ]);

        // The seeded "Module Activity History" link has never had a real page behind it — repoint and
        // rename it to the real Payment Activity viewer built this session, as the third Payments child.
        DB::table('adm_admin_menuses')->where('name', 'Module Activity History')->update([
            'name' => 'Payment Activity', 'type' => 'Route', 'slug' => 'admin/payment-activity',
            'parent_id' => $paymentsParentId, 'sorting' => 3, 'updated_at' => $now,
        ]);

        // Same story for "System Error Logs" — repoint it at the real error log viewer, stays top-level.
        DB::table('adm_admin_menuses')->where('name', 'System Error Logs')->update([
            'slug' => 'admin/system-errors', 'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        if (!Schema::hasTable('adm_admin_menuses')) return;

        $now = now();
        DB::table('adm_admin_menuses')->where('name', 'System Error Logs')->update(['slug' => 'system_error_logs', 'updated_at' => $now]);
        DB::table('adm_admin_menuses')->where('name', 'Payment Activity')->where('type', 'Route')->update([
            'name' => 'Module Activity History', 'slug' => 'module_activity_history', 'parent_id' => 0, 'sorting' => 8, 'updated_at' => $now,
        ]);
        DB::table('adm_admin_menuses')->where('name', 'Transactions')->where('type', 'Route')->delete();
        DB::table('adm_admin_menuses')->where('name', 'Pricing')->where('type', 'Route')->delete();
        DB::table('adm_admin_menuses')->where('name', 'Payments')->where('type', 'URL')->delete();
    }
};
