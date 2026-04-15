<?php

namespace App\Http\Controllers\Users;

use app\Helpers\CommonHelpers;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AdmUser;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\AdmModels\AdmUserProfiles;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Session;
class ProfilePageController extends Controller
{

    public function getIndex()
    {
        $data = [];
        $data['page_title'] = 'Profile';
        $data['user'] = DB::table('adm_users')
            ->select(
                'adm_users.*',
                'adm_users.id as user_id',
                'adm_privileges.name as privilege_name',
                'adm_user_profiles.adm_user_id as profile_user_id',
                'adm_user_profiles.file_name as profile',
            )
            ->leftJoin('adm_privileges', 'adm_users.id_adm_privileges', '=', 'adm_privileges.id')
            ->leftJoin('adm_user_profiles', function($join) {
                $join->on('adm_users.id', '=', 'adm_user_profiles.adm_user_id')
                ->whereNull('adm_user_profiles.archived');
            })
            ->where('adm_users.id', CommonHelpers::myId())
            ->first();
        return Inertia::render('AdmVram/ProfilePage',$data);
    }

    public function saveEditImage(Request $request) {
        $file = $request->file('profile_image');
        $isExist = AdmUserProfiles::where('adm_user_id',CommonHelpers::myId())->exists();
        
        if($isExist){
            DB::table('adm_user_profiles')->where('adm_user_id',CommonHelpers::myId())->update([
                'archived' => date('Y-m-d h:i:s')
            ]);
        }

        // Create a new profile record
        $profile = AdmUserProfiles::create([
            'adm_user_id' => CommonHelpers::myId(),
            'ext' => $file->getClientOriginalExtension(),
            'created_by' => CommonHelpers::myId()
        ]);
    
        // Generate the filename
        $filename = CommonHelpers::myId() . "-" . $profile->id . "." . $file->getClientOriginalExtension();
    
        // Update the profile record with the filename
        $profile->update([
            'file_name' => $filename
        ]);
    
        // Move the file to the desired location
        $file->move(public_path('images/profile'), $filename);
    
        return response()->json(["message" => "Image uploaded!", "status" => "success"]);
    }
    
    public function getProfiles(){
        $profiles = AdmUserProfiles::where('adm_user_id',CommonHelpers::myId())->get();
        return response()->json($profiles);
    }

    public function updateProfile(Request $request){
        $id = $request['id'];
        $action = $request['action'];
        if(!$id){
            return response()->json(['message' => 'Nothing selected!', 'status' => 'warning']);
        }
        if($action == 'update'){
            DB::table('adm_user_profiles')->where('adm_user_id', CommonHelpers::myId())->update([
                'archived' => date('Y-m-d h:i:s')
            ]);
            DB::table('adm_user_profiles')->where('id', $id)->update([
                'archived' => NULL
            ]);
            return response()->json(['message' => 'Profile changed!', 'status' => 'success']);
        } elseif ($action == 'delete') {
            $filename = AdmUserProfiles::find($id);
            $imagePath = public_path('images/profile/'.$filename->file_name);
            if (File::exists($imagePath)) {
                File::delete($imagePath);
                DB::table('adm_user_profiles')->where('id', $id)->delete();
                return response()->json(['message' => 'Image deleted successfully!', 'status' => 'success']);
            } else {
                return response()->json(['message' => 'Image not found.', 'status' => 'warning']);
            }
        } elseif ($action == 'download') {
            $profile = AdmUserProfiles::find($id);
            if ($profile && $profile->file_name) {
                $filePath = public_path('images/profile/'.$profile->file_name);
                if (File::exists($filePath)) {
                    return response()->download($filePath, $profile->file_name);
                } else {
                    return response()->json(['message' => 'File not found.', 'status' => 'warning']);
                }
            } else {
                return response()->json(['message' => 'Profile not found.', 'status' => 'error']);
            }
        } else {
            return response()->json(['message' => 'Invalid action.', 'status' => 'error']);
        }
        
    }

    public function updateTheme(Request $request){
        $id = CommonHelpers::myId();
        $theme = $request['theme'];
        $update = AdmUser::where('id',$id)->update([
            'theme' => $theme,      
        ]);
        Session::put('dark_theme', $theme);
       
        return response()->json(["message"=>"Theme changed!", "status"=>"success"]);
        
    }
    
}
