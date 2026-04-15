<?php

namespace App\Models\AdmModels;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmUserProfiles extends Model
{
    use HasFactory;
    protected $table = 'adm_user_profiles';
    protected $fillable = [
        'adm_user_id',
        'file_name',
        'ext',
        'archived',
        'created_by',
        'created_at',
        'updated_at',
    ];
}
