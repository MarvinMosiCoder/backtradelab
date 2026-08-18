<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('market_backtest_share_links')) {
            return;
        }

        Schema::create('market_backtest_share_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adm_user_id')->constrained('adm_users')->cascadeOnDelete();
            $table->foreignId('market_backtest_account_id')->constrained('market_backtest_accounts')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->string('label', 120)->nullable();
            // session | date_range | trade_ids
            $table->string('scope_type', 16);
            $table->unsignedBigInteger('session_id')->nullable();
            $table->unsignedBigInteger('range_start_time')->nullable();
            $table->unsignedBigInteger('range_end_time')->nullable();
            $table->json('trade_ids')->nullable();
            $table->boolean('include_journal')->default(true);
            $table->boolean('include_snapshots')->default(true);
            $table->boolean('include_analytics')->default(true);
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('last_viewed_at')->nullable();
            $table->unsignedInteger('view_count')->default(0);
            $table->timestamps();

            $table->index(['adm_user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('market_backtest_share_links');
    }
};
