<?php

namespace App\Http\Controllers\Admin;
use App\Helpers\CommonHelpers;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use DB;
use App\Models\AdmModels\AdmModules;
use App\Models\AdmModels\AdmMenus;
use App\Models\AdmModels\admMenusPrivileges;
use File;
use Inertia\Inertia;
use Inertia\Response;

class ModulsController extends Controller{

    private $table_name;
    private $primary_key;
    private $sortBy;
    private $sortDir;
    private $perPage;
    public function __construct() {
        $this->table_name  = 'adm_modules';
        $this->primary_key = 'id';
        $this->sortBy = request()->get('sortBy', 'adm_modules.created_at');
        $this->sortDir = request()->get('sortDir', 'desc');
        $this->perPage = request()->get('perPage', 10);
    }

    public function getIndex(){
        $query = AdmModules::getData();
        $query->when(request('search'), function ($query, $search) {
            $query->where('adm_modules.name', 'LIKE', "%$search%");
        });
        $modules = $query->orderBy($this->sortBy, $this->sortDir)->paginate($this->perPage)->withQueryString();
        
        return Inertia::render('AdmVram/Modules', [
            'modules' => Inertia::always($modules),
            'queryParams' => request()->query()
        ]);
    }
    
    public function postAddSave(Request $request){
        if (!CommonHelpers::isCreate()) {
            return Inertia::render('Errors/RestrictionPage');
        }
        // if($request->type === 'route'){
             //CREATE FILE
            $viewFolderName = str_replace(' ', '', ucwords(str_replace('_', ' ', $request->name)));
            $viewContentName = str_replace(' ', '', ucwords(str_replace('_', ' ', $request->table_name)));
            $folderName = $viewFolderName;
            $contentName = $viewFolderName.'Controller';
            if(file_exists(base_path('app/Http/Controllers/'.$folderName.'/'.$contentName.'.php'))){
                return json_encode(['message'=>'Controller already exist!', 'status'=>'danger']);
            }else{
                //MAKE FOLDER
                $folder = base_path('app/Http/Controllers/'.$folderName);
                File::makeDirectory($folder, $mode = 0777, true, true);
                //MAKE FILE CONTENT
                $path = base_path("app/Http/Controllers/$folderName/");
                $php = self::controllerContent($contentName,$folderName);
                $php = trim($php);
                file_put_contents($path.$contentName.'.php', $php);
                //MAKE FOLDER VIEW CONTENT
                $makeFolderViewContent = base_path('resources/js/Pages/'.$folderName);
                File::makeDirectory($makeFolderViewContent, $mode = 0777, true, true);

                //MAKE FILE CONTROLLER
                $pathViewController = base_path("resources/js/Pages/".$folderName."/");
                $viewContent = self::viewContent($folderName);
                $viewContent = trim($viewContent);
                file_put_contents($pathViewController.$folderName.'.jsx', $viewContent);

                //CREATE MODULE
                DB::table('adm_modules')->updateOrInsert([
                        'name'         => $request->name,
                        'path'         => $request->path,
                        'controller'   => $folderName."\\".$contentName
                    ],
                    [
                        'name'         => $request->name,
                        'icon'         => $request->icon,
                        'path'         => $request->path,
                        'table_name'   => $request->table_name,
                        'controller'   => $folderName."\\".$contentName,
                        'is_protected' => 0,
                        'is_active'    => 1,
                        'created_at'   => date('Y-m-d H:i:s')
                    ]
                );
                //CREATE MENUS
                $isExist = DB::table('adm_menuses')->where('name',$request->name)->where('path',$folderName."\\".$contentName.'GetIndex')->exists();
                if(!$isExist){
                    $menusId = DB::table('adm_menuses')->insertGetId([
                        'name'                => $request->name,
                        'type'                => 'Route',
                        'icon'                => $request->icon,
                        'path'                => $folderName."\\".$contentName.'GetIndex',
                        'slug'                => $request->path,
                        'color'               => NULL,
                        'parent_id'           => 0,
                        'is_active'           => 1,
                        'is_dashboard'        => 0,
                        'id_adm_privileges'    => 1,
                        'sorting'             => 0,
                        'created_at'          => date('Y-m-d H:i:s')
                    ]);
                    //CREATE MENUS PRIVILEGE
                    DB::table('adm_menus_privileges')->insert(['id_adm_menus' => $menusId, 'id_adm_privileges' => CommonHelpers::myPrivilegeId()]);
                }
                $menus_privileges = admMenusPrivileges::where('id_adm_privileges', CommonHelpers::myPrivilegeId())
                ->pluck('id_adm_menus');
                $role = AdmMenus::with([
                    'children' => function ($query) use ($menus_privileges) {
                        $query->whereIn('id', $menus_privileges)
                        ->where('is_active', 1)
                        ->orderBy('sorting');
                    }
                ])
                    ->whereIn('id', $menus_privileges)
                    ->where('parent_id', 0)
                    ->where('is_active', 1)
                    ->orderBy('sorting')
                    ->get();
                Session::put('user_menus', $role);
            }
            return json_encode(['message'=>'Created successfully!', 'status'=>'success']);
        // }else{
        //     //CREATE MENUS
        //     $isExist = DB::table('adm_menuses')->where('name',$request->name)->exists();
        //     if(!$isExist){
        //         $menusId = DB::table('adm_menuses')->insertGetId(
        //             [
        //                 'name'                => $request->name,
        //                 'type'                => 'URL',
        //                 'icon'                => $request->icon,
        //                 'path'                => '#',
        //                 'slug'                => NULL,
        //                 'color'               => NULL,
        //                 'parent_id'           => 0,
        //                 'is_active'           => 1,
        //                 'is_dashboard'        => 0,
        //                 'id_adm_privileges'    => 1,
        //                 'sorting'             => 0,
        //                 'created_at'          => date('Y-m-d H:i:s')
        //             ]
        //         );
        //         //CREATE MENUS PRIVILEGE
        //         DB::table('adm_menus_privileges')->insert(['id_adm_menus' => $menusId, 'id_adm_privileges' => CommonHelpers::myPrivilegeId()]);
        //         return json_encode(['message'=>'Created successfully!', 'status'=>'success']);
        //     }
        // }
    }

    public function controllerContent($controllerName, $finalViewFileName){
            $content = '<?php
                            namespace App\Http\Controllers\\' . $finalViewFileName . ';
                            use App\Helpers\CommonHelpers;
                            use App\Http\Controllers\Controller;
                            use Illuminate\Http\Request;
                            use Illuminate\Http\RedirectResponse;
                            use Illuminate\Support\Facades\Auth;
                            use Illuminate\Support\Facades\Session;
                            use Inertia\Inertia;
                            use Inertia\Response;
                            use DB;

                            class '.$controllerName.' extends Controller{
                                public function getIndex(){
                                    return Inertia::render("'.$finalViewFileName.'/'.$finalViewFileName.'");
                                }
                            }
                        ?>';

            return $content;
    }

    public function viewContent($name){
        $content = "
                    import { Head, Link, router, usePage } from '@inertiajs/react';
                    import React, { useState } from 'react';
                    import ContentPanel from '../../Components/Table/ContentPanel';
                    const ".$name." = () => {
                        return(
                            <>
                                <ContentPanel>
                                    <div>This is ".$name." module table area</div>
                                </ContentPanel>
                            </>
                        );
                    };

                    export default ".$name.";
                    ";
        return $content;
    }

    public function getTableNames(){
        $tables = DB::select('SHOW TABLES');
        $tableNames = array_map('current', $tables);

        // Define the tables you want to exclude
        $excludedTables = ['adm_logs',
                           'adm_menus_privileges',
                           'adm_menuses',
                           'adm_modules',
                           'adm_privileges',
                           'adm_privileges_roles',
                           'adm_settings',
                           'failed_jobs',
                           'jobs',
                           'password_reset_tokens',
                           'personal_access_tokens',
                           'job_batches',
                           'migrations']; // Add any other tables you want to exclude

        // Filter out the excluded tables
        $filteredTables = array_filter($tableNames, function ($table) use ($excludedTables) {
            return !in_array($table, $excludedTables);
        });
        $finalDataTables = [];
        foreach($filteredTables as $key => $table){
            $container['id'] = $table;
            $container['name'] = $table;
            $finalDataTables[] = $container;
        }
        return response()->json($finalDataTables);
    }

}

?>
