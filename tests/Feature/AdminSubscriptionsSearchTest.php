<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\AdmUser;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AdminSubscriptionsSearchTest extends TestCase
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
            $table->string('payment_reference')->nullable();
            $table->string('provider_checkout_id')->nullable();
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('currency', 3)->default('PHP');
            $table->string('provider')->default('paymongo');
            $table->boolean('livemode')->default(false);
            $table->string('status')->default('pending');
            $table->timestamps();
        });
    }

    public function test_search_matches_by_user_email(): void
    {
        $admin = $this->user('admin@example.test');
        $findable = $this->user('findme@example.test');
        $other = $this->user('other@example.test');
        $this->payment($findable);
        $this->payment($other);

        $response = $this->actingAs($admin)->withSession(['admin_is_superadmin' => true, 'admin_privileges' => 1])
            ->getJson('/admin/subscriptions/items?search=findme')
            ->assertOk();

        $emails = collect($response->json('data'))->pluck('user.email');
        $this->assertTrue($emails->contains('findme@example.test'));
        $this->assertFalse($emails->contains('other@example.test'));
    }

    public function test_response_is_paginated(): void
    {
        $admin = $this->user('admin2@example.test');
        $customer = $this->user('customer@example.test');
        foreach (range(1, 3) as $i) $this->payment($customer);

        $response = $this->actingAs($admin)->withSession(['admin_is_superadmin' => true, 'admin_privileges' => 1])
            ->getJson('/admin/subscriptions/items')
            ->assertOk();

        $response->assertJsonStructure(['data', 'current_page', 'last_page', 'total']);
        $this->assertSame(3, $response->json('total'));
    }

    public function test_non_superadmin_is_rejected(): void
    {
        $trader = $this->user('trader@example.test');

        $this->actingAs($trader)->withSession(['admin_is_superadmin' => false])
            ->getJson('/admin/subscriptions/items')->assertForbidden();
    }

    private function user(string $email): AdmUser
    {
        $id = DB::table('adm_users')->insertGetId([
            'name' => 'Test', 'email' => $email, 'status' => 'ACTIVE',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return AdmUser::query()->findOrFail($id);
    }

    private function payment(AdmUser $user): void
    {
        DB::table('subscription_requests')->insert([
            'adm_user_id' => $user->id, 'plan' => 'monthly', 'provider' => 'paymongo',
            'amount' => 1000, 'currency' => 'PHP', 'status' => 'paid',
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }
}
