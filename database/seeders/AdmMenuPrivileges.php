<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AdmMenuPrivileges extends Seeder
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
                'id_adm_menus' => 1,
                'id_adm_privileges' => 1
            ]
        ];

        if (DB::table('adm_menus_privileges')->count() == 0) {
            DB::table('adm_menus_privileges')->insert($data);
        }
    }
}