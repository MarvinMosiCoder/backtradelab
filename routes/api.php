<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\MenusController;
use App\Http\Controllers\Admin\AdminUsersController;
use App\Http\Controllers\MarketDataController;
/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/
Route::apiResource('getSidebar', AdminUsersController::class);

Route::apiResource('postAddSave', AdminUsersController::class);
Route::get('/market-symbol-options', [MarketDataController::class, 'availableSymbols']);
Route::get('/klines', [MarketDataController::class, 'klines']);
Route::middleware(['auth:sanctum', 'account.active'])->get('/user', function (Request $request) {
    return $request->user();
});
