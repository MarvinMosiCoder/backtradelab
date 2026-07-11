<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('market_backtest_positions')) {
            return;
        }

        Schema::table('market_backtest_positions', function (Blueprint $table) {
            if (!$this->indexExists('market_backtest_positions', 'mbp_account_status_closed_idx')) {
                $table->index(
                    ['market_backtest_account_id', 'status', 'closed_at_time'],
                    'mbp_account_status_closed_idx'
                );
            }

            if (
                Schema::hasColumn('market_backtest_positions', 'market_backtest_session_id')
                && !$this->indexExists('market_backtest_positions', 'mbp_account_session_status_closed_idx')
            ) {
                $table->index(
                    ['market_backtest_account_id', 'market_backtest_session_id', 'status', 'closed_at_time'],
                    'mbp_account_session_status_closed_idx'
                );
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('market_backtest_positions')) {
            return;
        }

        Schema::table('market_backtest_positions', function (Blueprint $table) {
            if ($this->indexExists('market_backtest_positions', 'mbp_account_session_status_closed_idx')) {
                $table->dropIndex('mbp_account_session_status_closed_idx');
            }

            if ($this->indexExists('market_backtest_positions', 'mbp_account_status_closed_idx')) {
                $table->dropIndex('mbp_account_status_closed_idx');
            }
        });
    }

    private function indexExists(string $table, string $index): bool
    {
        return !empty(DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$index]));
    }
};
