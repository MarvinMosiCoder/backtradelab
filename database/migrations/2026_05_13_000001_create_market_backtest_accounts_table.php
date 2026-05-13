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
        $activeAccountIndex = 'mba_user_active_idx';

        if (Schema::hasTable('market_backtest_accounts')) {
            if (!$this->indexExists('market_backtest_accounts', $activeAccountIndex)) {
                Schema::table('market_backtest_accounts', function (Blueprint $table) use ($activeAccountIndex) {
                    $table->index(['adm_user_id', 'is_active'], $activeAccountIndex);
                });
            }

            return;
        }

        Schema::create('market_backtest_accounts', function (Blueprint $table) use ($activeAccountIndex) {
            $table->id();
            $table->foreignId('adm_user_id')->constrained('adm_users')->cascadeOnDelete();
            $table->string('name', 80)->default('Demo Account');
            $table->string('quote_currency', 16)->default('USDT');
            $table->decimal('starting_balance', 24, 8)->default(10000);
            $table->decimal('cash_balance', 24, 8)->default(10000);
            $table->decimal('realized_pnl', 24, 8)->default(0);
            $table->decimal('fees_paid', 24, 8)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['adm_user_id', 'is_active'], $activeAccountIndex);
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
        Schema::dropIfExists('market_backtest_accounts');
    }
};
