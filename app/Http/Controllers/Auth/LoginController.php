<?php

namespace App\Http\Controllers\Auth;

use app\Helpers\CommonHelpers;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\AdmUser;
use App\Providers\AppServiceProvider;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Laravel\Socialite\Facades\Socialite;
use Inertia\Inertia;
use Inertia\Response;
use DB;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Models\Announcement;
use App\Models\AdmModels\AdmSettings;
use App\Models\AdmModels\AdmAdminMenus;
use App\Models\AdmModels\AdmMenus;
use App\Models\AdmModels\admMenusPrivileges;

class LoginController extends Controller
{
    /**
     * Display the login view.
     */
    public function index()
    {
        if(auth()->check()){
            return redirect()->intended($this->loginDestination());
        }
        return Inertia::render('Auth/Login');
    }

    /**
     * Handle an incoming authentication request.
     */
    public function authenticate(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);
        $users = AdmUser::where("email", $credentials['email'])->first();
       
        [$error, $session_details] = $this->validateLoginUser($users);
        if($error){
            return redirect('login')->withErrors(['message' => $error]);
        }

        if ($users && $users->password_login_enabled === false) {
            $providerName = ucfirst($users->social_provider ?: 'social');
            return redirect('login')->withErrors([
                'message' => "This account currently uses {$providerName} sign-in. Sign in with {$providerName}, then create a local password from Profile → Change password if you want email/password access.",
            ])->onlyInput('email');
        }

        if (Auth::attempt($credentials)) {
            $this->completeLogin($request, Auth::user(), $session_details);
            return redirect()->intended($this->loginDestination($session_details));
        }
        return back()->withErrors([
            'email' => 'The provided credentials do not match our records',
            'password' => 'Incorrect email or password'
        ])->onlyInput(['email', 'password']);
    }

    public function redirectToProvider(string $provider)
    {
        $driver = Socialite::driver($provider);

        if ($provider === 'google') {
            $driver->with(['prompt' => 'select_account']);
        }

        return $driver->redirect();
    }

    public function handleProviderCallback(Request $request, string $provider): RedirectResponse
    {
        try {
            $socialUser = Socialite::driver($provider)->user();
        } catch (Exception $exception) {
            Log::warning('Social login callback failed', [
                'provider' => $provider,
                'message' => $exception->getMessage(),
            ]);

            return redirect('login')->withErrors([
                'message' => 'Unable to sign in with '.ucfirst($provider).'. Please try again.',
            ]);
        }

        $email = $socialUser->getEmail();
        if(!$email){
            return redirect('login')->withErrors([
                'message' => ucfirst($provider).' did not return an email address. Please use an account with a verified email.',
            ]);
        }

        $providerId = (string) $socialUser->getId();
        $users = AdmUser::where(function ($query) use ($provider, $providerId, $email) {
            $query->where(function ($identityQuery) use ($provider, $providerId) {
                $identityQuery->where('social_provider', $provider)
                    ->where('social_provider_id', $providerId);
            })->orWhere('email', $email);
        })->first();

        if (!$users) {
            $defaultPrivilegeId = DB::table('adm_privileges')
                ->where(function ($query) {
                    $query->where('is_superadmin', 0)->orWhereNull('is_superadmin');
                })
                ->orderBy('id')
                ->value('id');

            if (!$defaultPrivilegeId) {
                Log::error('Social account creation failed: no non-superadmin privilege exists', [
                    'provider' => $provider,
                    'email' => $email,
                ]);

                return redirect('login')->withErrors([
                    'message' => 'Unable to create your account because no trader role is configured. Please contact Administrator!',
                ]);
            }

            $userId = DB::table('adm_users')->insertGetId([
                'name' => $socialUser->getName() ?: Str::before($email, '@'),
                'email' => $email,
                'email_verified_at' => now(),
                'password' => Hash::make(Str::random(64)),
                'id_adm_privileges' => $defaultPrivilegeId,
                'status' => 'ACTIVE',
                'social_provider' => $provider,
                'social_provider_id' => $providerId,
                'password_login_enabled' => false,
                'replay_trial_started_at' => now(),
                'replay_trial_ends_at' => now()->addDays(7),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $users = AdmUser::findOrFail($userId);
        }

        [$error, $session_details] = $this->validateLoginUser($users);
        if($error){
            return redirect('login')->withErrors([
                'message' => $error,
            ]);
        }

        $usesTemporaryPassword = \Hash::check('qwerty', $users->password);
        $users->forceFill([
            'social_provider' => $provider,
            'social_provider_id' => $providerId,
            'password_login_enabled' => $usesTemporaryPassword ? false : (bool) $users->password_login_enabled,
        ])->save();

        Auth::login($users);
        $this->completeLogin($request, $users, $session_details, true);

        return redirect()->intended($this->loginDestination($session_details));
    }

    private function loginDestination(?array $sessionDetails = null): string
    {
        $isSuperadmin = $sessionDetails
            ? (bool) $sessionDetails['priv']->is_superadmin
            : (bool) session('admin_is_superadmin');

        return $isSuperadmin ? 'dashboard' : 'market';
    }

    private function validateLoginUser($users): array
    {
        if(!$users){
            return ['The provided credentials do not match our records!', null];
        }

        $session_details = self::getOtherSessionDetails($users->id_adm_privileges, $users->id);

        if(!$session_details['priv']){
            return ['No privilege set! Please contact Administrator!', null];
        }

        if($users->status == 0 || $users->status == 'INACTIVE'){
            Session::flush();
            return ["Account Doesn't Exist/Deactivated", null];
        }

        return [null, $session_details];
    }

    private function completeLogin(Request $request, AdmUser $users, array $session_details, bool $isSocialLogin = false): void
    {
        $request->session()->regenerate();
        $menus_privileges = admMenusPrivileges::where('id_adm_privileges',  $session_details['priv']->id)
            ->pluck('id_adm_menus');

        $menus = AdmMenus::with([
            'children' => function ($query) use ($menus_privileges) {
                $query->whereIn('id', $menus_privileges)
                ->where('is_active', 1)
                ->orderBy('sorting');
            }
        ])
            ->whereIn('id', $menus_privileges)
            ->where('parent_id', 0)
            ->where('is_active', 1)
            ->orderBy('sorting')
            ->get();

        $admin_menus = AdmAdminMenus::with([
            'children' => function ($query)  {
                $query->orderBy('sorting');
            }
        ])
            ->where('parent_id', 0)
            ->where('is_active', 1)
            ->orderBy('sorting')
            ->get();

        Session::put('user_menus', $menus);
        Session::put('admin_menus', $admin_menus);

        Session::put('admin_id', $users->id);
        Session::put('admin_is_superadmin', $session_details['priv']->is_superadmin);
        Session::put("admin_privileges", $session_details['priv']->id);
        Session::put('admin_privileges_roles', $session_details['roles']);
        Session::put('theme_color', $session_details['priv']->theme_color);
        Session::put('dark_theme', $users->theme ?? NULL);
        Session::put('profile', $session_details['profile']->file_name ?? NULL);
        CommonHelpers::insertLog(trans("adm_default.log_login", ['email' => $users->email, 'ip' => $request->server('REMOTE_ADDR')]));

        if(!$isSocialLogin){
            $today = Carbon::now();
            $lastChangePass = $users->last_password_updated ? Carbon::parse($users->last_password_updated) : null;
            $needsPasswordChange = \Hash::check('qwerty', $users->password) || !$lastChangePass || $lastChangePass->diffInMonths($today) > 3;
            if($needsPasswordChange){
                Log::debug("message: {$needsPasswordChange}");
                Session::put('check_user',true);
            }
        }

        $unreadAnnouncements = Announcement::whereDoesntHave('admUsers', function($query) use ($users) {
            $query->where('adm_user_id', $users->id);
        })->where('status','ACTIVE')->get();
        if($unreadAnnouncements->isNotEmpty()){
            Session::put('unread-announcement',true);
        }

        $exist = Auth::user()->notifications()->where('type', 'system users')->exists();
        if(!$exist){
            $appname = AdmSettings::where('name','appname')->pluck('content')->first() ?? 'Vram AT.';
            CommonHelpers::sendNotification([
                'content' => "Welcome to ".$appname." We're excited to have you here!.",
                'id_adm_users' => [$users->id],
                'type' => 'system users',
                'is_read' => 0,
                'to' => url('/')
            ]);
        }
    }

    public function getOtherSessionDetails($id, $userId = null){
        $data = [];
        $data['profile'] = DB::table('adm_user_profiles')->where('adm_user_id',$userId ?? $id)->whereNull('archived')->first();
        $data['priv'] = DB::table("adm_privileges")->where("id", $id)->first();
        $data['roles'] = DB::table('adm_privileges_roles')->where('id_adm_privileges', $id)->join('adm_modules', 'adm_modules.id', '=', 'id_adm_modules')->select('adm_modules.name', 'adm_modules.path', 'is_visible', 'is_create', 'is_read', 'is_edit', 'is_delete', 'is_void', 'is_override')->get();
		return $data;
    }

    public function logout(Request $request): RedirectResponse
    {
        CommonHelpers::insertLog(trans("adm_default.log_logout", ['email' => Auth::user()->email, 'ip' => $request->server('REMOTE_ADDR')]));
        Auth::logout();
        $request->session()->invalidate();
    
        $request->session()->regenerateToken();
        return redirect('login');
    }

    public function endSession(Request $request){

        Auth::logout();
    
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
