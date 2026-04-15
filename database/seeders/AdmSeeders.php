<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AdmSeeders extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        if (DB::table('adm_privileges_roles')->count() == 0) {
            $modules = DB::table('adm_modules')->get();
            $i = 1;
            foreach ($modules as $module) {

                $is_visible = 1;
                $is_create = 1;
                $is_read = 1;
                $is_edit = 1;
                $is_delete = 1;
                $is_void = 1;
                $is_override = 1;

                switch ($module->table_name) {
                    case 'adm_logs':
                        $is_create = 0;
                        $is_edit = 0;
                        break;
                    case 'adm_privileges_roles':
                        $is_visible = 0;
                        break;
                    case 'adm_apicustom':
                        $is_visible = 0;
                        break;
                    case 'adm_notifications':
                        $is_create = $is_read = $is_edit = $is_delete = 0;
                        break;
                }

                DB::table('adm_privileges_roles')->insert([
                    'created_at' => date('Y-m-d H:i:s'),
                    'is_visible' => $is_visible,
                    'is_create' => $is_create,
                    'is_edit' => $is_edit,
                    'is_delete' => $is_delete,
                    'is_read' => $is_read,
                    'is_void' => $is_void,
                    'is_override' => $is_override,
                    'id_adm_privileges' => 1,
                    'id_adm_modules' => $module->id,
                ]);
                $i++;
            }
        }
    }
}