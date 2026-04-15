<?php

namespace App\Http\Controllers\Admin; 
use App\Helpers\CommonHelpers;
use App\Http\Controllers\Controller;
use App\Models\AdmModels\AdmMenus;
use App\Models\AdmModels\admMenusPrivileges;
use App\Models\AdmModels\AdmPrivileges;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class MenusController extends Controller{
  
    public static function sidebarMenu(){
        return CommonHelpers::sidebarMenu();
    }

    public function getIndex(){
   
        if (!CommonHelpers::isView()) {
            CommonHelpers::redirect(CommonHelpers::adminPath(), 'Denied Access');
        }

        $data = [];
        $data['tableName'] = 'adm_users';
        $data['page_title'] = 'Users Management';
        $data['privileges'] = AdmPrivileges::select('id as value', 'name as label')->get();

        $data['menus'] = AdmMenus::with([
            'children' => function ($query)  {
                $query->with('getMenusPrivileges.getPrivilege')->where('is_active', 1)
                ->orderBy('sorting');
            }, 'getMenusPrivileges.getPrivilege'
        ])
        ->where('parent_id', 0)
        ->where('is_active', 1)
        ->orderBy('sorting')
        ->get();

        $data['inactive_menus'] = AdmMenus::with(['getMenusPrivileges.getPrivilege'])
        ->where('parent_id', 0)
        ->where('is_active', 0)
        ->orderBy('sorting')
        ->get();


        return Inertia::render('AdmVram/MenuManagement/MenuManagement', $data);
    }

    public function createMenu(Request $request)
    {
        $validatedFields = $request->validate([
            'privilege_name' => 'required',
            'menu_name' => 'required',
            'menu_type' => 'required',
            'menu_icon' => 'required',
            'path' => 'required',
            'slug' => 'required_if:menu_type,Route',
            'id_adm_privileges' => 'required|integer'
        ]);

        try {

            DB::beginTransaction();
    
            $menu = AdmMenus::create([
                'name' => $validatedFields['menu_name'], 
                'type' => $validatedFields['menu_type'],   
                'path' => $validatedFields['path'], 
                'slug' => $request->slug ?? null, 
                'icon' => $validatedFields['menu_icon'], 
                'parent_id' => 0, 
                'is_active' => 1, 
                'id_dashboard' => 0, 
                'id_adm_privileges' => 1, 
                'sorting' => 0, 
            ]);

            admMenusPrivileges::create([
                'id_adm_menus' => $menu->id, 
                'id_adm_privileges' => $request->id_adm_privileges,   
            ]);

            DB::commit();

            
            $menus = AdmMenus::with([
                'children' => function ($query)  {
                    $query->with('getMenusPrivileges.getPrivilege')->where('is_active', 1)
                    ->orderBy('sorting');
                }, 'getMenusPrivileges.getPrivilege'
                ])
                ->where('parent_id', 0)
                ->where('is_active', 1)
                ->orderBy('sorting')
                ->get();
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
            return back()->with(['message' => 'Menu Creation Success!', 'type' => 'success', 'menus' => $menus ]);
        }  

        catch (\Exception $e) {

            DB::rollBack();
            CommonHelpers::LogSystemError('Menu Management', $e->getMessage());
            return back()->with(['message' => 'Menu Creation Failed!', 'type' => 'error']);
        }
        
    }

    public function autoUpdateMenu(Request $request) {

        $sorting = 1;

        foreach ($request->items as $item) {
            $menu = AdmMenus::find($item['id']);
            $menu->sorting = $sorting;
            $menu->parent_id = 0;

            $child_sorting = 1;

            if (isset($item['children']) && !empty($item['children'])) {
                foreach ($item['children'] as $child) {
                    $child_menu = AdmMenus::find($child['id']);
                    $child_menu->sorting = $child_sorting;
                    $child_menu->parent_id = $item['id'];

                    $child_menu->save();
                    $child_sorting++;
                }
            }

            $menu->save();
            $sorting++;
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

        return json_encode(["message"=> 'Menu Updated', "type"=>"success"]);
      
    }
    
    public function editMenu($menu){
        if (!CommonHelpers::isView()) {
            CommonHelpers::redirect(CommonHelpers::adminPath(), 'Denied Access');
        }
        
        $data = [];
        $data['privileges'] = AdmPrivileges::select('id as value', 'name as label')->get();
        $data['tableName'] = 'adm_users';
        $data['page_title'] = 'Users Management - Edit';
        $data['menu'] = AdmMenus::with([
            'children' => function ($query)  {
                $query->with('getMenusPrivileges.getPrivilege')->where('is_active', 1)
                ->orderBy('sorting');
            }, 'getMenusPrivileges.getPrivilege'
        ])
        ->find($menu);

        return Inertia::render('AdmVram/MenuManagement/MenuManagementEdit', $data);
    }

    public function updateMenu(Request $request){

        $validatedFields = $request->validate([
            'privileges' => 'required',
            'menu_name' => 'required',
            'menu_type' => 'required',
            'menu_icon' => 'required',
            'status' => 'required',
            'path' => 'required',
            'slug' => 'required_if:menu_type,Route',
        ]);

        try {

            DB::beginTransaction();
            
            // FOR UPDATING NEW PRIVILEGE
            $currentPrivileges = admMenusPrivileges::where('id_adm_menus', $request->id)
            ->pluck('id_adm_privileges')
            ->toArray();

            $newPrivileges = collect($request->privileges)->pluck('id')->toArray();
            $privilegesToDelete = array_diff($currentPrivileges, $newPrivileges);

            // DELETING PRIVILEGE/S
            admMenusPrivileges::where('id_adm_menus', $request->id)
            ->whereIn('id_adm_privileges', $privilegesToDelete)
            ->delete();

            $privilegesToAdd = array_diff($newPrivileges, $currentPrivileges);

            // PREPARING NEW RECORDS FOR INSERT
            $newRecords = array_map(function($privilegeId) use ($request) {
                return [
                    'id_adm_menus' => $request->id,
                    'id_adm_privileges' => $privilegeId,
                ];
            }, $privilegesToAdd);
        
            // INSERT NEW PRIVILEGE
            if (!empty($newRecords)) {
                admMenusPrivileges::insert($newRecords);
            }

            // FOR UPDATING MENU
            $menu = AdmMenus::find($request->id);
            $menu->name = $validatedFields['menu_name'] ?? null;
            $menu->type = $validatedFields['menu_type'] ?? null;
            $menu->icon = $validatedFields['menu_icon'] ?? null;
            $menu->path = $validatedFields['path'] ?? null;
            $menu->slug = $validatedFields['slug'] ?? null;
            $menu->is_active = $validatedFields['status'] ?? null;

            if ($validatedFields['status'] == 0){
                $menu->parent_id = 0;
                $menu->sorting = 0;
            }
    
            $menu->save();

            
            // UPDATING THE CHILDREN SORT
            $child_sorting = 1;

            if (isset($request['children']) && !empty($request['children'])) {
                foreach ($request['children'] as $child) {
                    $child_menu = AdmMenus::find($child['id']);
                    $child_menu->sorting = $child_sorting;
                    $child_menu->parent_id = $request['id'];

                    $child_menu->save();
                    $child_sorting++;
                }
            }
            DB::commit();
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
            return redirect('menu_management')->with(['message' => 'Menu Update Success!', 'type' => 'success']);

        }

        catch (\Exception $e) {

            DB::rollBack();
            CommonHelpers::LogSystemError('Menu Management', $e->getMessage());
            return back()->with(['message' => 'Menu Creation Failed!', 'type' => 'error']);
        }

        
    }
    
}

?>