<?php

namespace App\Http\Controllers\Admin; 
use App\Helpers\CommonHelpers;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AdmModels\AdmNotifications;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
class NotificationsController extends Controller{

    private $sortBy;
    private $sortDir;
    private $perPage;
    private $table_name;
    private $primary_key;
    public function __construct() {
        $this->table_name  =  'adm_notifications';
        $this->primary_key = 'id';
        $this->sortBy = request()->get('sortBy', 'adm_notifications.id');
        $this->sortDir = request()->get('sortDir', 'asc');
        $this->perPage = request()->get('perPage', 10);
    }

    public function getIndex(){
        if (!CommonHelpers::isView()) {
            CommonHelpers::redirect(CommonHelpers::adminPath(), 'Denied Access');
        }
        $data = [];
        $data['page_title'] = 'Notifications';
        $query = AdmNotifications::getAllNotifications();

        $query->when(request('search'), function ($query, $search) {
            $query->where('adm_logs.content', 'LIKE', "%$search%");
        });

        $data['notifications'] = $query->orderBy($this->sortBy, $this->sortDir)->paginate($this->perPage)->withQueryString();
        $data['queryParams'] = request()->query();

        return Inertia::render('AdmVram/Notifications',$data);
    }

    public function markAsRead(Request $request)
    {
        $notification = AdmNotifications::where('id', $request['notification_id'])
            ->where('adm_user_id', CommonHelpers::myId())
            ->firstOrFail();
        
        $notification->update(['is_read' => true]);
        return json_encode(['message'=>'Read successfully!', 'status'=>'success']);
    }

    public function getLatestNotif()
    {
        $notifications = Auth::user()->notifications()->orderBy('created_at','DESC')->get();
        $unread_notifications = Auth::user()->notifications()->where('is_read', 0)->orderBy('created_at','DESC')->count();
        return response()->json(['notifications'=> $notifications,
                            'unread_notifications' => $unread_notifications]);
    }

    public function viewNotification($id){
        $data = [];
        $data['page_title'] = 'View Notification';
        $data['notification'] = AdmNotifications::where('id', $id)->firstOrFail();
        return Inertia::render('AdmVram/NotificationView', $data);
    }

    public function viewAllNotification(Request $request){
        $data = [];
        $data['page_title'] = 'View All Notification';
        $data['notifications'] = AdmNotifications::where('adm_user_id', CommonHelpers::myId())->get();
        return Inertia::render('AdmVram/NotificationsViewAll', $data);
    }

}

?>