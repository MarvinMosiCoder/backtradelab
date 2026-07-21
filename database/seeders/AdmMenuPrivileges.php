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

        $workspaceId = DB::table('adm_menuses')->where('name', 'Workspace Chart')->value('id');
        $superadminIds = DB::table('adm_privileges')->where('is_superadmin', 1)->pluck('id');
        foreach ($superadminIds as $privilegeId) {
            DB::table('adm_menus_privileges')->updateOrInsert([
                'id_adm_menus' => $workspaceId,
                'id_adm_privileges' => $privilegeId,
            ]);
        }
    }
}
