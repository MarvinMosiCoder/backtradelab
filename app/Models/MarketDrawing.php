<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketDrawing extends Model
{
    protected $fillable = [
        'adm_user_id',
        'symbol',
        'drawings',
    ];

    protected $casts = [
        'drawings' => 'array',
    ];
}
