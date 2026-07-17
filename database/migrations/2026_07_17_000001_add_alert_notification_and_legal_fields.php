<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('adm_users', function (Blueprint $table) {
            $table->boolean('alert_sound_enabled')->default(true)->after('replay_access_ends_at');
            $table->timestamp('terms_accepted_at')->nullable()->after('alert_sound_enabled');
            $table->timestamp('privacy_accepted_at')->nullable()->after('terms_accepted_at');
            $table->string('legal_effective_date', 80)->nullable()->after('privacy_accepted_at');
        });

        Schema::table('adm_notifications', function (Blueprint $table) {
            $table->string('source_type', 50)->nullable()->after('type');
            $table->unsignedBigInteger('source_id')->nullable()->after('source_type');
            $table->json('metadata')->nullable()->after('content');
            $table->unique(['source_type', 'source_id'], 'adm_notifications_source_unique');
        });
    }

    public function down(): void
    {
        Schema::table('adm_notifications', function (Blueprint $table) {
            $table->dropUnique('adm_notifications_source_unique');
            $table->dropColumn(['source_type', 'source_id', 'metadata']);
        });
        Schema::table('adm_users', fn (Blueprint $table) => $table->dropColumn([
            'alert_sound_enabled', 'terms_accepted_at', 'privacy_accepted_at', 'legal_effective_date',
        ]));
    }
};
