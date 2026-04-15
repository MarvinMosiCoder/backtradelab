<?php

namespace App\Http\Controllers\Admin; 
use App\Helpers\CommonHelpers;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AdmModels\AdmLogs;
use Inertia\Inertia;

class LogsController extends Controller{

    private $sortBy;
    private $sortDir;
    private $perPage;
    private $table_name;
    private $primary_key;
    public function __construct() {
        $this->table_name  =  'adm_logs';
        $this->primary_key = 'id';
        $this->sortBy = request()->get('sortBy', 'adm_logs.created_at');
        $this->sortDir = request()->get('sortDir', 'desc');
        $this->perPage = request()->get('perPage', 10);
    }

    public function getIndex(){

        $query = AdmLogs::query()->with('user');

        $query->when(request('search'), function ($query, $search) {
            $query->where('adm_logs.ipaddress', 'LIKE', "%$search%");
        });


        $logs = $query->orderBy($this->sortBy, $this->sortDir)->paginate($this->perPage)->withQueryString();

        if (!CommonHelpers::isView()) {
            CommonHelpers::redirect(CommonHelpers::adminPath(), 'Denied Access');
        }


        return Inertia::render('AdmVram/Logs', [
            'logs' => $logs,
            'queryParams' => request()->query()
        ]);
    }

}

?>