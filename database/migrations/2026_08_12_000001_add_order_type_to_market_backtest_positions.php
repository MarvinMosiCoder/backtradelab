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

        if (!Schema::hasColumn('market_backtest_positions', 'order_type')) {
            Schema::table('market_backtest_positions', function (Blueprint $table) {
                $table->string('order_type', 16)->nullable()->after('side');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('market_backtest_positions')) {
            return;
        }

        if (Schema::hasColumn('market_backtest_positions', 'order_type')) {
            Schema::table('market_backtest_positions', function (Blueprint $table) {
                $table->dropColumn('order_type');
            });
        }
    }
};
