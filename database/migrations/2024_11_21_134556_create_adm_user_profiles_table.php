<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('adm_user_profiles', function (Blueprint $table) {
            $table->id();
            $table->integer('adm_user_id')->nullable();
            $table->string('file_name')->nullable();
            $table->string('ext')->nullable();
            $table->integer('created_by')->nullable();
            $table->date('archived')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('adm_user_profiles');
    }
};
