<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('imported_trade_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adm_user_id')->constrained('adm_users')->cascadeOnDelete();
            $table->string('broker', 64)->nullable();
            $table->string('original_filename')->nullable();
            $table->string('file_path')->nullable();
            $table->json('column_mapping')->nullable();
            $table->string('source_timezone', 64)->nullable();
            // mapping|pending|processing|ready|failed
            $table->string('status', 16)->default('mapping');
            $table->unsignedInteger('total_rows')->nullable();
            $table->unsignedInteger('imported_rows')->default(0);
            $table->unsignedInteger('duplicate_rows')->default(0);
            $table->unsignedInteger('error_rows')->default(0);
            $table->text('error')->nullable();
            $table->json('row_errors')->nullable();
            $table->timestamps();

            $table->index(['adm_user_id', 'created_at'], 'itb_user_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('imported_trade_batches');
    }
};
