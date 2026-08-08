<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_request_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('adm_user_id')->nullable()->constrained('adm_users')->nullOnDelete();
            $table->string('action', 60);
            $table->string('actor', 60)->default('system');
            $table->string('description', 500);
            $table->json('context')->nullable();
            $table->timestamps();

            $table->index(['adm_user_id', 'created_at']);
            $table->index(['action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_activity_logs');
    }
};
