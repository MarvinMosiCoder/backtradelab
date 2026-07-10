<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('market_replay_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adm_user_id')->constrained('adm_users')->cascadeOnDelete();
            $table->string('symbol', 30);
            $table->string('exchange', 30);
            $table->string('category', 30);
            $table->string('timeframe', 10);
            $table->unsignedBigInteger('replay_time');
            $table->decimal('selected_price', 28, 12)->nullable();
            $table->timestamps();
            $table->unique(['adm_user_id', 'exchange', 'category', 'symbol'], 'market_replay_progress_market_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_replay_progress');
    }
};
