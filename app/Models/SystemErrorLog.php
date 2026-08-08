<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemErrorLog extends Model
{
    protected $guarded = [];
    protected $casts = [
        'context' => 'array',
        'last_seen_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(AdmUser::class, 'adm_user_id');
    }
}
