<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $sessionActiveIndex = 'mbs_user_status_idx';

        if (!Schema::hasTable('market_backtest_sessions')) {
            Schema::create('market_backtest_sessions', function (Blueprint $table) use ($sessionActiveIndex) {
                $table->id();
                $table->foreignId('market_backtest_account_id')
                    ->constrained('market_backtest_accounts')
                    ->cascadeOnDelete();
                $table->foreignId('adm_user_id')->constrained('adm_users')->cascadeOnDelete();
                $table->string('name', 120);
                $table->string('symbol', 32);
                $table->string('exchange', 32)->default('bybit');
                $table->string('market_category', 32)->default('spot');
                $table->string('timeframe', 16)->default('15m');
                $table->decimal('starting_balance', 24, 8)->default(10000);
                $table->unsignedBigInteger('started_at_time')->nullable();
                $table->unsignedBigInteger('ended_at_time')->nullable();
                $table->string('status', 16)->default('active');
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['adm_user_id', 'status'], $sessionActiveIndex);
            });
        } elseif (!$this->indexExists('market_backtest_sessions', $sessionActiveIndex)) {
            Schema::table('market_backtest_sessions', function (Blueprint $table) use ($sessionActiveIndex) {
                $table->index(['adm_user_id', 'status'], $sessionActiveIndex);
            });
        }

        if (Schema::hasTable('market_backtest_positions') && !Schema::hasColumn('market_backtest_positions', 'market_backtest_session_id')) {
            Schema::table('market_backtest_positions', function (Blueprint $table) {
                $table->foreignId('market_backtest_session_id')
                    ->nullable()
                    ->after('market_backtest_account_id')
                    ->constrained('market_backtest_sessions')
                    ->nullOnDelete();
                $table->index(['market_backtest_session_id', 'status'], 'mbp_session_status_idx');
            });
        }

        if (Schema::hasTable('market_backtest_trades') && !Schema::hasColumn('market_backtest_trades', 'market_backtest_session_id')) {
            Schema::table('market_backtest_trades', function (Blueprint $table) {
                $table->foreignId('market_backtest_session_id')
                    ->nullable()
                    ->after('market_backtest_account_id')
                    ->constrained('market_backtest_sessions')
                    ->nullOnDelete();
                $table->index(['market_backtest_session_id', 'symbol'], 'mbt_session_symbol_idx');
            });
        }
    }

    private function indexExists(string $table, string $index): bool
    {
        return !empty(DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$index]));
    }

    public function down(): void
    {
        if (Schema::hasTable('market_backtest_trades') && Schema::hasColumn('market_backtest_trades', 'market_backtest_session_id')) {
            Schema::table('market_backtest_trades', function (Blueprint $table) {
                $table->dropConstrainedForeignId('market_backtest_session_id');
            });
        }

        if (Schema::hasTable('market_backtest_positions') && Schema::hasColumn('market_backtest_positions', 'market_backtest_session_id')) {
            Schema::table('market_backtest_positions', function (Blueprint $table) {
                $table->dropConstrainedForeignId('market_backtest_session_id');
            });
        }

        Schema::dropIfExists('market_backtest_sessions');
    }
};
