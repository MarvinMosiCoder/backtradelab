<?php

namespace App\Http\Controllers\Admin;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AdmModels\AdmPrivileges;
use App\Models\AdmUser;
use App\Exports\Export;
use Maatwebsite\Excel\Facades\Excel;
use PDF;
use Illuminate\Support\Str;

class AdmRequestController extends Controller
{
   public function privilegesFilter(){
        $data = AdmPrivileges::filterData()->get();
        return response()->json($data);
   }
   public function export(Request $request){
        ini_set('memory_limit', '1024M');
        set_time_limit(180);
   
        $fields = $request->all();
        $table = $fields['table_name'];
        $columns = $fields['columns'];
        $filetype = $fields['fileformat'];
        $filename = preg_replace('/[\/\\\\]/', '-', $fields['filename']);
        $pagesize = $fields['page_size'] ?? 'A4'; // Default size
        $limit = $fields['limit'];
        $pageorientation = $fields['page_orientation'] ?? 'portrait'; // Default orientation
        $filters = json_decode($fields['filters'] ?? '[]', true);
        switch ($filetype) {
            case 'pdf':
                $data = (new Export($table, $columns,($filters['filter_column'] ?? []), $limit))->query();
                $pdf = PDF::loadView('exports', ['data' => $data])
                        ->setPaper($pagesize, $pageorientation);
                return response($pdf->output(), 200, [
                    'Content-Type' => 'application/pdf',
                    'Content-Disposition' => 'attachment; filename="' . $filename . '.pdf"',
                ]);

            case 'xls':
                return Excel::download(new Export($table, $columns,($filters['filter_column'] ?? []), $limit), $filename . '.xlsx');

            case 'csv':
                return Excel::download(new Export($table, $columns,($filters['filter_column'] ?? []), $limit), $filename . '.csv');

            default:
                return response()->json(['error' => 'Unsupported file format'], 400);
        }
    }

   public function usersFilter(){
        $data = AdmUser::filterData()->get();
        return response()->json($data);
   }

   public function usersFilterData(Request $request){
        $tableName = $request->tableName;

        // Convert table name to PascalCase model name
        $modelName = Str::studly($tableName);
        // Define the model namespace
        $modelClass = "App\\Models\\$modelName";

        if (class_exists($modelClass)) {
            // If model exists, use it with filterData()
            $data = $modelClass::filterData()->get();
        } else {
            // If no model exists, fallback to raw query
            $data = DB::table($tableName)->get();
        }

        return response()->json($data);
    }
}
