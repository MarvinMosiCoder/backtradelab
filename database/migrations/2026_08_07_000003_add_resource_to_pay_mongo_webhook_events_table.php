<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pay_mongo_webhook_events', function (Blueprint $table) {
            $table->json('resource')->nullable()->after('resource_id');
        });
    }

    public function down(): void
    {
        Schema::table('pay_mongo_webhook_events', function (Blueprint $table) {
            $table->dropColumn('resource');
        });
    }
};
