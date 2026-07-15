<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('adm_users', function (Blueprint $table) {
            $table->timestamp('deactivated_at')->nullable()->after('status');
            $table->text('deactivation_reason')->nullable()->after('deactivated_at');
            $table->unsignedBigInteger('deactivated_by')->nullable()->after('deactivation_reason');
        });
    }

    public function down(): void
    {
        Schema::table('adm_users', function (Blueprint $table) {
            $table->dropColumn(['deactivated_at', 'deactivation_reason', 'deactivated_by']);
        });
    }
};
