<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('market_backtest_risk_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adm_user_id')->unique()->constrained('adm_users')->cascadeOnDelete();
            $table->string('mode', 16)->default('warning');
            $table->decimal('max_daily_loss', 24, 8)->nullable();
            $table->unsignedSmallInteger('max_trades_per_day')->nullable();
            $table->unsignedSmallInteger('max_concurrent_positions')->nullable();
            $table->unsignedSmallInteger('max_consecutive_losses')->nullable();
            $table->boolean('is_enabled')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_backtest_risk_settings');
    }
};
