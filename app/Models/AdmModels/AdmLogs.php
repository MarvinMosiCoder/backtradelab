<?php

namespace App\Models\AdmModels;

use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\AdmUser;

class AdmLogs extends Model
{
    use HasFactory;

    public function user(){
        return $this->belongsTo(AdmUser::class, 'id_adm_users', 'id');
    }
 
}
