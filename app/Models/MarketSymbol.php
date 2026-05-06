<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketSymbol extends Model
{
    protected $fillable = [
        'symbol',
        'category',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
