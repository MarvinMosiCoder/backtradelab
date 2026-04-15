<?php
use App\Helpers\CommonHelpers;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\ResetPasswordController;
use App\Http\Controllers\Admin\MenusController;
use App\Http\Controllers\Admin\ModulsController;
use App\Http\Controllers\Admin\AdminUsersController;
use App\Http\Controllers\Admin\PrivilegesController;
use App\Http\Controllers\Admin\AnnouncementsController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\NotificationsController;
use App\Http\Controllers\Admin\AdmRequestController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\Users\ChangePasswordController;
use App\Http\Controllers\Users\ProfilePageController;
use App\Http\Controllers\Users\ForceChangePasswordController;
use App\Http\Controllers\Admin\AdminApiController;
use Inertia\Inertia; 
/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/', [LoginController::class, 'index']);
Route::get('login', [LoginController::class, 'index'])->name('login');
Route::get('/reset_password', [ResetPasswordController::class, 'getIndex'])->name('reset_password');
Route::post('/send_resetpass_email',[ResetPasswordController::class, 'sendResetPasswordInstructions']);
Route::get('/reset_password_email/{email}', [ResetPasswordController::class, 'getResetIndex'])->name('reset_password_email');
Route::post('/send_resetpass_email/reset',[ResetPasswordController::class, 'resetPassword']);
Route::post('login-save', [LoginController::class, 'authenticate'])->name('login-save');
Route::get('/appname', [SettingsController::class, 'getAppname'])->name('app-name');
Route::get('/applogo', [SettingsController::class, 'getApplogo'])->name('app-logo');
Route::get('/login-details', [SettingsController::class, 'getLoginDetails'])->name('app-login-details');

Route::group(['middleware' => ['auth','web']], function () {
    Route::post('/check-password', [ForceChangePasswordController::class, 'checkPassword'])->name('check-current-password');
    Route::get('change-password', [ForceChangePasswordController::class, 'showChangeForcePasswordForm'])->name('show-change-force-password');
    Route::post('/save-change-password', [ForceChangePasswordController::class, 'postUpdatePassword'])->name('update_password');
    Route::post('/check-waive', [ForceChangePasswordController::class, 'checkWaive'])->name('check-waive-count');
    Route::post('/waive-change-password',[ForceChangePasswordController::class, 'waiveChangePassword'])->name('waive-change-password');
    
    //ANNOUNCEMENT
    Route::get('unread-announcement', [AnnouncementsController::class, 'getUnreadAnnouncements'])->name('show-announcement');
    Route::post('read-announcement', [AnnouncementsController::class, 'markAnnouncementAsRead'])->name('read-announcement');
    Route::get('announcement', [AnnouncementsController::class, 'getAnnouncements'])->name('announcement');
    Route::get('announcement/add-announcement', [AnnouncementsController::class, 'addAnnouncementForm'])->name('add-announcement');
    Route::post('announcement/SaveAnnouncement', [AnnouncementsController::class, 'saveAnnouncement'])->name('announcement/SaveAnnouncement');
    Route::get('announcement/edit-announcement/{id}', [AnnouncementsController::class, 'editAnnouncement'])->name('edit-announcement');
    Route::post('announcement/saveEditAnnouncement', [AnnouncementsController::class, 'saveEditAnnouncement'])->name('saveEditAnnouncement');
});

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('/logout', [LoginController::class, 'logout']);
    Route::get('/sidebar', [MenusController::class, 'sidebarMenu'])->name('sidebar');
    //USERS
    Route::post('create-user', [AdminUsersController::class, 'postAddSave'])->name('create-user');
    Route::post('/postAddSave', [AdminUsersController::class, 'postAddSave'])->name('postAddSave');
    Route::post('/postEditSave', [AdminUsersController::class, 'postEditSave'])->name('postEditSave');
    Route::post('/deactivate-users', [AdminUsersController::class, 'setStatus'])->name('postDeactivateUsers');
    //PROFILE PAGE
    Route::get('/profile', [ProfilePageController::class, 'getIndex'])->name('profile_page');
    Route::post('/save-edit-image', [ProfilePageController::class, 'saveEditImage'])->name('save-edit-image');
    Route::get('/profiles', [ProfilePageController::class, 'getProfiles'])->name('get-profiles');
    Route::post('/update-profile', [ProfilePageController::class, 'updateProfile'])->name('update-profile');
    Route::post('/update-theme', [ProfilePageController::class, 'updateTheme'])->name('update-theme');
    //CHANGE PASSWORD
    Route::get('/change_password', [ChangePasswordController::class, 'getIndex'])->name('change_password');
    Route::post('/postChangePassword', [AdminUsersController::class, 'postUpdatePassword'])-> name('postChangePassword');
    //PRIVILEGES
    Route::get('privileges/create-privileges', [PrivilegesController::class, 'createPrivilegesView'])->name('create-privileges');
    Route::get('privileges/edit-privileges/{id}', [PrivilegesController::class, 'getEdit'])->name('edit-privileges');
    Route::post('/privilege/postAddSave', [PrivilegesController::class, 'postAddSave'])->name('postAddSave');
    Route::post('/privilege/postEditSave', [PrivilegesController::class, 'postEditSave'])->name('postEditSave');
 
    //MODULES
    Route::get('create-modules', [ModulsController::class, 'getAddModuls'])->name('create-modules');
    Route::post('/module_generator/postAddSave', [ModulsController::class, 'postAddSave'])->name('postAddSave');
    Route::get('/tables', [ModulsController::class, 'getTableNames']);
    
    //MENUS
    Route::prefix('menu_management')->group(function () {
        Route::post('/create_menu', [MenusController::class, 'createMenu']);
        Route::post('/update_menu', [MenusController::class, 'updateMenu']);
        Route::post('/auto_update_menu', [MenusController::class, 'autoUpdateMenu']);
        Route::get('/edit/{menu}', [MenusController::class, 'editMenu']);
        Route::post('/set-status-menus', [MenusController::class, 'postStatusSave'])->name('deleteMenus');
    });

      // API GENERATOR
      Route::prefix('api_generator')->group(function () {
        //API Requests
        Route::post('/generate_key', [AdminApiController::class, 'createKey']);
        //API Key Generation
        Route::post('/deactivate_key/{id}', [AdminApiController::class, 'deactivateKey']);
        Route::post('/activate_key/{id}', [AdminApiController::class, 'activateKey']);
        Route::post('/delete_key/{id}', [AdminApiController::class, 'deleteKey']);
        //API Create Generation
        Route::get('/create_api_view', [AdminApiController::class, 'createApiView']);
        Route::post('/create_api', [AdminApiController::class, 'createApi']);
        //API Edit
        Route::get('/edit/{id}', [AdminApiController::class, 'editApi']);
        Route::post('/update_api', [AdminApiController::class, 'updateApi']);
        //VIEW API
        Route::get('/view/{id}', [AdminApiController::class, 'viewApi']);
        //BULK ACTIONS
        Route::post('/bulk_action', [AdminApiController::class, 'bulkActions']);
    });
  
    //Settings
    Route::post('/settings/postSave', [SettingsController::class, 'postSave'])->name('settings-post-save');
    Route::post('/settings/postDelete', [SettingsController::class, 'postDelete'])->name('settings-post-delete');
    
    //NOTIFICATION
    Route::get('/notifications', [NotificationsController::class, 'getLatestNotif'])->name('latest-notif');
    Route::post('/notifications/read', [NotificationsController::class, 'markAsRead'])->name('notification-read');
    Route::get('/notifications/view-notification/{id}', [NotificationsController::class, 'viewNotification'])->name('view-notification');
    Route::get('/notifications/view-all-notifications', [NotificationsController::class, 'viewAllNotification'])->name('view-all-notifications');
    //FILTER
    Route::get('/filter/privileges', [AdmRequestController::class, 'privilegesFilter'])->name('privileges-filter');
    Route::get('/filter/users', [AdmRequestController::class, 'usersFilter'])->name('users-filter');
    Route::post('/filter/filter-data', [AdmRequestController::class, 'usersFilterData'])->name('filter-data');
    //EXPORT
    Route::post('/request/export', [AdmRequestController::class, 'export'])->name('export');
});

Route::group([
    'middleware' => ['auth','check.user'],
    'prefix' => config('adm_url.ADMIN_PATH'),
    'namespace' => 'App\Http\Controllers',
], function () {
   
    // Todo: change table
    $modules = [];
    try {
        $modules = DB::table('adm_modules')->whereIn('controller', CommonHelpers::getOthersControllerFiles())->get();
    } catch (\Exception $e) {
        Log::error("Load adm moduls is failed. Caused = " . $e->getMessage());
    }

    foreach ($modules as $v) {
        if (@$v->path && @$v->controller) {
            try {
                CommonHelpers::routeOtherController($v->path, $v->controller, 'app\Http\Controllers');
            } catch (\Exception $e) {
                Log::error("Path = ".$v->path."\nController = ".$v->controller."\nError = ".$e->getMessage());
            }
        }
    }
})->middleware('auth');

//ADMIN ROUTE
Route::group([
    'middleware' => ['auth','check.user'],
    'prefix' => config('ad_url.ADMIN_PATH'),
    'namespace' => 'App\Http\Controllers\Admin',
], function () {
   
    // Todo: change table
    if (request()->is(config('ad_url.ADMIN_PATH'))) {
        $menus = DB::table('adm_menuses')->where('is_dashboard', 1)->first();
        if ($menus) {
            Route::get('/', 'Dashboard\DashboardContentGetIndex');
        } else {
            CommonHelpers::routeController('/', 'AdminController', 'App\Http\Controllers\Admin');
        }
    }

    // Todo: change table
    $modules = [];
    try {
        $modules = DB::table('adm_modules')->whereIn('controller', CommonHelpers::getMainControllerFiles())->get();
    } catch (\Exception $e) {
        Log::error("Load ad moduls is failed. Caused = " . $e->getMessage());
    }

    foreach ($modules as $v) {
        if (@$v->path && @$v->controller) {
            try {
                CommonHelpers::routeController($v->path, $v->controller, 'app\Http\Controllers\Admin');
            } catch (\Exception $e) {
                Log::error("Path = ".$v->path."\nController = ".$v->controller."\nError = ".$e->getMessage());
            }
        }
    }
})->middleware('auth');