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
        Schema::create('announcement_user', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('announcement_id'); 
            $table->unsignedBigInteger('adm_user_id'); 
            $table->timestamps();

            // Indexes
            $table->index('announcement_id'); // Index for announcement_id
            $table->index('adm_user_id'); // Index for adm_user_id

            // Foreign key constraints can be added if needed, e.g.
            $table->foreign('announcement_id')->references('id')->on('announcements')->onDelete('cascade');
            $table->foreign('adm_user_id')->references('id')->on('adm_users')->onDelete('cascade');
            $table->engine = 'InnoDB';
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('announcement_user');
    }
};
