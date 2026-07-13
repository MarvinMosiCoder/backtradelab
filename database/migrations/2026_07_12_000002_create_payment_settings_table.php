<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('payment_settings', function (Blueprint $table) {
            $table->id();
            $table->string('provider')->default('gcash')->unique();
            $table->string('account_number', 40);
            $table->string('account_name', 120);
            $table->text('rules')->nullable();
            $table->string('qr_code_path')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('payment_settings'); }
};
