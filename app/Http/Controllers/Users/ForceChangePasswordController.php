<?php

namespace App\Http\Controllers\Users;
use Session;
use app\Helpers\CommonHelpers;
use App\Http\Controllers\Controller;
use App\Models\AdmUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use DB;
use Carbon\Carbon;
use Illuminate\Support\Str;

class ForceChangePasswordController extends Controller
{
    public function showChangeForcePasswordForm(){
        $data = [];
        $sidebarMenus = CommonHelpers::sidebarMenu();
        return Inertia::render('AdmVram/ForceChangePassword', [
            'menus' => $sidebarMenus
        ]);
    }

    public function checkPassword(Request $request) {
		$fields = $request->all();
		$user = AdmUser::where('id',CommonHelpers::myId())->first();
 
		if (Hash::check($fields['current_password'], $user->password)){
            return response()->json(['success' => true]);
		}else{
			return response()->json(['success' => false, 'message' => 'Incorrect current password']);
		}
	}

    public function postUpdatePassword(Request $request) {
		$fields = $request->all();
		$user = AdmUser::where('id',CommonHelpers::myId())->first();

		if (Hash::check($fields['current_password'], $user->password)){
			//Check if password exist in history
			$passwordHistory = DB::table('adm_password_histories')->where('adm_user_id',CommonHelpers::myId())->get()->toArray();
			$isExist = array_column($passwordHistory, 'adm_user_old_pass');
			if(!self::checkPasswordInArray($fields['new_password'], $isExist)) {
				$validator = \Validator::make($request->all(), [
					'current_password' => 'required',
					'new_password' => 'required',
					'confirm_password' => 'required|same:new_password'
				]);
			
				if ($validator->fails()) {
					return response()->json(['message' => $validator, 'status'=>'error']);
				}
				AdmUser::where('id', CommonHelpers::myId())
				->update([
					'password'=>Hash::make($fields['new_password']),
					'last_password_updated' => Carbon::now()->format('Y-m-d'),
					'waiver_count' => 0
				]);
				$newPass = AdmUser::where('id',CommonHelpers::myId())->first();
				Session::put('check-user',false);
				Session::put('admin-password', $newPass->password);
				//Save password history
				DB::table('adm_password_histories')->insert([
					'adm_user_id' => $newPass->id,
					'adm_user_old_pass' => $newPass->password,
					'created_at' => date('Y-m-d h:i:s')
				]);

				return response()->json(['message' => 'Password Updated, You Will Be Logged-Out.', 'status'=>'success']);
			}else{
				return response()->json(['message' => 'Password already used! Please try another password', 'status'=>'error']);
			}
		}else{
			return response()->json(['message' => 'Incorrect Current Password.', 'status'=>'error']);
		}
		
	}

	public function waiveChangePassword(Request $request){
		$user = AdmUser::where('id',CommonHelpers::myId())->first();
		AdmUser::where('id', CommonHelpers::myId())
			->update([
				'last_password_updated' => Carbon::now()->format('Y-m-d'),
				'waiver_count' => DB::raw('COALESCE(waiver_count, 0) + 1')
			]);
		Session::put('admin-password', $user->password);
		Session::put('check_user',false);
		return response()->json(['message' => 'Waive completed!', 'status'=>'success']);
	}

	public function checkWaive(Request $request) {
		$data = [];
		$user = AdmUser::where('id',CommonHelpers::myId())->first();
		if ($user->waiver_count === 4){
			return response()->json(['status' => true, 'message' => 'You cannot waive more than 4 times!']);
		}else{
			return response()->json(['status' => false]);
		}
	
		return json_encode($data);
	}

	// Function to check if the new password matches any hashed password
	function checkPasswordInArray($newPassword, $hashedPasswords) {
		foreach ($hashedPasswords as $hashedPassword) {
			if (Hash::check($newPassword, $hashedPassword)) {
				return true; // Password exists in the array
			}
		}
		return false; // Password does not exist
	}
}
