<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\AdmUser;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AdminSubscriptionRefundRouteTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated admin route tests.');
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');
        $this->withoutMiddleware(HandleInertiaRequests::class);

        Schema::create('adm_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password')->nullable();
            $table->string('status')->default('ACTIVE');
            $table->timestamp('replay_access_ends_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('subscription_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('adm_user_id');
            $table->string('plan')->default('monthly');
            $table->string('payment_method')->default('paymongo_checkout');
            $table->string('payment_reference')->nullable();
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('currency', 3)->default('PHP');
            $table->unsignedInteger('duration_days')->nullable();
            $table->boolean('livemode')->default(false);
            $table->string('provider')->default('paymongo');
            $table->string('provider_payment_id')->nullable();
            $table->string('provider_refund_id')->nullable();
            $table->string('status')->default('pending');
            $table->string('provider_status_message', 500)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->decimal('refund_amount', 12, 2)->nullable();
            $table->string('refund_status')->nullable();
            $table->string('refund_reason', 500)->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function test_non_superadmin_cannot_refund_a_payment(): void
    {
        $trader = $this->user('trader@example.test');
        $customer = $this->user('customer@example.test');
        $payment = $this->payment($customer);

        $this->actingAs($trader)->withSession(['admin_is_superadmin' => false])
            ->postJson("/admin/subscriptions/{$payment->id}/refund", [
                'reason_code' => 'requested_by_customer',
                'reason' => 'Should be rejected before reaching the service.',
            ])->assertForbidden();
    }

    public function test_refund_request_without_a_reason_is_rejected(): void
    {
        $admin = $this->user('admin@example.test');
        $customer = $this->user('customer2@example.test');
        $payment = $this->payment($customer);

        $this->actingAs($admin)->withSession(['admin_is_superadmin' => true, 'admin_privileges' => 1])
            ->postJson("/admin/subscriptions/{$payment->id}/refund", [
                'reason_code' => 'requested_by_customer',
                'reason' => 'short',
            ])->assertStatus(422);
    }

    private function user(string $email): AdmUser
    {
        $id = DB::table('adm_users')->insertGetId([
            'name' => 'Test', 'email' => $email, 'status' => 'ACTIVE',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return AdmUser::query()->findOrFail($id);
    }

    private function payment(AdmUser $user): object
    {
        $id = DB::table('subscription_requests')->insertGetId([
            'adm_user_id' => $user->id, 'plan' => 'monthly', 'provider' => 'paymongo',
            'provider_payment_id' => 'pay_route_test', 'amount' => 1000, 'currency' => 'PHP',
            'duration_days' => 30, 'status' => 'paid', 'paid_at' => now(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return (object) ['id' => $id];
    }
}
