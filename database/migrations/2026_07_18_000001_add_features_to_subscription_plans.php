<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('subscription_plans', 'features')) {
            Schema::table('subscription_plans', function (Blueprint $table) {
                $table->json('features')->nullable()->after('description');
            });
        }

        $features = json_encode([
            'Unlimited market replay',
            'Paper trading sessions',
            'Drawing tools and indicators',
            'Trade journal and reports',
            'Snapshots and saved progress',
        ]);

        DB::table('subscription_plans')->whereNull('features')->update(['features' => $features]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('subscription_plans', 'features')) {
            Schema::table('subscription_plans', fn (Blueprint $table) => $table->dropColumn('features'));
        }
    }
};
