<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('market_backtest_snapshots')) {
            return;
        }

        Schema::create('market_backtest_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('market_backtest_account_id')
                ->constrained('market_backtest_accounts')
                ->cascadeOnDelete();
            $table->foreignId('market_backtest_session_id')
                ->nullable()
                ->constrained('market_backtest_sessions')
                ->nullOnDelete();
            $table->foreignId('market_backtest_position_id')
                ->constrained('market_backtest_positions')
                ->cascadeOnDelete();
            $table->string('type', 16);
            $table->string('path');
            $table->string('url');
            $table->unsignedBigInteger('captured_at_time')->nullable();
            $table->timestamps();

            $table->index(['market_backtest_position_id', 'type'], 'mbs_position_type_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_backtest_snapshots');
    }
};
