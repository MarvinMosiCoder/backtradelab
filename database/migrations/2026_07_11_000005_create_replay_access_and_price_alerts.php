<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('adm_users', function (Blueprint $table) {
            $table->timestamp('replay_trial_started_at')->nullable()->after('status');
            $table->timestamp('replay_trial_ends_at')->nullable()->after('replay_trial_started_at');
            $table->timestamp('replay_access_ends_at')->nullable()->after('replay_trial_ends_at');
        });

        Schema::create('subscription_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adm_user_id')->constrained('adm_users')->cascadeOnDelete();
            $table->string('plan')->default('monthly');
            $table->string('payment_method')->default('gcash_manual');
            $table->string('payment_reference')->nullable();
            $table->string('payment_proof_path')->nullable();
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('provider')->default('manual');
            $table->string('provider_payment_id')->nullable();
            $table->string('status')->default('pending');
            $table->text('admin_notes')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('adm_users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index(['adm_user_id', 'status']);
        });

        Schema::create('market_price_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adm_user_id')->constrained('adm_users')->cascadeOnDelete();
            $table->string('exchange', 30);
            $table->string('category', 30)->default('spot');
            $table->string('symbol', 40);
            $table->decimal('target_price', 24, 10);
            $table->string('direction', 10)->default('cross');
            $table->decimal('last_price', 24, 10)->nullable();
            $table->string('status')->default('active');
            $table->timestamp('triggered_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'symbol']);
            $table->index(['adm_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_price_alerts');
        Schema::dropIfExists('subscription_requests');
        Schema::table('adm_users', fn (Blueprint $table) => $table->dropColumn([
            'replay_trial_started_at', 'replay_trial_ends_at', 'replay_access_ends_at',
        ]));
    }
};
