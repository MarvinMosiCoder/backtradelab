<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\AdmUser;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PaymentActivityLogRouteTest extends TestCase
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
            $table->string('status')->default('ACTIVE');
            $table->rememberToken();
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

    public function test_non_superadmin_cannot_list_payment_activity(): void
    {
        $trader = $this->user('trader@example.test');

        $this->actingAs($trader)->withSession(['admin_is_superadmin' => false])
            ->getJson('/admin/payment-activity/items')->assertForbidden();
    }

    public function test_superadmin_can_list_and_filter_by_subscription_request(): void
    {
        $admin = $this->user('admin@example.test');
        $customer = $this->user('customer@example.test');
        $paymentId = DB::table('subscription_requests')->insertGetId([
            'adm_user_id' => $customer->id, 'plan' => 'monthly', 'amount' => 1000, 'currency' => 'PHP',
            'status' => 'paid', 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('payment_activity_logs')->insert([
            ['subscription_request_id' => $paymentId, 'adm_user_id' => $customer->id, 'action' => 'checkout_created', 'actor' => 'system', 'description' => 'Checkout created.', 'created_at' => now(), 'updated_at' => now()],
            ['subscription_request_id' => null, 'adm_user_id' => $customer->id, 'action' => 'trial_activated', 'actor' => 'system', 'description' => 'Trial activated.', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->actingAs($admin)->withSession(['admin_is_superadmin' => true, 'admin_privileges' => 1])
            ->getJson('/admin/payment-activity/items')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->actingAs($admin)->withSession(['admin_is_superadmin' => true, 'admin_privileges' => 1])
            ->getJson("/admin/payment-activity/items?subscription_request_id={$paymentId}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.action', 'checkout_created');
    }

    private function user(string $email): AdmUser
    {
        $id = DB::table('adm_users')->insertGetId([
            'name' => 'Test', 'email' => $email, 'status' => 'ACTIVE',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return AdmUser::query()->findOrFail($id);
    }
}
