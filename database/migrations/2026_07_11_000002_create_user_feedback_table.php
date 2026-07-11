<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adm_user_id')->constrained('adm_users')->cascadeOnDelete();
            $table->string('category', 32);
            $table->string('title', 160);
            $table->text('description');
            $table->string('page_url', 500)->nullable();
            $table->string('status', 24)->default('submitted');
            $table->string('priority', 16)->default('normal');
            $table->text('admin_response')->nullable();
            $table->foreignId('responded_by')->nullable()->constrained('adm_users')->nullOnDelete();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->index(['adm_user_id', 'created_at'], 'user_feedback_user_created_idx');
            $table->index(['status', 'priority', 'created_at'], 'user_feedback_admin_queue_idx');
            $table->index(['category', 'status'], 'user_feedback_category_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_feedback');
    }
};
