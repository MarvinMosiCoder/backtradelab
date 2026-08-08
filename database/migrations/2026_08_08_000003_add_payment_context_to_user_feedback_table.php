<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_feedback', function (Blueprint $table) {
            $table->foreignId('subscription_request_id')->nullable()->after('adm_user_id')->constrained()->nullOnDelete();
            $table->string('payment_reason_code', 40)->nullable()->after('category');
        });
    }

    public function down(): void
    {
        Schema::table('user_feedback', function (Blueprint $table) {
            $table->dropConstrainedForeignId('subscription_request_id');
            $table->dropColumn('payment_reason_code');
        });
    }
};
