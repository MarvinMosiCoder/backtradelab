<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('subscription_plans')) {
            Schema::create('subscription_plans', function (Blueprint $table) {
                $table->id();
                $table->string('code')->unique();
                $table->string('name');
                $table->unsignedInteger('duration_days');
                $table->decimal('price', 12, 2)->nullable();
                $table->string('currency', 3)->default('PHP');
                $table->string('description')->nullable();
                $table->boolean('is_featured')->default(false);
                $table->boolean('is_active')->default(true);
                $table->unsignedSmallInteger('sort_order')->default(0);
                $table->timestamps();
            });
        }

        $now = now();
        DB::table('subscription_plans')->insertOrIgnore([
            ['code' => 'monthly', 'name' => 'Monthly', 'duration_days' => 30, 'description' => 'Flexible access', 'is_featured' => false, 'sort_order' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'quarterly', 'name' => 'Quarterly', 'duration_days' => 90, 'description' => 'Best for consistency', 'is_featured' => true, 'sort_order' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'yearly', 'name' => 'Yearly', 'duration_days' => 365, 'description' => 'Long-term practice', 'is_featured' => false, 'sort_order' => 3, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
