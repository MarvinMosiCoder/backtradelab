<?php

use App\Helpers\CommonHelpers;
use App\Http\Controllers\Admin\AdminApiController;
use App\Http\Controllers\Admin\AdminUsersController;
use App\Http\Controllers\Admin\AdmRequestController;
use App\Http\Controllers\Admin\AnnouncementsController;
use App\Http\Controllers\Admin\MenusController;
use App\Http\Controllers\Admin\ModulsController;
use App\Http\Controllers\Admin\NotificationsController;
use App\Http\Controllers\Admin\PrivilegesController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\ResetPasswordController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\MarketBacktestController;
use App\Http\Controllers\MarketDrawingController;
use App\Http\Controllers\MarketDataController;
use App\Http\Controllers\MarketReplayProgressController;
use App\Http\Controllers\MarketToolSettingController;
use App\Http\Controllers\MarketPriceAlertController;
use App\Http\Controllers\ReplayAccessController;
use App\Http\Controllers\UserFeedbackController;
use App\Http\Controllers\Users\ChangePasswordController;
use App\Http\Controllers\Users\ForceChangePasswordController;
use App\Http\Controllers\Users\ProfilePageController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
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

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->intended(session('admin_is_superadmin') ? 'dashboard' : 'market');
    }

    return Inertia::render('Public/Home');
})->name('home');
Route::get('login', [LoginController::class, 'index'])->name('login');
Route::get('/reset_password', [ResetPasswordController::class, 'getIndex'])->name('reset_password');
Route::post('/send_resetpass_email', [ResetPasswordController::class, 'sendResetPasswordInstructions']);
Route::get('/reset_password_email/{email}', [ResetPasswordController::class, 'getResetIndex'])->name('reset_password_email');
Route::post('/send_resetpass_email/reset', [ResetPasswordController::class, 'resetPassword']);
Route::post('login-save', [LoginController::class, 'authenticate'])->name('login-save');
Route::get('/auth/{provider}/redirect', [LoginController::class, 'redirectToProvider'])
    ->whereIn('provider', ['google', 'facebook'])
    ->name('social.redirect');
Route::get('/auth/{provider}/callback', [LoginController::class, 'handleProviderCallback'])
    ->whereIn('provider', ['google', 'facebook'])
    ->name('social.callback');
Route::get('/appname', [SettingsController::class, 'getAppname'])->name('app-name');
Route::get('/applogo', [SettingsController::class, 'getApplogo'])->name('app-logo');
Route::get('/login-details', [SettingsController::class, 'getLoginDetails'])->name('app-login-details');

Route::group(['middleware' => ['auth', 'web']], function () {
    Route::post('/check-password', [ForceChangePasswordController::class, 'checkPassword'])->name('check-current-password');
    Route::get('change-password', [ForceChangePasswordController::class, 'showChangeForcePasswordForm'])->name('show-change-force-password');
    Route::post('/save-change-password', [ForceChangePasswordController::class, 'postUpdatePassword'])->name('update_password');
    Route::post('/check-waive', [ForceChangePasswordController::class, 'checkWaive'])->name('check-waive-count');
    Route::post('/waive-change-password', [ForceChangePasswordController::class, 'waiveChangePassword'])->name('waive-change-password');

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
    Route::get('market', function () {
        return Inertia::render('Market/Market');
    })->name('market');
    Route::get('trade-report', function () {
        return Inertia::render('Market/TradeReportPage');
    })->name('trade-report');
    Route::get('/help', fn () => Inertia::render('Help/Index'))->name('help');
    Route::get('/market-drawings', [MarketDrawingController::class, 'show'])->name('market-drawings.show');
    Route::get('/market-symbols', [MarketDataController::class, 'symbols'])->name('market-symbols.index');
    Route::post('/market-symbols', [MarketDataController::class, 'storeSymbol'])->middleware('throttle:market-write')->name('market-symbols.store');
    Route::delete('/market-symbols/{marketSymbol}', [MarketDataController::class, 'destroySymbol'])->middleware('throttle:market-write')->name('market-symbols.destroy');
    Route::put('/market-drawings', [MarketDrawingController::class, 'update'])->name('market-drawings.update');
    Route::get('/market-tool-settings', [MarketToolSettingController::class, 'show'])->name('market-tool-settings.show');
    Route::put('/market-tool-settings', [MarketToolSettingController::class, 'update'])->name('market-tool-settings.update');
    Route::get('/market-price-alerts', [MarketPriceAlertController::class, 'index']);
    Route::post('/market-price-alerts', [MarketPriceAlertController::class, 'store'])->middleware('throttle:market-write');
    Route::post('/market-price-alerts/check', [MarketPriceAlertController::class, 'check'])->middleware('throttle:market-write');
    Route::delete('/market-price-alerts/{marketPriceAlert}', [MarketPriceAlertController::class, 'destroy'])->middleware('throttle:market-write');
    Route::get('/replay-access', [ReplayAccessController::class, 'status']);
    Route::get('/subscription-plans', [ReplayAccessController::class, 'plans']);
    Route::get('/payment-settings', [ReplayAccessController::class, 'paymentSettings']);
    Route::get('/payment-settings/qr', [ReplayAccessController::class, 'paymentQr'])->name('payment-settings.qr');
    Route::get('/admin/payment-settings', [ReplayAccessController::class, 'adminPaymentSettingsPage'])->name('admin.payment-settings');
    Route::post('/admin/payment-settings', [ReplayAccessController::class, 'updatePaymentSettings'])->middleware('throttle:market-write');
    Route::put('/admin/subscription-plans', [ReplayAccessController::class, 'updatePlans'])->middleware('throttle:market-write');
    Route::get('/admin/subscription-plans', [ReplayAccessController::class, 'adminPlansPage'])->name('admin.subscription-plans');
    Route::get('/subscription', [ReplayAccessController::class, 'userPage'])->name('subscription.index');
    Route::post('/subscription-requests', [ReplayAccessController::class, 'store'])->middleware('throttle:market-write');
    Route::post('/subscription-conversations', [ReplayAccessController::class, 'startConversation'])->middleware('throttle:market-write');
    Route::get('/subscription-requests/{subscriptionRequest}/messages', [ReplayAccessController::class, 'messages']);
    Route::post('/subscription-requests/{subscriptionRequest}/messages', [ReplayAccessController::class, 'storeMessage'])->middleware('throttle:market-write');
    Route::get('/subscription-requests/{subscriptionRequest}/proof', [ReplayAccessController::class, 'proof'])->name('subscription.proof');
    Route::get('/subscription-messages/{subscriptionMessage}/attachment', [ReplayAccessController::class, 'messageAttachment'])->name('subscription.message-attachment');
    Route::post('/chart-tour/complete', [ReplayAccessController::class, 'completeTour'])->middleware('throttle:market-write');
    Route::get('/admin/subscriptions', [ReplayAccessController::class, 'adminPage']);
    Route::get('/admin/subscriptions/items', [ReplayAccessController::class, 'adminIndex']);
    Route::put('/admin/subscriptions/{subscriptionRequest}', [ReplayAccessController::class, 'review'])->middleware('throttle:market-write');
    Route::get('/feedback', [UserFeedbackController::class, 'userPage'])->name('feedback.index');
    Route::get('/feedback/items', [UserFeedbackController::class, 'index'])->name('feedback.items');
    Route::post('/feedback/items', [UserFeedbackController::class, 'store'])->middleware('throttle:feedback-write')->name('feedback.store');
    Route::get('/admin/feedback', [UserFeedbackController::class, 'adminPage'])->name('admin.feedback.index');
    Route::get('/admin/feedback/items', [UserFeedbackController::class, 'adminIndex'])->name('admin.feedback.items');
    Route::put('/admin/feedback/items/{feedback}', [UserFeedbackController::class, 'update'])->middleware('throttle:feedback-write')->name('admin.feedback.update');
    Route::get('/market-replay-progress', [MarketReplayProgressController::class, 'show'])->name('market-replay-progress.show');
    Route::put('/market-replay-progress', [MarketReplayProgressController::class, 'update'])->middleware('replay.access')->name('market-replay-progress.update');
    Route::get('/market-backtest/account', [MarketBacktestController::class, 'show'])->middleware(['replay.access', 'throttle:backtest-read'])->name('market-backtest.show');
    Route::get('/market-backtest/report', [MarketBacktestController::class, 'report'])->middleware('throttle:backtest-read')->name('market-backtest.report');
    Route::get('/market-backtest/report/export', [MarketBacktestController::class, 'exportReport'])->middleware('throttle:backtest-heavy')->name('market-backtest.report.export');
    Route::post('/market-backtest/reset', [MarketBacktestController::class, 'reset'])->middleware(['replay.access', 'throttle:backtest-heavy'])->name('market-backtest.reset');
    Route::post('/market-backtest/sessions', [MarketBacktestController::class, 'startSession'])->middleware(['replay.access', 'throttle:backtest-write'])->name('market-backtest.sessions.start');
    Route::post('/market-backtest/sessions/{session}/end', [MarketBacktestController::class, 'endSession'])->middleware(['replay.access', 'throttle:backtest-write'])->name('market-backtest.sessions.end');
    Route::post('/market-backtest/positions', [MarketBacktestController::class, 'openPosition'])->middleware(['replay.access', 'throttle:backtest-write'])->name('market-backtest.positions.open');
    Route::put('/market-backtest/positions/{position}/risk', [MarketBacktestController::class, 'updatePositionRisk'])->middleware(['replay.access', 'throttle:backtest-write'])->name('market-backtest.positions.risk');
    Route::post('/market-backtest/positions/{position}/trigger', [MarketBacktestController::class, 'triggerPosition'])->middleware(['replay.access', 'throttle:backtest-write'])->name('market-backtest.positions.trigger');
    Route::post('/market-backtest/positions/{position}/cancel', [MarketBacktestController::class, 'cancelPosition'])->middleware(['replay.access', 'throttle:backtest-write'])->name('market-backtest.positions.cancel');
    Route::post('/market-backtest/positions/{position}/close', [MarketBacktestController::class, 'closePosition'])->middleware(['replay.access', 'throttle:backtest-write'])->name('market-backtest.positions.close');
    Route::post('/market-backtest/positions/{position}/snapshot', [MarketBacktestController::class, 'uploadPositionSnapshot'])->middleware(['replay.access', 'throttle:backtest-heavy'])->name('market-backtest.positions.snapshot');
    Route::put('/market-backtest/trades/{position}/journal', [MarketBacktestController::class, 'updateTradeJournal'])->middleware('throttle:backtest-write')->name('market-backtest.trades.journal');
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
    Route::put('/profile/details', [ProfilePageController::class, 'updateDetails'])->name('profile.details.update');
    Route::post('/update-theme', [ProfilePageController::class, 'updateTheme'])->name('update-theme');
    //CHANGE PASSWORD
    Route::get('/change_password', [ChangePasswordController::class, 'getIndex'])->name('change_password');
    Route::post('/postChangePassword', [AdminUsersController::class, 'postUpdatePassword'])->name('postChangePassword');
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
    'middleware' => ['auth', 'check.user'],
    'prefix' => config('adm_url.ADMIN_PATH'),
    'namespace' => 'App\Http\Controllers',
], function () {

    // Todo: change table
    $modules = [];
    try {
        $modules = DB::table('adm_modules')->whereIn('controller', CommonHelpers::getOthersControllerFiles())->get();
    } catch (\Exception $e) {
        Log::error('Load adm moduls is failed. Caused = '.$e->getMessage());
    }

    foreach ($modules as $v) {
        if (@$v->path && @$v->controller) {
            try {
                CommonHelpers::routeOtherController($v->path, $v->controller, 'app\Http\Controllers');
            } catch (\Exception $e) {
                Log::error('Path = '.$v->path."\nController = ".$v->controller."\nError = ".$e->getMessage());
            }
        }
    }
})->middleware('auth');

//ADMIN ROUTE
Route::group([
    'middleware' => ['auth', 'check.user'],
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
        Log::error('Load ad moduls is failed. Caused = '.$e->getMessage());
    }

    foreach ($modules as $v) {
        if (@$v->path && @$v->controller) {
            try {
                CommonHelpers::routeController($v->path, $v->controller, 'app\Http\Controllers\Admin');
            } catch (\Exception $e) {
                Log::error('Path = '.$v->path."\nController = ".$v->controller."\nError = ".$e->getMessage());
            }
        }
    }
})->middleware('auth');
