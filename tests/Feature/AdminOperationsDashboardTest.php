<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\AdmUser;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AdminOperationsDashboardTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated admin dashboard tests.');
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');
        $this->withoutMiddleware(HandleInertiaRequests::class);

        Schema::create('adm_users', function (Blueprint $table) {
            $table->id(); $table->string('name'); $table->string('email')->unique();
            $table->string('password')->nullable(); $table->string('status')->default('ACTIVE');
            $table->rememberToken(); $table->timestamps();
        });
        Schema::create('adm_menuses', function (Blueprint $table) {
            $table->id(); $table->string('type')->default('URL'); $table->string('path')->nullable();
            $table->unsignedBigInteger('parent_id')->default(0); $table->boolean('is_active')->default(true);
            $table->boolean('is_dashboard')->default(false); $table->integer('sorting')->default(0);
        });
        Schema::create('adm_menus_privileges', function (Blueprint $table) {
            $table->id(); $table->unsignedBigInteger('id_adm_menus'); $table->unsignedBigInteger('id_adm_privileges');
        });
        Schema::create('subscription_requests', function (Blueprint $table) {
            $table->id(); $table->unsignedBigInteger('adm_user_id'); $table->string('plan')->default('monthly');
            $table->decimal('amount', 12, 2)->nullable(); $table->string('currency', 3)->default('PHP');
            $table->string('status')->default('pending'); $table->timestamp('paid_at')->nullable(); $table->timestamps();
        });
        Schema::create('user_feedback', function (Blueprint $table) {
            $table->id(); $table->unsignedBigInteger('adm_user_id'); $table->string('category');
            $table->string('title'); $table->text('description'); $table->string('status')->default('submitted');
            $table->string('priority')->default('normal'); $table->text('admin_response')->nullable(); $table->timestamps();
        });
    }

    public function test_admin_dashboard_returns_subscription_and_support_metrics(): void
    {
        $admin = $this->user('Admin', 'admin@example.test');
        $customer = $this->user('Customer', 'customer@example.test');

        $this->payment($customer, 'paid', 500, 'PHP', now()->subDays(5));
        $this->payment($customer, 'paid', 250, 'PHP', now()->subDays(40));
        $this->payment($customer, 'paid', 999, 'USD', now()->subDays(2));
        $this->payment($customer, 'pending', 100, 'PHP');
        $this->payment($customer, 'failed', 100, 'PHP');
        $this->feedback($customer, 'submitted', 'urgent', null, now()->subDay());
        $this->feedback($customer, 'completed', 'normal', 'Resolved', now()->subDays(40));

        $this->actingAs($admin)->withSession(['admin_is_superadmin' => true, 'admin_privileges' => 1])
            ->withHeader('X-Inertia', 'true')->get('/dashboard')
            ->assertOk()
            ->assertJsonPath('component', 'Dashboard/Dashboard')
            ->assertJsonPath('props.subscriptionMetrics.paidLifetime', 3)
            ->assertJsonPath('props.subscriptionMetrics.revenueLifetimePhp', 750)
            ->assertJsonPath('props.subscriptionMetrics.paidLast30Days', 2)
            ->assertJsonPath('props.subscriptionMetrics.revenueLast30DaysPhp', 500)
            ->assertJsonPath('props.subscriptionMetrics.pending', 1)
            ->assertJsonPath('props.subscriptionMetrics.failedOrExpired', 1)
            ->assertJsonPath('props.feedbackMetrics.total', 2)
            ->assertJsonPath('props.feedbackMetrics.newLast30Days', 1)
            ->assertJsonPath('props.feedbackMetrics.open', 1)
            ->assertJsonPath('props.feedbackMetrics.highPriority', 1)
            ->assertJsonPath('props.feedbackMetrics.awaitingResponse', 1)
            ->assertJsonCount(5, 'props.recentSubscriptions')
            ->assertJsonCount(2, 'props.recentFeedback');
    }

    public function test_admin_workspace_is_admin_only_and_uses_workspace_mode(): void
    {
        $admin = $this->user('Admin', 'admin2@example.test');
        $trader = $this->user('Trader', 'trader@example.test');

        $this->actingAs($trader)->withSession(['admin_is_superadmin' => false])
            ->withHeader('X-Inertia', 'true')->get('/admin/workspace')->assertForbidden();

        $this->actingAs($admin)->withSession(['admin_is_superadmin' => true, 'admin_privileges' => 1])
            ->withHeader('X-Inertia', 'true')->get('/admin/workspace')
            ->assertOk()
            ->assertJsonPath('component', 'Dashboard/Dashboard')
            ->assertJsonPath('props.workspaceMode', true);
    }

    private function user(string $name, string $email): AdmUser
    {
        $id = DB::table('adm_users')->insertGetId(['name' => $name, 'email' => $email, 'status' => 'ACTIVE', 'created_at' => now(), 'updated_at' => now()]);
        return AdmUser::query()->findOrFail($id);
    }

    private function payment(AdmUser $user, string $status, float $amount, string $currency, $paidAt = null): void
    {
        DB::table('subscription_requests')->insert(['adm_user_id' => $user->id, 'plan' => 'monthly', 'amount' => $amount, 'currency' => $currency, 'status' => $status, 'paid_at' => $paidAt, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function feedback(AdmUser $user, string $status, string $priority, ?string $response, $createdAt): void
    {
        DB::table('user_feedback')->insert(['adm_user_id' => $user->id, 'category' => 'account', 'title' => 'Support request', 'description' => 'Please help with this request.', 'status' => $status, 'priority' => $priority, 'admin_response' => $response, 'created_at' => $createdAt, 'updated_at' => $createdAt]);
    }
}
