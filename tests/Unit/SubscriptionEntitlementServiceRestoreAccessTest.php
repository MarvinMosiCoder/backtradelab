<?php

namespace Tests\Unit;

use App\Models\AdmUser;
use App\Models\SubscriptionRequest;
use App\Services\Payments\SubscriptionEntitlementService;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SubscriptionEntitlementServiceRestoreAccessTest extends TestCase
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

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_restore_access_extends_from_now_when_access_already_lapsed(): void
    {
        $user = $this->user();
        $user->forceFill(['replay_access_ends_at' => now()->subDay()])->save();
        $refundedPayment = $this->payment($user, 'refunded');
        $admin = $this->user();

        Carbon::setTestNow(Carbon::parse('2026-03-01 00:00:00'));
        $updated = app(SubscriptionEntitlementService::class)
            ->restoreAccess($refundedPayment, 30, 'Duplicate charge refund over-revoked a separate active purchase.', $admin);

        $this->assertTrue($user->fresh()->replay_access_ends_at->isSameDay(Carbon::parse('2026-03-31')));
        $this->assertStringContainsString('restored 30 day(s)', $updated->admin_notes);
        $this->assertSame('refunded', $updated->status, 'Restoring access must not touch the refunded transaction\'s own status.');
        $this->assertSame(1, DB::table('adm_notifications')->where('adm_user_id', $user->id)->count());
    }

    public function test_restore_access_extends_from_existing_future_access_instead_of_now(): void
    {
        $user = $this->user();
        $user->forceFill(['replay_access_ends_at' => now()->addDays(5)])->save();
        $refundedPayment = $this->payment($user, 'refunded');
        $admin = $this->user();

        $originalEndsAt = $user->fresh()->replay_access_ends_at->copy();
        app(SubscriptionEntitlementService::class)
            ->restoreAccess($refundedPayment, 10, 'Restoring wrongly cleared remaining access.', $admin);

        $this->assertTrue($user->fresh()->replay_access_ends_at->isSameDay($originalEndsAt->copy()->addDays(10)));
    }

    private function user(): AdmUser
    {
        $id = DB::table('adm_users')->insertGetId([
            'name' => 'Test User', 'email' => 'user'.uniqid().'@example.test', 'status' => 'ACTIVE',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return AdmUser::query()->findOrFail($id);
    }

    private function payment(AdmUser $user, string $status): SubscriptionRequest
    {
        $id = DB::table('subscription_requests')->insertGetId([
            'adm_user_id' => $user->id, 'plan' => 'monthly', 'provider' => 'paymongo',
            'provider_payment_id' => 'pay_'.uniqid(), 'amount' => 1000, 'currency' => 'PHP',
            'duration_days' => 30, 'status' => $status, 'refunded_at' => now(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return SubscriptionRequest::query()->findOrFail($id);
    }
}
