<?php

namespace App\Http\Controllers\Auth;

use app\Helpers\CommonHelpers;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Providers\AppServiceProvider;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Inertia\Inertia;
use Inertia\Response;
use DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
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
            return redirect()->intended('dashboard');
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
        $users = DB::table("adm_users")->where("email", $credentials['email'])->first();
       
        if(!$users){
            $error = 'The provided credentials do not match our records!';
            return redirect('login')->withErrors(['message' => $error]);
        }
        
        $session_details = self::getOtherSessionDetails($users->id_adm_privileges);

        if(!$session_details){
            $error = 'No privilege set! Please contact Administrator!';
            return redirect('login')->withErrors(['message' => $error]);
        }

        if($users->status == 0 || $users->status == 'INACTIVE'){
            $accDeact = "Account Doesn't Exist/Deactivated";
            Session::flush();
            return redirect('login')->withErrors(['message'=>$accDeact]);
        }

        if (Auth::attempt($credentials)) {
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
            
            $today = Carbon::now();
            $lastChangePass = Carbon::parse($users->last_password_updated);
            $needsPasswordChange = \Hash::check('qwerty', $users->password) || $lastChangePass->diffInMonths($today) > 3;
            if($needsPasswordChange){
                Log::debug("message: {$needsPasswordChange}");
                Session::put('check_user',true);
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

            return redirect()->intended('dashboard');
        }
        return back()->withErrors([
            'email' => 'The provided credentials do not match our records',
            'password' => 'Incorrect email or password'
        ])->onlyInput(['email', 'password']);
    }

    public function getOtherSessionDetails($id){
        $data = [];
        $data['profile'] = DB::table('adm_user_profiles')->where('adm_user_id',$id)->whereNull('archived')->first();
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
