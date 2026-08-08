<?php

namespace Tests\Unit;

use App\Models\AdmUser;
use App\Models\SubscriptionRequest;
use App\Services\Payments\PayMongoCheckoutService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PayMongoCheckoutServiceExpireStalePendingTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated checkout-service tests.');
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
            $table->string('provider_checkout_id')->nullable();
            $table->string('provider_payment_id')->nullable();
            $table->string('status')->default('pending');
            $table->string('provider_status_message', 500)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('failed_at')->nullable();
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

    public function test_a_still_open_checkout_is_marked_locally_expired_and_logged(): void
    {
        $user = $this->user();
        $payment = $this->payment($user, 'checkout_abc');

        Http::fake([
            'https://api.paymongo.test/v1/checkout_sessions/checkout_abc' => Http::response([
                'data' => ['id' => 'checkout_abc', 'attributes' => ['livemode' => false, 'status' => 'active', 'payments' => []]],
            ], 200),
        ]);

        app(PayMongoCheckoutService::class)->expireStalePending($user);

        $fresh = $payment->fresh();
        $this->assertSame('expired', $fresh->status);
        $this->assertStringContainsString('Abandoned', $fresh->provider_status_message);
        $this->assertSame(1, DB::table('payment_activity_logs')->where('action', 'checkout_expired')->count());
    }

    public function test_a_checkout_the_provider_now_shows_as_paid_is_activated_instead_of_expired(): void
    {
        $user = $this->user();
        $payment = $this->payment($user, 'checkout_paid_now', ['amount' => 1000, 'currency' => 'PHP']);

        Http::fake([
            'https://api.paymongo.test/v1/checkout_sessions/checkout_paid_now' => Http::response([
                'data' => ['id' => 'checkout_paid_now', 'attributes' => [
                    'livemode' => false,
                    'status' => 'active',
                    'reference_number' => 'ref-1',
                    'payments' => [[
                        'id' => 'pay_now', 'attributes' => ['status' => 'paid', 'amount' => 100000, 'currency' => 'PHP', 'paid_at' => now()->timestamp],
                    ]],
                ]],
            ], 200),
        ]);

        app(PayMongoCheckoutService::class)->expireStalePending($user);

        $fresh = $payment->fresh();
        $this->assertSame('paid', $fresh->status);
        $this->assertTrue($user->fresh()->replay_access_ends_at->isFuture());
    }

    public function test_a_row_with_no_checkout_id_is_expired_locally_without_any_http_call(): void
    {
        Http::fake();
        $user = $this->user();
        $payment = $this->payment($user, null);

        app(PayMongoCheckoutService::class)->expireStalePending($user);

        $this->assertSame('expired', $payment->fresh()->status);
        Http::assertNothingSent();
    }

    private function user(): AdmUser
    {
        $id = DB::table('adm_users')->insertGetId([
            'name' => 'Test User', 'email' => 'user'.uniqid().'@example.test', 'status' => 'ACTIVE',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return AdmUser::query()->findOrFail($id);
    }

    private function payment(AdmUser $user, ?string $checkoutId, array $overrides = []): SubscriptionRequest
    {
        $id = DB::table('subscription_requests')->insertGetId(array_merge([
            'adm_user_id' => $user->id, 'plan' => 'monthly', 'provider' => 'paymongo',
            'provider_checkout_id' => $checkoutId, 'amount' => 1000, 'currency' => 'PHP',
            'duration_days' => 30, 'status' => 'pending',
            'created_at' => now(), 'updated_at' => now(),
        ], $overrides));
        return SubscriptionRequest::query()->findOrFail($id);
    }
}
