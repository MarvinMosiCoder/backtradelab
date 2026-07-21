<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_feedback_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_feedback_id')->constrained('user_feedback')->cascadeOnDelete();
            $table->foreignId('adm_user_id')->constrained('adm_users')->cascadeOnDelete();
            $table->text('message');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['user_feedback_id', 'created_at'], 'feedback_messages_ticket_created_idx');
            $table->index(['user_feedback_id', 'read_at'], 'feedback_messages_ticket_read_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_feedback_messages');
    }
};
