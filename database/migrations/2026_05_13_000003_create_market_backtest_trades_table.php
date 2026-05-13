<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $tradeLookupIndex = 'mbt_account_symbol_idx';

        if (Schema::hasTable('market_backtest_trades')) {
            if (!$this->indexExists('market_backtest_trades', $tradeLookupIndex)) {
                Schema::table('market_backtest_trades', function (Blueprint $table) use ($tradeLookupIndex) {
                    $table->index(['market_backtest_account_id', 'symbol'], $tradeLookupIndex);
                });
            }

            return;
        }

        Schema::create('market_backtest_trades', function (Blueprint $table) use ($tradeLookupIndex) {
            $table->id();
            $table->foreignId('market_backtest_account_id')
                ->constrained('market_backtest_accounts')
                ->cascadeOnDelete();
            $table->foreignId('market_backtest_position_id')
                ->nullable()
                ->constrained('market_backtest_positions')
                ->nullOnDelete();
            $table->string('symbol', 32);
            $table->string('side', 8);
            $table->string('action', 16);
            $table->decimal('quantity', 24, 10);
            $table->decimal('price', 24, 8);
            $table->decimal('notional', 24, 8);
            $table->decimal('fee', 24, 8)->default(0);
            $table->decimal('pnl', 24, 8)->nullable();
            $table->unsignedBigInteger('executed_at_time')->nullable();
            $table->timestamps();

            $table->index(['market_backtest_account_id', 'symbol'], $tradeLookupIndex);
        });
    }

    private function indexExists(string $table, string $index): bool
    {
        return !empty(DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$index]));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('market_backtest_trades');
    }
};
