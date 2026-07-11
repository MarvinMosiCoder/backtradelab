<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('adm_users', function (Blueprint $table) {
            $table->string('username', 60)->nullable()->unique()->after('name');
            $table->string('timezone', 64)->nullable()->after('email');
            $table->string('trading_experience', 24)->nullable()->after('timezone');
            $table->string('social_provider', 24)->nullable()->after('password');
            $table->string('social_provider_id', 191)->nullable()->after('social_provider');
            $table->boolean('password_login_enabled')->default(true)->after('social_provider_id');
            $table->unique(['social_provider', 'social_provider_id'], 'adm_users_social_identity_unique');
        });
    }

    public function down(): void
    {
        Schema::table('adm_users', function (Blueprint $table) {
            $table->dropUnique('adm_users_social_identity_unique');
            $table->dropUnique('adm_users_username_unique');
            $table->dropColumn(['username', 'timezone', 'trading_experience', 'social_provider', 'social_provider_id', 'password_login_enabled']);
        });
    }
};
