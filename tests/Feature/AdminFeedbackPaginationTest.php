<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\AdmUser;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AdminFeedbackPaginationTest extends TestCase
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
            $table->string('status')->default('paid');
            $table->timestamps();
        });

        Schema::create('user_feedback', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('adm_user_id');
            $table->unsignedBigInteger('subscription_request_id')->nullable();
            $table->string('category', 32);
            $table->string('payment_reason_code', 40)->nullable();
            $table->string('title', 160);
            $table->text('description');
            $table->string('page_url', 500)->nullable();
            $table->string('status', 24)->default('submitted');
            $table->string('priority', 16)->default('normal');
            $table->text('admin_response')->nullable();
            $table->unsignedBigInteger('responded_by')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
        });

        Schema::create('user_feedback_messages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_feedback_id');
            $table->unsignedBigInteger('adm_user_id');
            $table->text('message')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function test_feedback_admin_index_is_paginated(): void
    {
        $admin = $this->user('admin@example.test');
        $customer = $this->user('customer@example.test');
        foreach (range(1, 3) as $i) {
            DB::table('user_feedback')->insert([
                'adm_user_id' => $customer->id, 'category' => 'bug', 'title' => "Issue $i",
                'description' => 'Something is not working correctly here.',
                'status' => 'submitted', 'priority' => 'normal',
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        $response = $this->actingAs($admin)->withSession(['admin_is_superadmin' => true, 'admin_privileges' => 1])
            ->getJson('/admin/feedback/items')
            ->assertOk();

        $response->assertJsonStructure(['success', 'feedback' => ['data', 'current_page', 'last_page', 'total']]);
        $this->assertSame(3, $response->json('feedback.total'));
    }

    public function test_non_superadmin_is_rejected(): void
    {
        $trader = $this->user('trader@example.test');

        $this->actingAs($trader)->withSession(['admin_is_superadmin' => false])
            ->getJson('/admin/feedback/items')->assertForbidden();
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
