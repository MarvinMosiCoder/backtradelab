<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('subscription_requests', function (Blueprint $table) {
            $table->string('provider_refund_id')->nullable()->after('provider_payment_id');
            $table->timestamp('refunded_at')->nullable()->after('failed_at');
            $table->decimal('refund_amount', 12, 2)->nullable()->after('refunded_at');
            $table->string('refund_status')->nullable()->after('refund_amount');
            $table->string('refund_reason', 500)->nullable()->after('refund_status');
            $table->index('provider_refund_id');
        });
    }

    public function down(): void
    {
        Schema::table('subscription_requests', function (Blueprint $table) {
            $table->dropIndex(['provider_refund_id']);
            $table->dropColumn(['provider_refund_id', 'refunded_at', 'refund_amount', 'refund_status', 'refund_reason']);
        });
    }
};
