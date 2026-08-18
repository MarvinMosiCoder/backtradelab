<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('imported_trades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adm_user_id')->constrained('adm_users')->cascadeOnDelete();
            $table->foreignId('imported_trade_batch_id')->constrained('imported_trade_batches')->cascadeOnDelete();
            $table->string('broker', 64)->nullable();
            $table->string('symbol', 32);
            $table->string('side', 8);
            $table->decimal('quantity', 24, 10);
            $table->decimal('entry_price', 24, 8);
            $table->decimal('exit_price', 24, 8)->nullable();
            $table->decimal('fee', 24, 8)->default(0);
            $table->decimal('realized_pnl', 24, 8)->nullable();
            $table->unsignedBigInteger('opened_at_time')->nullable();
            $table->unsignedBigInteger('closed_at_time')->nullable();
            $table->string('source_row_hash', 64);
            $table->json('raw_row')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Dedup backstop: even if the pre-loaded in-memory hash set misses a race,
            // the database rejects a second identical row for the same user.
            $table->unique(['adm_user_id', 'source_row_hash'], 'it_user_row_hash_unique');
            $table->index(['adm_user_id', 'closed_at_time'], 'it_user_closed_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('imported_trades');
    }
};
