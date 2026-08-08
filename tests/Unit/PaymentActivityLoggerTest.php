<?php

namespace Tests\Unit;

use App\Models\AdmUser;
use App\Models\SubscriptionRequest;
use App\Services\Payments\PaymentActivityLogger;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PaymentActivityLoggerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated logger tests.');
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        Schema::create('adm_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('status')->default('ACTIVE');
            $table->timestamps();
        });

        Schema::create('subscription_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('adm_user_id');
            $table->string('plan')->default('monthly');
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('currency', 3)->default('PHP');
            $table->string('status')->default('pending');
            $table->timestamps();
        });

        Schema::create('payment_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('subscription_request_id')->nullable();
            $table->unsignedBigInteger('adm_user_id')->nullable();
            $table->string('action', 60);
            $table->string('actor', 60)->default('system');
            $table->string('description', 500);
            $table->json('context')->nullable();
            $table->timestamps();
        });
    }

    public function test_log_records_an_entry_tied_to_a_payment_and_user(): void
    {
        $user = $this->user();
        $payment = $this->payment($user);

        app(PaymentActivityLogger::class)->log($payment, $user, 'checkout_created', 'Checkout created for monthly plan.');

        $this->assertSame(1, DB::table('payment_activity_logs')->count());
        $row = DB::table('payment_activity_logs')->first();
        $this->assertSame($payment->id, $row->subscription_request_id);
        $this->assertSame($user->id, $row->adm_user_id);
        $this->assertSame('checkout_created', $row->action);
        $this->assertSame('system', $row->actor);
    }

    public function test_log_falls_back_to_the_payments_own_user_when_no_user_is_passed(): void
    {
        $user = $this->user();
        $payment = $this->payment($user);

        app(PaymentActivityLogger::class)->log($payment, null, 'payment_activated', 'Access activated.');

        $this->assertSame($user->id, DB::table('payment_activity_logs')->value('adm_user_id'));
    }

    public function test_log_supports_a_trial_activation_with_no_payment_row(): void
    {
        $user = $this->user();

        app(PaymentActivityLogger::class)->log(null, $user, 'trial_activated', 'Free 7-day trial activated.');

        $row = DB::table('payment_activity_logs')->first();
        $this->assertNull($row->subscription_request_id);
        $this->assertSame($user->id, $row->adm_user_id);
    }

    public function test_logging_never_throws_even_if_persistence_is_impossible(): void
    {
        Schema::drop('payment_activity_logs');
        app(PaymentActivityLogger::class)->log(null, $this->user(), 'trial_activated', 'No table to write to.');
        $this->assertTrue(true);
    }

    private function user(): AdmUser
    {
        $id = DB::table('adm_users')->insertGetId([
            'name' => 'Test User', 'email' => 'user'.uniqid().'@example.test', 'status' => 'ACTIVE',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return AdmUser::query()->findOrFail($id);
    }

    private function payment(AdmUser $user): SubscriptionRequest
    {
        $id = DB::table('subscription_requests')->insertGetId([
            'adm_user_id' => $user->id, 'plan' => 'monthly', 'amount' => 1000, 'currency' => 'PHP',
            'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
        ]);
        return SubscriptionRequest::query()->findOrFail($id);
    }
}
