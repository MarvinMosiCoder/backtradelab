<?php

namespace App\Http\Controllers\Dashboard;

use App\Helpers\CommonHelpers;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\AdmUser;

class DashboardController extends Controller
{

    public function index(): Response
    {
        $sidebarMenus = CommonHelpers::sidebarMenu();
        $totalUsers = AdmUser::query()->count();
        $activeUsers = AdmUser::query()->where(function ($query) {
            $query->whereRaw('UPPER(status) = ?', ['ACTIVE'])->orWhere('status', 1);
        })->count();

        return Inertia::render('Dashboard/Dashboard', [
            'menus' => $sidebarMenus,
            'userMetrics' => [
                'total' => $totalUsers,
                'active' => $activeUsers,
                'inactive' => max($totalUsers - $activeUsers, 0),
                'newThisMonth' => AdmUser::query()->where('created_at', '>=', now()->startOfMonth())->count(),
            ],
        ]);
    }

    public function getIndex(): Response
    {
        return $this->index();
    }
}
