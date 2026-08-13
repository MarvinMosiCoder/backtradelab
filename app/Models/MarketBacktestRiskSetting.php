<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketBacktestRiskSetting extends Model
{
    protected $fillable = [
        'adm_user_id', 'mode', 'max_daily_loss', 'max_trades_per_day',
        'max_concurrent_positions', 'max_consecutive_losses', 'is_enabled',
    ];

    protected $casts = [
        'max_daily_loss' => 'decimal:8',
        'max_trades_per_day' => 'integer',
        'max_concurrent_positions' => 'integer',
        'max_consecutive_losses' => 'integer',
        'is_enabled' => 'boolean',
    ];
}
