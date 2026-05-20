<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketSymbol extends Model
{
    protected $fillable = [
        'symbol',
        'exchange',
        'exchange_symbol',
        'coin_name',
        'base_coin',
        'quote_coin',
        'category',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
