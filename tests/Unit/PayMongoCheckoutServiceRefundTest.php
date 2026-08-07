<?php

namespace Tests\Unit;

use App\Models\AdmUser;
use App\Models\SubscriptionRequest;
use App\Services\Payments\PayMongoCheckoutService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

class PayMongoCheckoutServiceRefundTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated refund-service tests.');
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        config()->set('services.paymongo', [
            'enabled' => true, 'mode' => 'test', 'secret_key' => 'sk_test_example',
            'webhook_secret' => 'whsk_test', 'payment_methods' => ['card', 'gcash'],
            'test_bypass_capabilities' => true, 'live_enabled' => false,
            'base_url' => 'https://api.paymongo.test/v1/', 'signature_tolerance' => 300,
        ]);

        Schema::create('adm_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password')->nullable();
            $table->string('status')->default('ACTIVE');
            $table->timestamp('replay_access_ends_at')->nullable();
            $table->timestamp('renewal_reminder_sent_at')->nullable();
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

    public function test_refund_happy_path_revokes_access_and_records_refund_details(): void
    {
        Http::fake([
            'https://api.paymongo.test/v1/refunds' => Http::response([
                'data' => ['id' => 're_1', 'attributes' => ['status' => 'succeeded', 'amount' => 100000]],
            ], 201),
        ]);

        $user = $this->user();
        $user->forceFill(['replay_access_ends_at' => now()->addDays(20)])->save();
        $payment = $this->payment($user, 'paid');
        $admin = $this->user('admin@example.test');

        $updated = app(PayMongoCheckoutService::class)->refund($payment, 'requested_by_customer', 'Customer asked for a refund.', $admin);

        $this->assertSame('refunded', $updated->status);
        $this->assertSame('re_1', $updated->provider_refund_id);
        $this->assertSame('succeeded', $updated->refund_status);
        $this->assertEquals(1000.00, (float) $updated->refund_amount);
        $this->assertTrue($user->fresh()->replay_access_ends_at->isPast());
        $this->assertSame(1, DB::table('adm_notifications')->where('adm_user_id', $user->id)->count());
    }

    public function test_refund_reverts_to_paid_and_leaves_access_untouched_on_provider_failure(): void
    {
        Http::fake([
            'https://api.paymongo.test/v1/refunds' => Http::response([
                'errors' => [['detail' => 'The payment has already been refunded.']],
            ], 422),
        ]);

        $user = $this->user();
        $futureEndsAt = now()->addDays(20);
        $user->forceFill(['replay_access_ends_at' => $futureEndsAt])->save();
        $payment = $this->payment($user, 'paid');

        try {
            app(PayMongoCheckoutService::class)->refund($payment, 'duplicate', 'Trying to refund a duplicate charge.', $user);
            $this->fail('Expected a RuntimeException.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('already been refunded', $exception->getMessage());
        }

        $fresh = $payment->fresh();
        $this->assertSame('paid', $fresh->status);
        $this->assertStringContainsString('Refund attempt failed', $fresh->provider_status_message);
        $this->assertTrue($user->fresh()->replay_access_ends_at->isSameSecond($futureEndsAt));
        $this->assertSame(0, DB::table('adm_notifications')->where('adm_user_id', $user->id)->count());
    }

    public function test_refund_rejects_a_non_paid_transaction_without_any_http_call(): void
    {
        Http::fake();
        $user = $this->user();
        $payment = $this->payment($user, 'pending');

        $this->expectExceptionMessage('Only a successfully paid transaction can be refunded.');
        try {
            app(PayMongoCheckoutService::class)->refund($payment, 'others', 'Should never reach PayMongo.', $user);
        } finally {
            Http::assertNothingSent();
        }
    }

    private function user(string $email = null): AdmUser
    {
        $id = DB::table('adm_users')->insertGetId([
            'name' => 'Test User', 'email' => $email ?? 'user'.uniqid().'@example.test', 'status' => 'ACTIVE',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return AdmUser::query()->findOrFail($id);
    }

    private function payment(AdmUser $user, string $status): SubscriptionRequest
    {
        $id = DB::table('subscription_requests')->insertGetId([
            'adm_user_id' => $user->id, 'plan' => 'monthly', 'provider' => 'paymongo',
            'provider_payment_id' => 'pay_'.uniqid(), 'amount' => 1000, 'currency' => 'PHP',
            'duration_days' => 30, 'status' => $status,
            'paid_at' => $status === 'paid' ? now() : null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return SubscriptionRequest::query()->findOrFail($id);
    }
}
