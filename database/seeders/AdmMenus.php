<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AdmMenus extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run() {
        self::submasterMenu();
        self::mainMenu();
    }

    public function submasterMenu() {
     
    }

    public function mainMenu() {
        DB::table('adm_menuses')->updateOrInsert(
            [
                'name'              => 'Dashboard',
            ],
            [
                'name'              => 'Dashboard',
                'type'              => 'Route',
                'path'              => 'Dashboard\DashboardControllerGetIndex',
                'slug'              => 'dashboard',
                'color'             => NULL,
                'icon'              => 'fa fa-dashboard',
                'parent_id'         => 0,
                'is_active'         => 1,
                'is_dashboard'      => 1,
                'id_adm_privileges'  => 1,
                'sorting'           => 1
            ]
        );

        DB::table('adm_menuses')->updateOrInsert(
            [
                'name'              => 'Market',
            ],
            [
                'name'              => 'Market',
                'type'              => 'Route',
                'path'              => 'market',
                'slug'              => 'market',
                'color'             => NULL,
                'icon'              => 'fa fa-chart-bar',
                'parent_id'         => 0,
                'is_active'         => 1,
                'is_dashboard'      => 1,
                'id_adm_privileges' => 1,
                'sorting'           => 1
            ]
        );

        
        DB::table('adm_menuses')->updateOrInsert(
            [
                'name'              => 'PNL',
            ],
            [
                'name'              => 'PNL',
                'type'              => 'Route',
                'path'              => 'trade-report',
                'slug'              => 'trade-report',
                'color'             => NULL,
                'icon'              => 'fa fa-percentage',
                'parent_id'         => 0,
                'is_active'         => 1,
                'is_dashboard'      => 1,
                'id_adm_privileges' => 1,
                'sorting'           => 1
            ]
        );

    }

}