<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketPriceAlert extends Model
{
    protected $guarded = [];
    protected $casts = ['target_price' => 'decimal:10', 'last_price' => 'decimal:10', 'triggered_at' => 'datetime', 'expires_at' => 'datetime'];
}
