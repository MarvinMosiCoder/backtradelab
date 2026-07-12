<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('adm_users', function (Blueprint $table) {
            $table->timestamp('chart_tour_completed_at')->nullable()->after('replay_access_ends_at');
        });

        Schema::create('subscription_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('adm_user_id')->constrained('adm_users')->cascadeOnDelete();
            $table->text('message')->nullable();
            $table->string('attachment_path')->nullable();
            $table->string('attachment_name')->nullable();
            $table->string('attachment_mime')->nullable();
            $table->unsignedBigInteger('attachment_size')->nullable();
            $table->timestamps();
            $table->index(['subscription_request_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_messages');
        Schema::table('adm_users', fn (Blueprint $table) => $table->dropColumn('chart_tour_completed_at'));
    }
};
