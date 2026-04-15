<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AdminSidebarMenuses extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run() {
        self::menus();
    }

    public function menus() {
        $data = [
            [
                'name'              => 'Privileges',
                'type'              => 'Route',
                'slug'              => 'privileges',
                'color'             => NULL,
                'icon'              => 'fa fa-crown',
                'parent_id'         => 0,
                'is_active'         => 1,
                'sorting'           => 0,
                'created_at'        => date('Y-m-d H:i:s')
            ],
            [
                'name'              => 'Users Management',
                'type'              => 'Route',
                'slug'              => 'users',
                'color'             => NULL,
                'icon'              => 'fa fa-users',
                'parent_id'         => 0,
                'is_active'         => 1,
                'sorting'           => 2,
                'created_at'        => date('Y-m-d H:i:s')
            ],
            [
                'name'              => 'Menu Management',
                'type'              => 'Route',
                'slug'              => 'menu_management',
                'color'             => NULL,
                'icon'              => 'fa fa-bars',
                'parent_id'         => 0,
                'is_active'         => 1,
                'sorting'           => 3,
                'created_at'        => date('Y-m-d H:i:s')
            ],
            [
                'name'              => 'Module Generator',
                'type'              => 'Route',
                'slug'              => 'module_generator',
                'color'             => NULL,
                'icon'              => 'fa fa-th',
                'parent_id'         => 0,
                'is_active'         => 1,
                'sorting'           => 4,
                'created_at'        => date('Y-m-d H:i:s')
            ],
            [
                'name'              => 'API Generator',
                'type'              => 'Route',
                'slug'              => 'api_generator',
                'color'             => NULL,
                'icon'              => 'fa fa-code-merge',
                'parent_id'         => 0,
                'is_active'         => 1,
                'sorting'           => 5,
                'created_at'        => date('Y-m-d H:i:s')
            ],
            [
                'name'              => 'Admin Settings',
                'type'              => 'URL',
                'slug'              => 'adm_settings',
                'color'             => NULL,
                'icon'              => 'fa fa-cogs',
                'parent_id'         => 0,
                'is_active'         => 1,
                'sorting'           => 6,
                'created_at'        => date('Y-m-d H:i:s')
            ],
            [
                'name'              => 'App Settings',
                'type'              => 'Route',
                'slug'              => 'settings',
                'color'             => NULL,
                'icon'              => 'fa fa-cogs',
                'parent_id'         => 6,
                'is_active'         => 1,
                'sorting'           => 1,
                'created_at'        => date('Y-m-d H:i:s')
            ],
            [
                'name'              => 'Announcements',
                'type'              => 'Route',
                'slug'              => 'announcements',
                'color'             => NULL,
                'icon'              => 'fa fa-info-circle',
                'parent_id'         => 6,
                'is_active'         => 1,
                'sorting'           => 2,
                'created_at'        => date('Y-m-d H:i:s')
            ],
            [
                'name'              => 'Notifications',
                'type'              => 'Route',
                'slug'              => 'notifications',
                'color'             => NULL,
                'icon'              => 'fa fa-bell',
                'parent_id'         => 6,
                'is_active'         => 1,
                'sorting'           => 3,
                'created_at'        => date('Y-m-d H:i:s')
            ],
            [
                'name'              => 'Log User Access',
                'type'              => 'Route',
                'slug'              => 'logs',
                'color'             => NULL,
                'icon'              => 'fa fa-history',
                'parent_id'         => 0,
                'is_active'         => 1,
                'sorting'           => 7,
                'created_at'        => date('Y-m-d H:i:s')
            ],
            [
                'name'              => 'Module Activity History',
                'type'              => 'Route',
                'slug'              => 'module_activity_history',
                'color'             => NULL,
                'icon'              => 'fa fa-history',
                'parent_id'         => 0,
                'is_active'         => 1,
                'sorting'           => 8,
                'created_at'        => date('Y-m-d H:i:s')
            ],
            [
                'name'              => 'System Error Logs',
                'type'              => 'Route',
                'slug'              => 'system_error_logs',
                'color'             => NULL,
                'icon'              => 'fa fa-history',
                'parent_id'         => 0,
                'is_active'         => 1,
                'sorting'           => 9,
                'created_at'        => date('Y-m-d H:i:s')
            ],
        ];
        foreach ($data as $indexmenu) {
            DB::table('adm_admin_menuses')->updateOrInsert(['name' => $indexmenu['name']], $indexmenu);
        }
    }

}