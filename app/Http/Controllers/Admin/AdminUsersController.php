<?php

namespace App\Http\Controllers\Admin; 
use App\Helpers\CommonHelpers;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Hash;
use DB;
use App\Models\AdmUser;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\AccountDeactivationService;
use App\Services\AdminAccessService;
use Illuminate\Validation\Rule;

    class AdminUsersController extends Controller{

        private $table_name;
        private $primary_key;
        private $sortBy;
        private $sortDir;
        private $perPage;

        public function __construct(private readonly AdminAccessService $adminAccess) {
            $this->middleware('admin.permission:users,view')->only('getIndex');
            $this->middleware('admin.permission:users,read')->only('postGetUsers');
            $this->middleware('admin.permission:users,create')->only('postAddSave');
            $this->middleware('admin.permission:users,edit')->only('postEditSave');
            $this->middleware('admin.permission:users,delete')->only('setStatus');
            $this->table_name  = 'adm_users';
            $this->primary_key = 'id';
            $this->sortBy = request()->get('sortBy', 'adm_users.created_at');
            $this->sortDir = request()->get('sortDir', 'desc');
            $this->perPage = request()->get('perPage', 10);
        }
        
        public function getAllData(){
            $query = AdmUser::query()->with('role');
            $filter = $query->searchAndFilter(request());
            // dd(request());
            $result = $filter->orderBy($this->sortBy, $this->sortDir);
            return $result;
        }
    
        public function getIndex(){
            if(!CommonHelpers::isView()) {
                return Inertia::render('Errors/RestrictionPage');
            } 
            $data_users = self::getAllData()->paginate($this->perPage)->withQueryString();
            $submasters = self::getSubmaster();
            return Inertia::render('AdmVram/Users', [
                'tableName' => 'adm_users',
                'users' => $data_users,
                'options' => ['privileges'=>$submasters['privileges']],
                'queryParams' => request()->query()
            ]);
        }

        public function postGetUsers(){
            $query = AdmUser::getData();
            $query->when(request('search'), function ($query, $search) {
                $query->where('adm_users.name', 'LIKE', "%$search%")
                    ->orWhere('adm_users.email', "LIKE", "%$search%");
            });

            $data_users = $query->orderBy($this->sortBy, $this->sortDir)->paginate($this->perPage)->withQueryString();
            return ['users'=>$data_users,'queryParams' => request()->query()];
        }

        public function postAddSave(Request $request){
            $data = $request->validate([
                'email' => ['required', 'email', 'max:255', Rule::unique('adm_users', 'email')],
                'name' => ['required', 'string', 'max:255'],
                'privilege_id' => ['required', 'integer', 'exists:adm_privileges,id'],
            ]);
            $targetRole = DB::table('adm_privileges')->where('id', $data['privilege_id'])->first();
            if ((bool) $targetRole->is_superadmin && !$this->adminAccess->isSuperadmin($request->user())) {
                abort(403);
            }

            AdmUser::create([
                'email' => $data['email'],
                'name' => $data['name'],
                'id_adm_privileges' => $data['privilege_id'],
                'status' => 'ACTIVE',
            ]);

            return json_encode(["message"=>"Data Saved!", "type"=>"success"]);
        }

        public function getEditUser($id){
            $data = [];
            $datA['page_title'] = 'Edit user';
            $data['user'] = AdmUser::getDataPerUser($id);
            $submasters = self::getSubmaster();
            $data = array_merge($submasters, $data);
            return view('admin/users/add-user', $data);
        }

        public function postEditSave(Request $request){
            $data = $request->validate([
                'u_id' => ['required', 'integer', 'exists:adm_users,id'],
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', Rule::unique('adm_users', 'email')->ignore($request->u_id)],
                'privilege_id' => ['required', 'integer', 'exists:adm_privileges,id'],
                'status' => ['required', Rule::in(['ACTIVE', 'INACTIVE', 1, 0, '1', '0'])],
                'password' => ['nullable', 'string', 'min:8'],
            ]);
            $oldPass = AdmUser::where('id',$data['u_id'])->firstOrFail();
            $targetRole = DB::table('adm_privileges')->where('id', $data['privilege_id'])->first();
            if ((bool) $targetRole->is_superadmin && !$this->adminAccess->isSuperadmin($request->user())) abort(403);
            if ($oldPass->is($request->user())
                && ((int) $oldPass->id_adm_privileges !== (int) $data['privilege_id'] || strtoupper((string) $data['status']) === 'INACTIVE' || (string) $data['status'] === '0')) {
                return response()->json(['message' => 'You cannot change your own role or deactivate your own account.'], 422);
            }
            if($request->password){
                $password = hash::make($request->password);
            }else{
                $password = $oldPass->password;
            }
            $update = AdmUser::where('id',$request->u_id)->update([
                'name' => $request->name,
                'email' => $request->email,
                'password'  => $password,
                'id_adm_privileges' => $request->privilege_id,
                'status'  => $request->status,
              
            ]);
            if($update){
                return json_encode(["message"=>"Update success!", "type"=>"success"]);
            }
        }

        public function getSubmaster(){
            $data = [];
            $data['privileges'] = DB::table('adm_privileges')->select('*')->get();
            return $data;
        }

        public function getChangePasswordView(){
            $data = [];
            $data['page_title'] = "Change Password";
            return view('admin/users/change-password', $data);
        }

        public function postUpdatePassword(Request $request){
         
            $user = AdmUser::find(CommonHelpers::myId());
            if (Hash::check($request->all()['current_password'], $user->password)){
          
                $request->validate([
                    'new_password' => 'required',
                    'confirmation_password' => 'required|same:new_password'
                ]);
          
                $user->password = Hash::make($request->get('new_password'));
                $user->save();
                return json_encode(["message"=>"Password Updated, You Will Be Logged-Out.", "type"=>"success"]);
            } else {
                return json_encode(["message"=>"Incorrect Current Password.", "type"=>"error"]);
            }
        }

        public function getProfileUser(){
            $data = [];
            $data['page_title'] = "Profile";
            return view('admin/users/profile', $data);
        }

        public function setStatus(Request $request, AccountDeactivationService $deactivationService){
            $request->validate(['Ids' => ['required', 'array'], 'Ids.*' => ['integer', 'exists:adm_users,id']]);
   
            if($request->bulk_action_type == 1){
                foreach($request->Ids as $set_ids){
                    $user = AdmUser::find($set_ids);
                    if ($user) {
                        if ($this->isProtectedSuperadmin($request, $user)) abort(403);
                        $deactivationService->reactivate($user);
                    }
                }
            }else{
                foreach($request->Ids as $set_ids){
                    if ((int) $set_ids === (int) $request->user()->id) {
                        continue;
                    }

                    $user = AdmUser::find($set_ids);
                    if ($user) {
                        if ($this->isProtectedSuperadmin($request, $user)) abort(403);
                        if ($this->isLastActiveSuperadmin($user)) {
                            return response()->json(['message' => 'The final active super administrator cannot be deactivated.'], 422);
                        }
                        $deactivationService->deactivate($user, $request->user()->id, 'Deactivated by administrator');
                    }
                }
            }
          
           $data = ['message'=>'Data updated!', 'status'=>'success'];
           return json_encode($data);
        }

        private function isProtectedSuperadmin(Request $request, AdmUser $user): bool
        {
            return (bool) DB::table('adm_privileges')->where('id', $user->id_adm_privileges)->value('is_superadmin')
                && !$this->adminAccess->isSuperadmin($request->user());
        }

        private function isLastActiveSuperadmin(AdmUser $user): bool
        {
            $isSuperadmin = (bool) DB::table('adm_privileges')->where('id', $user->id_adm_privileges)->value('is_superadmin');
            if (!$isSuperadmin) return false;

            return AdmUser::query()->whereKeyNot($user->id)
                ->whereIn('id_adm_privileges', DB::table('adm_privileges')->where('is_superadmin', true)->pluck('id'))
                ->where(fn ($query) => $query->whereRaw('UPPER(status) = ?', ['ACTIVE'])->orWhere('status', 1))
                ->doesntExist();
        }
    }

?>
