<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketWatchlist extends Model
{
    protected $fillable = [
        'adm_user_id',
        'data',
    ];

    protected $casts = [
        'data' => 'array',
    ];
}
