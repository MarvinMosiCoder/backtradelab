<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::table('payment_settings')
            ->where('provider', 'gcash')
            ->where('account_name', 'M***** M*****')
            ->where('rules', "Pay the exact plan amount.\nEnter the correct GCash reference number.\nUpload a clear payment screenshot.\nUse payment chat if you need help with verification.")
            ->delete();
    }

    public function down(): void
    {
        // Intentionally do not restore a committed payment identifier.
    }
};
