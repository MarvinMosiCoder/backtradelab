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
        $positionLookupIndex = 'mbp_account_symbol_status_idx';

        if (Schema::hasTable('market_backtest_positions')) {
            if (!$this->indexExists('market_backtest_positions', $positionLookupIndex)) {
                Schema::table('market_backtest_positions', function (Blueprint $table) use ($positionLookupIndex) {
                    $table->index(['market_backtest_account_id', 'symbol', 'status'], $positionLookupIndex);
                });
            }

            return;
        }

        Schema::create('market_backtest_positions', function (Blueprint $table) use ($positionLookupIndex) {
            $table->id();
            $table->foreignId('market_backtest_account_id')
                ->constrained('market_backtest_accounts')
                ->cascadeOnDelete();
            $table->string('symbol', 32);
            $table->string('side', 8);
            $table->decimal('quantity', 24, 10);
            $table->decimal('entry_price', 24, 8);
            $table->decimal('margin', 24, 8);
            $table->decimal('entry_fee', 24, 8)->default(0);
            $table->decimal('exit_fee', 24, 8)->default(0);
            $table->decimal('realized_pnl', 24, 8)->default(0);
            $table->decimal('exit_price', 24, 8)->nullable();
            $table->unsignedBigInteger('opened_at_time')->nullable();
            $table->unsignedBigInteger('closed_at_time')->nullable();
            $table->decimal('stop_loss', 24, 8)->nullable();
            $table->decimal('take_profit', 24, 8)->nullable();
            $table->string('status', 16)->default('open');
            $table->timestamps();

            $table->index(['market_backtest_account_id', 'symbol', 'status'], $positionLookupIndex);
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
        Schema::dropIfExists('market_backtest_positions');
    }
};
