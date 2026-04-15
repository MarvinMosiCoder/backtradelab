<?php

namespace App\Models\AdmModels;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\AdmUser;

class AdmNotifications extends Model
{
    use HasFactory;
    protected $fillable = [
        'user_id',
        'type',
        'message',
        'is_read',
    ];

    public function scopeGetAllNotifications($query){
        return $query->leftJoin('adm_users','adm_notifications.adm_user_id','adm_users.id')
                     ->select('adm_notifications.id AS ID',
                              'adm_users.name AS User',
                              'adm_notifications.content AS Content',
                              'adm_notifications.is_read AS Mark',
                              'adm_notifications.created_at AS DateCreated');
    }

    public function user()
    {
        return $this->belongsTo(AdmUser::class);
    }
    
}
