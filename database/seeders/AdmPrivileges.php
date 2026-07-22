<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AdmPrivileges extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $data = [
            [
                'name' => 'Super Administrator',
                'is_admin' => 1,
                'is_superadmin' => 1,
                'theme_color'   => 'skin-blue',
                'created_at' => date('Y-m-d H:i:s'),
            ],
            [
                'name' => 'Users',
                'is_admin' => 0,
                'is_superadmin' => 0,
                'theme_color' => 'skin-blue',
                'created_at' => date('Y-m-d H:i:s'),
            ],
        ];

        foreach ($data as $priv) {
            DB::table('adm_privileges')->updateOrInsert(['name' => $priv['name']], $priv);
        }

    }
}
