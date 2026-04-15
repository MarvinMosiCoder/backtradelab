<?php

namespace App\Models\AdmModels;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class admMenusPrivileges extends Model
{
    use HasFactory;

    protected $fillable = [

        'id',
        'id_adm_menus',
        'id_adm_privileges',
 
    ];

    public $timestamps = false;

    public function getPrivilege(){
        return $this->belongsTo(AdmPrivileges::class, 'id_adm_privileges', 'id',);
    }
}
