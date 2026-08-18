<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_challenge_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adm_user_id')->constrained('adm_users')->cascadeOnDelete();
            $table->foreignId('training_challenge_id')->constrained('training_challenges')->cascadeOnDelete();
            $table->foreignId('market_backtest_account_id')->constrained('market_backtest_accounts')->cascadeOnDelete();
            $table->decimal('starting_balance_snapshot', 24, 8);
            $table->timestamp('started_at');
            // active|completed|failed|abandoned
            $table->string('status', 16)->default('active');
            $table->timestamp('completed_at')->nullable();
            $table->json('result_snapshot')->nullable();
            $table->timestamps();

            $table->index(['adm_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_challenge_attempts');
    }
};
