<?php

namespace Database\Seeders;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([AdmSeeders::class]);
        $this->call([AdmModules::class]);
        $this->call([AdmMenus::class]);
        $this->call([AdmPrivileges::class]);
        $this->call([AdmMenuPrivileges::class]);
        $this->call([AdmUsersSeeders::class]);
        $this->call([AdminSidebarMenuses::class]);
    }
}
