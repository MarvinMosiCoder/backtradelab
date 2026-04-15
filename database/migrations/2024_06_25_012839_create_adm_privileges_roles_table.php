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
        Schema::create('adm_privileges_roles', function (Blueprint $table) {
            $table->increments('id');
            $table->tinyInteger('is_visible')->nullable();
            $table->tinyInteger('is_create')->nullable();
            $table->tinyInteger('is_read')->nullable();
            $table->tinyInteger('is_edit')->nullable();
            $table->tinyInteger('is_delete')->nullable();
            $table->tinyInteger('is_void')->nullable();
            $table->tinyInteger('is_override')->nullable();
            $table->integer('id_adm_privileges')->nullable();
            $table->integer('id_adm_modules')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('adm_privileges_roles');
    }
};
