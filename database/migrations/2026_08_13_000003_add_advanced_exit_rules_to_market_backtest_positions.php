<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('market_backtest_positions', function (Blueprint $table) {
            $table->decimal('original_entry_fee', 24, 8)->nullable()->after('entry_fee');
            $table->decimal('original_quantity', 24, 10)->nullable()->after('quantity');
            $table->decimal('original_margin', 24, 8)->nullable()->after('margin');
            $table->decimal('liquidation_price', 24, 8)->nullable()->after('take_profit');
            $table->decimal('trailing_stop_percent', 8, 4)->nullable()->after('liquidation_price');
            $table->decimal('break_even_trigger_percent', 8, 4)->nullable()->after('trailing_stop_percent');
            $table->decimal('partial_take_profit_percent', 8, 4)->nullable()->after('break_even_trigger_percent');
            $table->decimal('favorable_price', 24, 8)->nullable()->after('partial_take_profit_percent');
            $table->boolean('partial_take_profit_executed')->default(false)->after('favorable_price');
            $table->string('close_reason', 32)->nullable()->after('status');
        });

        DB::table('market_backtest_positions')->whereNull('original_entry_fee')->update([
            'original_entry_fee' => DB::raw('entry_fee'),
            'original_quantity' => DB::raw('quantity'),
            'original_margin' => DB::raw('margin'),
        ]);
    }

    public function down(): void
    {
        Schema::table('market_backtest_positions', function (Blueprint $table) {
            $table->dropColumn(['original_entry_fee', 'original_quantity', 'original_margin', 'liquidation_price', 'trailing_stop_percent', 'break_even_trigger_percent', 'partial_take_profit_percent', 'favorable_price', 'partial_take_profit_executed', 'close_reason']);
        });
    }
};
