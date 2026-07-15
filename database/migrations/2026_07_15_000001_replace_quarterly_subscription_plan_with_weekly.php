<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $now = now();
        $quarterly = DB::table('subscription_plans')->where('code', 'quarterly')->first();

        DB::table('subscription_plans')->updateOrInsert(
            ['code' => 'weekly'],
            [
                'name' => 'Weekly',
                'duration_days' => 7,
                'price' => null,
                'currency' => 'PHP',
                'description' => 'One week of flexible access',
                'is_featured' => false,
                'is_active' => true,
                'sort_order' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        DB::table('subscription_plans')->where('code', 'monthly')->update([
            'description' => 'Best for consistent practice',
            'is_featured' => true,
            'sort_order' => 2,
            'updated_at' => $now,
        ]);
        DB::table('subscription_plans')->where('code', 'yearly')->update(['sort_order' => 3, 'updated_at' => $now]);

        if ($quarterly) {
            DB::table('subscription_plans')->where('code', 'quarterly')->update([
                'is_active' => false,
                'is_featured' => false,
                'sort_order' => 99,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        $now = now();
        DB::table('subscription_plans')->where('code', 'weekly')->delete();
        DB::table('subscription_plans')->updateOrInsert(
            ['code' => 'quarterly'],
            [
                'name' => 'Quarterly',
                'duration_days' => 90,
                'price' => null,
                'currency' => 'PHP',
                'description' => 'Best for consistency',
                'is_featured' => true,
                'is_active' => true,
                'sort_order' => 2,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );
        DB::table('subscription_plans')->where('code', 'monthly')->update([
            'description' => 'Flexible access',
            'is_featured' => false,
            'sort_order' => 1,
            'updated_at' => $now,
        ]);
    }
};
