<?php

namespace App\Http\Controllers\Dashboard;

use App\Helpers\CommonHelpers;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{

    public function getIndex(): Response
    {
        $data = [];
        $sidebarMenus = CommonHelpers::sidebarMenu();
        return Inertia::render('Dashboard/Dashboard', [
            'menus' => $sidebarMenus
        ]);
    }
}
