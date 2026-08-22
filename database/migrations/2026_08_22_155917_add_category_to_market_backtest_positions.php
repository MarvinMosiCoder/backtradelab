<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('market_backtest_positions')) {
            return;
        }

        if (!Schema::hasColumn('market_backtest_positions', 'category')) {
            Schema::table('market_backtest_positions', function (Blueprint $table) {
                $table->string('category', 32)->nullable()->after('symbol');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('market_backtest_positions')) {
            return;
        }

        if (Schema::hasColumn('market_backtest_positions', 'category')) {
            Schema::table('market_backtest_positions', function (Blueprint $table) {
                $table->dropColumn('category');
            });
        }
    }
};
