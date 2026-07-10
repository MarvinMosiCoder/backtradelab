<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketReplayProgress extends Model
{
    protected $fillable = [
        'adm_user_id',
        'symbol',
        'exchange',
        'category',
        'timeframe',
        'replay_time',
        'selected_price',
        'client_saved_at',
    ];

    protected $casts = [
        'replay_time' => 'integer',
        'selected_price' => 'float',
        'client_saved_at' => 'integer',
    ];
}
