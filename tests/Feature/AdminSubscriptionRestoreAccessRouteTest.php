<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\AdmUser;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AdminSubscriptionRestoreAccessRouteTest extends TestCase
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
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('currency', 3)->default('PHP');
            $table->unsignedInteger('duration_days')->nullable();
            $table->boolean('livemode')->default(false);
            $table->string('provider')->default('paymongo');
            $table->string('provider_payment_id')->nullable();
            $table->string('status')->default('pending');
            $table->text('admin_notes')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->string('refund_reason', 500)->nullable();
            $table->timestamps();
        });

        Schema::create('adm_notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('adm_user_id');
            $table->string('type')->default('info');
            $table->string('source_type', 50)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->json('metadata')->nullable();
            $table->string('content');
            $table->string('url')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });
    }

    public function test_non_superadmin_cannot_restore_access(): void
    {
        $trader = $this->user('trader@example.test');
        $customer = $this->user('customer@example.test');
        $payment = $this->payment($customer);

        $this->actingAs($trader)->withSession(['admin_is_superadmin' => false])
            ->postJson("/admin/subscriptions/{$payment->id}/restore-access", [
                'days' => 30,
                'reason' => 'Should be rejected before reaching the service.',
            ])->assertForbidden();
    }

    public function test_restore_access_without_a_valid_reason_is_rejected(): void
    {
        $admin = $this->user('admin@example.test');
        $customer = $this->user('customer2@example.test');
        $payment = $this->payment($customer);

        $this->actingAs($admin)->withSession(['admin_is_superadmin' => true, 'admin_privileges' => 1])
            ->postJson("/admin/subscriptions/{$payment->id}/restore-access", [
                'days' => 30,
                'reason' => 'short',
            ])->assertStatus(422);
    }

    public function test_admin_can_restore_access_for_a_refunded_transaction(): void
    {
        $admin = $this->user('admin2@example.test');
        $customer = $this->user('customer3@example.test');
        $customer->forceFill(['replay_access_ends_at' => now()->subDay()])->save();
        $payment = $this->payment($customer);

        $this->actingAs($admin)->withSession(['admin_is_superadmin' => true, 'admin_privileges' => 1])
            ->postJson("/admin/subscriptions/{$payment->id}/restore-access", [
                'days' => 30,
                'reason' => 'Duplicate charge refund over-revoked a separate active purchase.',
            ])->assertOk();

        $this->assertTrue($customer->fresh()->replay_access_ends_at->isFuture());
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
            'duration_days' => 30, 'status' => 'refunded', 'refunded_at' => now(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return (object) ['id' => $id];
    }
}
