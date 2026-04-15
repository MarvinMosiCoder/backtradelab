<?php

namespace App\Http\Controllers\Admin; 
use App\Helpers\CommonHelpers;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use DB;
use App\Models\AdmModels\AdmPrivileges;
use Inertia\Inertia;
use Inertia\Response;

class PrivilegesController extends Controller{
    private $table_name;
    private $primary_key;
    private $sortBy;
    private $sortDir;
    private $perPage;
    public function __construct() {
        $this->table_name  =  'adm_privileges';
        $this->primary_key = 'id';
        $this->sortBy = request()->get('sortBy', 'adm_privileges.created_at');
        $this->sortDir = request()->get('sortDir', 'desc');
        $this->perPage = request()->get('perPage', 10);
    }

    public function getAllData(){
        $query = AdmPrivileges::query();
        $filter = $query->searchAndFilter(request());
        $result = $filter->orderBy($this->sortBy, $this->sortDir);
        return $result;
    }

    public function getIndex(){
        if(!CommonHelpers::isView()) {
            return Inertia::render('Errors/RestrictionPage');
        }
        $data = [];
        $data['tableName'] = 'adm_privileges';
        $data['page_title'] = 'Privileges';
        $data['privileges'] = self::getAllData()->paginate($this->perPage)->withQueryString();
        $data['queryParams'] = request()->query();
        return Inertia::render('AdmVram/Privileges',$data);
    }

    public function createPrivilegesView(){
        if(!CommonHelpers::isCreate()) {
            echo 'error!';
        }
        $id = 0;
        $row = [];
        $modules = DB::table("adm_modules")->where('is_protected', 0)->whereNull('deleted_at')
         ->select("adm_modules.*", 
                DB::raw("(select is_visible from adm_privileges_roles where id_adm_modules = adm_modules.id and id_adm_privileges = '$id') as is_visible"), 
                DB::raw("(select is_create from adm_privileges_roles where id_adm_modules  = adm_modules.id and id_adm_privileges = '$id') as is_create"), 
                DB::raw("(select is_read from adm_privileges_roles where id_adm_modules    = adm_modules.id and id_adm_privileges = '$id') as is_read"), 
                DB::raw("(select is_edit from adm_privileges_roles where id_adm_modules    = adm_modules.id and id_adm_privileges = '$id') as is_edit"), 
                DB::raw("(select is_delete from adm_privileges_roles where id_adm_modules  = adm_modules.id and id_adm_privileges = '$id') as is_delete"),
                DB::raw("(select is_void from adm_privileges_roles where id_adm_modules    = adm_modules.id and id_adm_privileges = '$id') as is_void"),
                DB::raw("(select is_override from adm_privileges_roles where id_adm_modules  = adm_modules.id and id_adm_privileges = '$id') as is_override")
                )
         ->orderby("name", "asc")->get();
         $roles = DB::table('adm_privileges_roles')
         ->whereIn('id_adm_modules', $modules->pluck('id'))
         ->get()
         ->groupBy('id_adm_modules');
        
         return Inertia::render('AdmVram/PrivilegesForm', [
            'moduleses' => $modules,
            'row'=> $row,
            'role_data' => $roles
        ]);
    }

    public function getEdit($id){
        if (!CommonHelpers::isCreate()){
            echo 'error!';
        }
        $row = DB::table($this->table_name)->where("id", $id)->first();
        $modules = DB::table("adm_modules")->where('is_protected', 0)->where('deleted_at', null)->select("adm_modules.*")->orderby("name", "asc")->get();
        $modules->map(function ($modul) use ($id) {
            $modul->roles = DB::table('adm_privileges_roles')
                ->where('id_adm_modules', $modul->id)
                ->where('id_adm_privileges', $id)
                ->first();
            return $modul;
        });
        return Inertia::render('AdmVram/PrivilegesForm', [
            'moduleses' => $modules,
            'row'=> $row
        ]);
        
    }

    public function postAddSave(Request $request){
    
        if (!CommonHelpers::isCreate()) {
            echo 'error';
        }

        $savePriv = [
            "name" => $request->name,
            "is_superadmin" => $request->is_superadmin,
            "theme_color" => $request->theme_color,
            "created_at"  => date('Y-m-d H:i:s')
        ];

        $id = DB::table($this->table_name)->insertGetId($savePriv);

        //set theme
        Session::put('theme_color', $request->theme_color);

        $priv = $request->privileges;
  
        if ($priv) {
            foreach ($priv as $id_modul => $data) {
                $arrs = [];
                $arrs['is_visible'] = @$data['is_visible'] ?: 0;
                $arrs['is_create'] = @$data['is_create'] ?: 0;
                $arrs['is_read'] = @$data['is_read'] ?: 0;
                $arrs['is_edit'] = @$data['is_edit'] ?: 0;
                $arrs['is_delete'] = @$data['is_delete'] ?: 0;
                $arrs['is_void'] = @$data['is_void'] ?: 0;
                $arrs['is_override'] = @$data['is_override'] ?: 0;
                $arrs['id_adm_privileges'] = $id;
                $arrs['id_adm_modules'] = $id_modul;
                DB::table("adm_privileges_roles")->insert($arrs);

                $module = DB::table('adm_modules')->where('id', $id_modul)->first();
            }
        }

        //Refresh Session Roles
        $roles = DB::table('adm_privileges_roles')->where('id_adm_privileges', CommonHelpers::myPrivilegeId())->join('adm_modules', 'adm_modules.id', '=', 'id_adm_modules')->select('adm_modules.name', 'adm_modules.path', 'is_visible', 'is_create', 'is_read', 'is_edit', 'is_delete', 'is_void', 'is_override')->get();
        Session::put('admin_privileges_roles', $roles);

        return json_encode(["message"=>"Created successfully!", "type"=>"success"]);
    }

    public function postEditSave(Request $request){
        if (!CommonHelpers::isUpdate()){
            echo 'error!';
        }

        $id = $request->id;
        $savePriv = [
            "name" => $request->name,
            "is_superadmin" => $request->is_superadmin,
            "theme_color" => $request->theme_color,
            "updated_at"  => date('Y-m-d H:i:s')
        ];

        DB::table($this->table_name)->where($this->primary_key, $id)->update($savePriv);

        $priv = $request->privileges;
        // This solves issue #1074
        // DB::table("adm_privileges_roles")->where("id_adm_privileges", $id)->delete();
    
        if ($priv) {
            foreach ($priv as $id_modul => $data) {
                //Check Menu
                $module = DB::table('adm_modules')->where('id', $id_modul)->first();
                $currentPermission = DB::table('adm_privileges_roles')->where('id_adm_modules', $id_modul)->where('id_adm_privileges', $id)->first();
         
                if ($currentPermission) {
                    $arrs = [];
                    foreach($data as $key => $val){
                        $arrs[$key] = @$val ? : 0;
                    }
                    DB::table('adm_privileges_roles')->where('id', $currentPermission->id)->update($arrs);
                } else {
                    $arrs = [];
                    $arrs['is_visible'] = @$data['is_visible'] ?: 0;
                    $arrs['is_create'] = @$data['is_create'] ?: 0;
                    $arrs['is_read'] = @$data['is_read'] ?: 0;
                    $arrs['is_edit'] = @$data['is_edit'] ?: 0;
                    $arrs['is_delete'] = @$data['is_delete'] ?: 0;
                    $arrs['is_void'] = @$data['is_void'] ?: 0;
                    $arrs['is_override'] = @$data['is_override'] ?: 0;
                    $arrs['id_adm_privileges'] = $id;
                    $arrs['id_adm_modules'] = $id_modul;
                    DB::table("adm_privileges_roles")->insert($arrs);
                }
            }
        }

        //Refresh Session Roles
        if ($id == CommonHelpers::myPrivilegeId()) {
            $roles = DB::table('adm_privileges_roles')->where('id_adm_privileges', CommonHelpers::myPrivilegeId())->join('adm_modules', 'adm_modules.id', '=', 'id_adm_modules')->select('adm_modules.name', 'adm_modules.path', 'is_visible', 'is_create', 'is_read', 'is_edit', 'is_delete', 'is_void', 'is_override')->get();
            Session::put('admin_privileges_roles', $roles);

            Session::put('theme_color', $request->theme_color);
        }

        return json_encode(["message"=>"Updated successfully!", "type"=>"success"]);
    }

}

?>