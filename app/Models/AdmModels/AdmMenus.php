<?php

namespace App\Models\AdmModels;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmMenus extends Model
{
    use HasFactory;
    
    protected $fillable = [

        'id',
        'name',
        'type',
        'path',
        'slug',
        'color',
        'icon',
        'parent_id',
        'is_active',
        'is_dashboard',
        'id_adm_privileges',
        'sorting',
        'created_at',
        'updated_at',
    ];

    public function children(){
        return $this->hasMany(AdmMenus::class, 'parent_id', 'id');
    }

    public function getMenusPrivileges(){
        return $this->hasMany(admMenusPrivileges::class, 'id_adm_menus', 'id',);
    }
}
