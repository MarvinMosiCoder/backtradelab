<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
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
        DB::table('payment_settings')->insert([
            'provider' => 'gcash', 'account_number' => '09232294905', 'account_name' => 'M***** M*****',
            'rules' => "Pay the exact plan amount.\nEnter the correct GCash reference number.\nUpload a clear payment screenshot.\nUse payment chat if you need help with verification.",
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }
    public function down(): void { Schema::dropIfExists('payment_settings'); }
};
