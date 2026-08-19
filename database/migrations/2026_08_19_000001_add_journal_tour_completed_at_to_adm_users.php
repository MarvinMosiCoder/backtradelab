<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('adm_users', function (Blueprint $table) {
            $table->timestamp('journal_tour_completed_at')->nullable()->after('chart_tour_completed_at');
        });
    }

    public function down(): void
    {
        Schema::table('adm_users', fn (Blueprint $table) => $table->dropColumn('journal_tour_completed_at'));
    }
};
