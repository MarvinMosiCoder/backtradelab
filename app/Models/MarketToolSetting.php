<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketToolSetting extends Model
{
    protected $fillable = [
        'adm_user_id',
        'settings',
    ];

    protected $casts = [
        'settings' => 'array',
    ];
}
