<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\AdmUser;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AdminAuthorizationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(HandleInertiaRequests::class);

        Route::middleware(['web', 'auth', 'admin.permission:users,edit'])->post('/_test/admin-edit', fn () => response()->json(['ok' => true]));
        Route::middleware(['web', 'auth', 'admin.permission:users,delete'])->delete('/_test/admin-delete', fn () => response()->json(['ok' => true]));
    }

    public function test_admin_login_page_is_separate(): void
    {
        $this->withHeader('X-Inertia', 'true')->get('/admin/login')
            ->assertOk()->assertJsonPath('component', 'Auth/AdminLogin');
    }

    public function test_public_homepage_does_not_require_an_admin_module(): void
    {
        $this->withHeader('X-Inertia', 'true')->get('/')
            ->assertOk()->assertJsonPath('component', 'Public/Home');
    }

    public function test_trader_credentials_are_rejected_by_admin_login(): void
    {
        $traderRole = $this->role('Users');
        $trader = $this->user($traderRole, 'trader@example.test');

        $this->post('/admin/login', ['email' => $trader->email, 'password' => 'password'])
            ->assertSessionHasErrors('message');
        $this->assertGuest();
    }

    public function test_active_trader_can_access_market_workspace(): void
    {
        $traderRole = $this->role('Trader '.uniqid());
        $trader = $this->user($traderRole, 'market-'.uniqid().'@example.test');

        $this->actingAs($trader)->withHeader('X-Inertia', 'true')->get('/market')
            ->assertOk()->assertJsonPath('component', 'Market/Market');

        $this->actingAs($trader)->withHeader('X-Inertia', 'true')->get('/workspace')
            ->assertOk()
            ->assertJsonPath('component', 'Dashboard/Dashboard')
            ->assertJsonPath('props.workspaceMode', true);

        $this->actingAs($trader)->get('/dashboard')->assertForbidden();

        $this->actingAs($trader)->getJson('/notifications/feed')
            ->assertOk()
            ->assertJsonStructure(['notifications', 'unread_notifications', 'alert_sound_enabled']);
    }

    public function test_admin_credentials_sign_in_only_through_admin_login(): void
    {
        $adminRole = $this->role('Operations '.uniqid(), true);
        $admin = $this->user($adminRole, 'admin-'.uniqid().'@example.test');

        $this->post('/login-save', ['email' => $admin->email, 'password' => 'password'])
            ->assertSessionHasErrors('message');
        $this->assertGuest();

        $this->post('/admin/login', ['email' => $admin->email, 'password' => 'password'])
            ->assertRedirect('dashboard');
        $this->assertAuthenticatedAs($admin);
    }

    public function test_permissions_are_database_backed_and_fail_closed(): void
    {
        $traderRole = $this->role('Users');
        $adminRole = $this->role('Support', true);
        $superRole = $this->role('Super Administrator', true, true);
        $moduleId = DB::table('adm_modules')->where('path', 'users')->value('id')
            ?: DB::table('adm_modules')->insertGetId(['name' => 'Users', 'path' => 'users', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('adm_privileges_roles')->insert([
            'id_adm_privileges' => $adminRole,
            'id_adm_modules' => $moduleId,
            'is_edit' => true,
        ]);

        $trader = $this->user($traderRole, 'trader@example.test');
        $admin = $this->user($adminRole, 'support@example.test');
        $superadmin = $this->user($superRole, 'super@example.test');

        $this->actingAs($trader)->withSession(['admin_is_superadmin' => true])->post('/_test/admin-edit')->assertForbidden();
        $this->actingAs($admin)->post('/_test/admin-edit')->assertOk();
        $this->actingAs($admin)->delete('/_test/admin-delete')->assertForbidden();
        $this->actingAs($superadmin)->delete('/_test/admin-delete')->assertOk();

        DB::table('adm_privileges')->where('id', $adminRole)->update(['is_admin' => false]);
        $this->actingAs($admin)->post('/_test/admin-edit')->assertForbidden();
    }

    private function role(string $name, bool $isAdmin = false, bool $isSuperadmin = false): int
    {
        return DB::table('adm_privileges')->insertGetId([
            'name' => $name, 'is_admin' => $isAdmin, 'is_superadmin' => $isSuperadmin,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function user(int $roleId, string $email): AdmUser
    {
        $id = DB::table('adm_users')->insertGetId([
            'name' => 'Test User', 'email' => $email, 'password' => Hash::make('password'),
            'id_adm_privileges' => $roleId, 'password_login_enabled' => true,
            'status' => 'ACTIVE', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return AdmUser::findOrFail($id);
    }
}
