<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('market_backtest_exports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adm_user_id')->constrained('adm_users')->cascadeOnDelete();
            $table->foreignId('market_backtest_account_id')->constrained('market_backtest_accounts')->cascadeOnDelete();
            $table->string('format', 8);
            $table->string('symbol', 32)->nullable();
            $table->unsignedBigInteger('session_id')->nullable();
            $table->unsignedInteger('row_limit');
            $table->string('status', 16)->default('pending');
            $table->string('file_path')->nullable();
            $table->string('filename')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index(['adm_user_id', 'created_at'], 'mbe_user_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_backtest_exports');
    }
};
