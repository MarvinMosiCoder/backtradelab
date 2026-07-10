<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('market_replay_progress', function (Blueprint $table) {
            $table->unsignedBigInteger('client_saved_at')->nullable()->after('selected_price');
        });
    }

    public function down(): void
    {
        Schema::table('market_replay_progress', function (Blueprint $table) {
            $table->dropColumn('client_saved_at');
        });
    }
};
