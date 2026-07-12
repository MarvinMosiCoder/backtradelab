<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('subscription_requests', function (Blueprint $table) {
            $table->uuid('submission_token')->nullable()->unique()->after('status');
        });
    }
    public function down(): void
    {
        Schema::table('subscription_requests', fn (Blueprint $table) => $table->dropUnique(['submission_token']));
        Schema::table('subscription_requests', fn (Blueprint $table) => $table->dropColumn('submission_token'));
    }
};
