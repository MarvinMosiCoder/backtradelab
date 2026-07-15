<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('subscription_requests', function (Blueprint $table) {
            $table->string('provider_checkout_id')->nullable()->unique()->after('provider_payment_id');
            $table->text('provider_checkout_url')->nullable()->after('provider_checkout_id');
            $table->string('currency', 3)->default('PHP')->after('amount');
            $table->unsignedInteger('duration_days')->nullable()->after('currency');
            $table->boolean('livemode')->default(false)->after('duration_days');
            $table->string('provider_status_message', 500)->nullable()->after('livemode');
            $table->timestamp('paid_at')->nullable()->after('provider_status_message');
            $table->timestamp('failed_at')->nullable()->after('paid_at');
            $table->index(['provider', 'status', 'created_at'], 'subscription_provider_status_index');
        });

        DB::table('subscription_requests')
            ->where('provider', 'manual')
            ->whereIn('status', ['draft', 'pending'])
            ->update([
                'status' => 'archived',
                'admin_notes' => DB::raw("COALESCE(admin_notes, 'Archived when manual payments were retired.')"),
                'updated_at' => now(),
            ]);

        Schema::create('pay_mongo_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('provider_event_id')->unique();
            $table->string('event_type');
            $table->boolean('livemode')->default(false);
            $table->string('resource_id')->nullable()->index();
            $table->string('status')->default('received');
            $table->string('result_message', 500)->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });

        if (Schema::hasTable('payment_settings')) {
            DB::table('payment_settings')->pluck('qr_code_path')->filter()->each(function ($path) {
                if (Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                }
            });
            Schema::drop('payment_settings');
        }
    }

    public function down(): void
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

        Schema::dropIfExists('pay_mongo_webhook_events');

        Schema::table('subscription_requests', function (Blueprint $table) {
            $table->dropIndex('subscription_provider_status_index');
            $table->dropUnique(['provider_checkout_id']);
            $table->dropColumn([
                'provider_checkout_id', 'provider_checkout_url', 'currency', 'duration_days',
                'livemode', 'provider_status_message', 'paid_at', 'failed_at',
            ]);
        });
    }
};
