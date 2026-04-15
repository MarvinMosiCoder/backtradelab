<?php

namespace App\Http\Controllers\Admin; 
use App\Helpers\CommonHelpers;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AdmModels\AdmSettings;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;

class SettingsController extends Controller{

    private $sortBy;
    private $sortDir;
    private $perPage;
    private $table_name;
    private $primary_key;
    public function __construct() {
        $this->table_name  =  'adm_settings';
        $this->primary_key = 'id';
    }

    public function getIndex(){
        $data['app_name'] = AdmSettings::where('name','appname')->pluck('content')->first();
        $data['favicon'] = AdmSettings::where('name','favicon')->first();
        $data['logo'] = AdmSettings::where('name','logo')->first();
        $data['login_background_color'] = AdmSettings::where('name','login_background_color')->pluck('content')->first();
        $data['login_font_color'] = AdmSettings::where('name','login_font_color')->pluck('content')->first();
        $data['login_background_image'] = AdmSettings::where('name','login_background_image')->first();
        return Inertia::render('AdmVram/Settings',$data);
    }

    public function postSave(Request $request){
        $appname = [$request->app_name];
        $favicon = [$request->favicon];
        $system_logo = [$request->system_logo];
        $login_background_color = [$request->login_background_color];
        $login_font_color = [$request->login_font_color];
        $login_background_image = [$request->login_background_image];
        $appnameArr = [];
        if(!in_array(null, $appname, true)) {
            foreach($appname as $name){
                $appnameCon['name'] = 'appname';
                $appnameCon['content'] = $name;
                $appnameCon['content_input_type'] = 'text';
                $appnameCon['dataenum'] = '';
                $appnameCon['helper'] = '';
                $appnameCon['group_setting'] = 'Application Settings';
                $appnameCon['label'] = 'Application System';
                $appnameCon['created_at'] = date('Y-m-d h:i:s');
                $appnameArr[] = $appnameCon;
            }
        }
   
        $faviconArr = [];
        if(!in_array(null, $favicon, true)) {
            foreach($favicon as $fav){
                $name = 'favicon-logo' . '.' . $fav->getClientOriginalExtension();
                $filename = $name;
                $fav->move('images/settings/favicon-logo',$filename);

                $faviconCon['name'] = 'favicon';
                $faviconCon['content'] = 'images/settings/favicon-logo/'.$filename;
                $faviconCon['content_input_type'] = 'upload_image';
                $faviconCon['dataenum'] = '';
                $faviconCon['helper'] = '';
                $faviconCon['group_setting'] = 'Application Settings';
                $faviconCon['label'] = 'Favicon';
                $faviconCon['created_at'] = date('Y-m-d h:i:s');
                $faviconArr[] = $faviconCon;
            }
        }

        $logoArr = [];
        if(!in_array(null, $system_logo, true)) {
            foreach($system_logo as $logo){
                $name = 'system-logo' . '.' . $logo->getClientOriginalExtension();
                $filename = $name;
                $logo->move('images/settings/system-logo',$filename);

                $logoCon['name'] = 'logo';
                $logoCon['content'] = 'images/settings/system-logo/'.$filename;
                $logoCon['content_input_type'] = 'upload_image';
                $logoCon['dataenum'] = '';
                $logoCon['helper'] = '';
                $logoCon['group_setting'] = 'Application Settings';
                $logoCon['label'] = 'Logo';
                $logoCon['created_at'] = date('Y-m-d h:i:s');
                $logoArr[] = $logoCon;
            }
        }

        $lbcArr = [];
        if(!in_array(null, $login_background_color, true)) {
            foreach($login_background_color as $lbc){
                $lbcCon['name'] = 'login_background_color';
                $lbcCon['content'] = $lbc;
                $lbcCon['content_input_type'] = 'text';
                $lbcCon['dataenum'] = '';
                $lbcCon['helper'] = 'Input hexacode';
                $lbcCon['group_setting'] = 'Login Register Style';
                $lbcCon['label'] = 'Login Background Color';
                $lbcCon['created_at'] = date('Y-m-d h:i:s');
                $lbcArr[] = $lbcCon;
            }
        }

        $lfcArr = [];
        if(!in_array(null, $login_font_color, true)) {
            foreach($login_font_color as $lfc){
                $lfcCon['name'] = 'login_font_color';
                $lfcCon['content'] = $lfc;
                $lfcCon['content_input_type'] = 'text';
                $lfcCon['dataenum'] = '';
                $lfcCon['helper'] = 'Input hexacode';
                $lfcCon['group_setting'] = 'Login Register Style';
                $lfcCon['label'] = 'Login Font Color';
                $lfcCon['created_at'] = date('Y-m-d h:i:s');
                $lfcArr[] = $lfcCon;
            }
        }

        $lbiArr = [];
        if(!in_array(null, $login_background_image, true)) {
            foreach($login_background_image as $lbi){
                $name = 'login-logo' . '.' . $lbi->getClientOriginalExtension();
                $filename = $name;
                $lbi->move('images/settings/login-logo',$filename);

                $lbiCon['name'] = 'login_background_image';
                $lbiCon['content'] = 'images/settings/login-logo/'.$filename;
                $lbiCon['content_input_type'] = 'upload_image';
                $lbiCon['dataenum'] = '';
                $lbiCon['helper'] = '';
                $lbiCon['group_setting'] = 'Login Register Style';
                $lbiCon['label'] = 'Login Background Image';
                $lbiCon['created_at'] = date('Y-m-d h:i:s');
                $lbiArr[] = $lbiCon;
            }
        }

        $saveSettings = array_merge($appnameArr, $faviconArr, $logoArr, $lbcArr, $lfcArr, $lbiArr);

        foreach($saveSettings as $key => $val){
            AdmSettings::updateOrInsert(
                [
                    'name'                => $val['name'],
                ],
                [
                    'name'                => $val['name'],
                    'content'             => $val['content'],
                    'content_input_type'  => $val['content_input_type'],
                    'dataenum'            => $val['dataenum'],
                    'helper'              => $val['helper'],
                    'helper'              => $val['helper'],
                    'group_setting'       => $val['group_setting'],
                    'label'               => $val['label']
                ]
            );
        }
        return json_encode(["message"=>"Save successfully!", "status"=>"success"]);
    }

    public function postDelete(Request $request){
        $id = $request->id;
        $details = AdmSettings::where('id',$id)->first();

        $filePath = public_path($details->content);

        if (File::exists($filePath)) {
            File::delete($filePath);
            AdmSettings::where('id',$id)->update(['content'=>null]);
            return json_encode(["message"=>"Deleted successfully!", "status"=>"success"]);
        } else {
            return json_encode(["message"=>"File not found!", "status"=>"error"]);
        }
        
        return json_encode(["message"=>"Deleted successfully!", "status"=>"success"]);
    }

    public function getAppname(){
        $appname = AdmSettings::where('name','appname')->pluck('content')->first();
        return json_encode(['app_name'=>$appname]);
    }
    public function getApplogo(){
        $logo = AdmSettings::where('name','logo')->pluck('content')->first();
        return json_encode(['app_logo'=>$logo]);
    }

    public function getLoginDetails(){
        $data = [];
        $data['login_bg_color'] = AdmSettings::where('name','login_background_color')->pluck('content')->first();
        $data['login_bg_image'] = AdmSettings::where('name','login_background_image')->pluck('content')->first();
        $data['login_font_color'] = AdmSettings::where('name','login_font_color')->pluck('content')->first();
        return json_encode($data);
    }

}

?>