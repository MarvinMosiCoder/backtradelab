<?php

namespace Tests\Unit;

use App\Models\AdmUser;
use App\Models\SubscriptionRequest;
use App\Services\Payments\SubscriptionEntitlementService;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SubscriptionEntitlementServiceRevokeTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated entitlement tests.');
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');

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

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_revoke_clears_future_access_and_marks_refunded(): void
    {
        $user = $this->user();
        $user->forceFill(['replay_access_ends_at' => now()->addDays(20)])->save();
        $payment = $this->payment($user, 'paid');

        $updated = app(SubscriptionEntitlementService::class)->revoke($payment, 'Customer requested a refund.');

        $this->assertSame('refunded', $updated->status);
        $this->assertNotNull($updated->refunded_at);
        $this->assertSame('Customer requested a refund.', $updated->refund_reason);
        $this->assertTrue($user->fresh()->replay_access_ends_at->isPast());
        $this->assertSame(1, DB::table('adm_notifications')->where('adm_user_id', $user->id)->count());
    }

    public function test_revoke_is_idempotent(): void
    {
        $user = $this->user();
        $user->forceFill(['replay_access_ends_at' => now()->addDays(20)])->save();
        $payment = $this->payment($user, 'paid');

        $service = app(SubscriptionEntitlementService::class);
        $service->revoke($payment, 'First refund attempt.');
        $service->revoke($payment->fresh(), 'Second call should be a no-op.');

        $this->assertSame(1, DB::table('adm_notifications')->where('adm_user_id', $user->id)->count());
        $this->assertSame('First refund attempt.', $payment->fresh()->refund_reason);
    }

    public function test_revoke_warns_when_another_paid_purchase_still_exists(): void
    {
        Log::shouldReceive('info')->once();
        Log::shouldReceive('warning')->once()->with(\Mockery::pattern('/over-revoked/'));

        $user = $this->user();
        $user->forceFill(['replay_access_ends_at' => now()->addDays(20)])->save();
        $refundedPayment = $this->payment($user, 'paid');
        $this->payment($user, 'paid');

        app(SubscriptionEntitlementService::class)->revoke($refundedPayment, 'Refunding one of two purchases.');
    }

    public function test_revoke_fully_clears_access_after_a_gap_instead_of_subtracting_duration(): void
    {
        $service = app(SubscriptionEntitlementService::class);
        $user = $this->user();

        Carbon::setTestNow(Carbon::parse('2026-01-01 00:00:00'));
        $planA = $this->payment($user, 'creating', ['duration_days' => 30, 'provider_payment_id' => 'pay_a']);
        $service->activate($planA, ['id' => 'pay_a', 'amount' => 100000, 'currency' => 'PHP', 'livemode' => false]);
        $this->assertTrue($user->fresh()->replay_access_ends_at->isSameDay(Carbon::parse('2026-01-31')));

        // Plan A's 30-day window has fully lapsed (10-day gap) before Plan B is purchased — no overlap.
        Carbon::setTestNow(Carbon::parse('2026-02-10 00:00:00'));
        $planB = $this->payment($user, 'creating', ['duration_days' => 30, 'provider_payment_id' => 'pay_b']);
        $service->activate($planB, ['id' => 'pay_b', 'amount' => 100000, 'currency' => 'PHP', 'livemode' => false]);
        $this->assertTrue($user->fresh()->replay_access_ends_at->isSameDay(Carbon::parse('2026-03-12')), 'Plan B should start fresh from its own purchase date, independent of the already-lapsed Plan A.');

        // Refund Plan A ten days into Plan B's own, unrelated, unrefunded window.
        // (Noon, not midnight — revoke() sets ends_at to now()->subSecond(), which would
        // roll back to the previous calendar day if "now" were exactly midnight.)
        Carbon::setTestNow(Carbon::parse('2026-02-20 12:00:00'));
        $service->revoke($planA->fresh(), 'Refunding plan A only.');

        $endsAtAfterRevoke = $user->fresh()->replay_access_ends_at;
        // A "subtract Plan A's 30 days" implementation would compute 2026-03-12 minus 30
        // days = 2026-02-10 — a value derived purely from Plan A's duration, unrelated to
        // when the refund actually happened. The chosen full-clear design instead pins the
        // cutoff to the moment of revocation itself (~2026-02-20), which is what's asserted
        // here: access ends at revoke-time, not at some subtraction arithmetic result.
        $this->assertTrue($endsAtAfterRevoke->isSameDay(Carbon::parse('2026-02-20')));
        $this->assertFalse($endsAtAfterRevoke->isSameDay(Carbon::parse('2026-02-10')));
    }

    private function user(): AdmUser
    {
        $id = DB::table('adm_users')->insertGetId([
            'name' => 'Test User', 'email' => 'user'.uniqid().'@example.test', 'status' => 'ACTIVE',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return AdmUser::query()->findOrFail($id);
    }

    private function payment(AdmUser $user, string $status, array $overrides = []): SubscriptionRequest
    {
        $id = DB::table('subscription_requests')->insertGetId(array_merge([
            'adm_user_id' => $user->id, 'plan' => 'monthly', 'provider' => 'paymongo',
            'provider_payment_id' => 'pay_'.uniqid(), 'amount' => 1000, 'currency' => 'PHP',
            'duration_days' => 30, 'status' => $status,
            'paid_at' => $status === 'paid' ? now() : null,
            'created_at' => now(), 'updated_at' => now(),
        ], $overrides));
        return SubscriptionRequest::query()->findOrFail($id);
    }
}
