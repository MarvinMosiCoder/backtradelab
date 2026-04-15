<?php

namespace App\Http\Controllers\Admin; 
use App\Helpers\CommonHelpers;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AdmModels\AdmLogs;
use Inertia\Inertia;
use App\Models\Announcement;
use App\Models\AdmUser;
use Illuminate\Support\Facades\Session;
class AnnouncementsController extends Controller{

    private $sortBy;
    private $sortDir;
    private $perPage;
    private $table_name;
    private $primary_key;
    public function __construct() {
        $this->table_name  =  'announcements';
        $this->primary_key = 'id';
        $this->sortBy = request()->get('sortBy', 'announcements.created_at');
        $this->sortDir = request()->get('sortDir', 'desc');
        $this->perPage = request()->get('perPage', 10);
    }

    public function getIndex(){

        $query = Announcement::query();

        $query->when(request('search'), function ($query, $search) {
            $query->where('announcements.title', 'LIKE', "%$search%");
        });

        $annoucements = $query->orderBy($this->sortBy, $this->sortDir)->paginate($this->perPage)->withQueryString();

        if (!CommonHelpers::isView()) {
            CommonHelpers::redirect(CommonHelpers::adminPath(), 'Denied Access');
        }

        return Inertia::render('AdmVram/AnnouncementPage', [
            'announcements' => $annoucements,
            'queryParams' => request()->query()
        ]);
    }

    public function getUnreadAnnouncements(){
        $user = AdmUser::where("id", CommonHelpers::myId())->first();
        $data = [];
        // Fetch unread announcements for the user
        $data['unreadAnnouncements'] = Announcement::whereDoesntHave('admUsers', function($query) use ($user) {
            $query->where('adm_user_id', $user->id);
        })->where('status','ACTIVE')->get();

        return Inertia::render('AdmVram/Announcement',$data);
  
    }

    public function getAnnouncements(){
        $user = AdmUser::where("id", CommonHelpers::myId())->first();
        $data = [];
        $data['unreadAnnouncements'] = Announcement::where('title','New Feature Update')->where('status','ACTIVE')->get();
        return Inertia::render('AdmVram/DefaultAnnouncement',$data);
    }

    public function markAnnouncementAsRead(Request $request){
        $announcementId = $request['announcement_id'];
        $user = AdmUser::find(CommonHelpers::myId());
        $user->announcements()->attach($announcementId);

        $unreadAnnouncements = Announcement::whereDoesntHave('admUsers', function($query) use ($user) {
            $query->where('adm_user_id', CommonHelpers::myId());
        })->where('status','ACTIVE')->get();
        if($unreadAnnouncements->isEmpty()){
            Session::put('unread-announcement',false);
        }
        return response()->json(['status' => 'success', 'message' => 'Announcement marked as read.']);
    }

    public function addAnnouncementForm(){
        if (!CommonHelpers::isView()) {
            CommonHelpers::redirect(CommonHelpers::adminPath(), 'Denied Access');
        }
        $data = [];
        $data['page_title'] = "Add Announcement";
        $data['action'] = 'Add';
        return Inertia::render('AdmVram/AnnouncementForm',$data);
    }

    public function saveAnnouncement(Request $request){
        if (!CommonHelpers::isCreate()) {
            CommonHelpers::redirect(CommonHelpers::adminPath(), 'Denied Access');
        }
        Announcement::create([
            'title'   => $request['title'],
            'message' => $request['message'],
            'status'  => 'ACTIVE',
            'created_by' => CommonHelpers::myId(),
            'created_at' =>  date('Y-m-d H:i:s')
        ]);
        return json_encode(['message'=>'Created successfully!', 'status'=>'success']);
    }

    public function editAnnouncement($id){
        if (!CommonHelpers::isView()) {
            CommonHelpers::redirect(CommonHelpers::adminPath(), 'Denied Access');
        }
        $data = [];
        $data['page_title'] = "Edit Announcement";
        $data['action'] = 'Edit';
        $data['announcement'] = Announcement::find($id);
        return Inertia::render('AdmVram/AnnouncementForm',$data);
    }

    public function saveEditAnnouncement(Request $request){
        if (!CommonHelpers::isUpdate()) {
            CommonHelpers::redirect(CommonHelpers::adminPath(), 'Denied Access');
        }
        Announcement::where('id',$request['a_id'])
        ->update([
            'title'   => $request['title'],
            'message' => $request['message'],
            'status'  => $request['status'],
            'updated_by' => CommonHelpers::myId(),
            'updated_at' =>  date('Y-m-d H:i:s')
        ]);
        return json_encode(['message'=>'Updated successfully!', 'status'=>'success']);
    }
}

?>