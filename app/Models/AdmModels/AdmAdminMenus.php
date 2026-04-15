<?php

namespace App\Models\AdmModels;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmAdminMenus extends Model
{
    use HasFactory;

    protected $fillable = [
        'id',
        'name',
        'type',
        'slug',
        'color',
        'icon',
        'parent_id',
        'is_active',
        'sorting',
        'created_at',
        'updated_at',
    ];

    public function children(){
        return $this->hasMany(AdmAdminMenus::class, 'parent_id', 'id');
    }
}
