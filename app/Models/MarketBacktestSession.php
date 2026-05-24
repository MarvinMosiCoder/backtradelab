<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketBacktestSession extends Model
{
    protected $fillable = [
        'market_backtest_account_id',
        'adm_user_id',
        'name',
        'symbol',
        'exchange',
        'market_category',
        'timeframe',
        'starting_balance',
        'started_at_time',
        'ended_at_time',
        'status',
        'notes',
    ];

    protected $casts = [
        'starting_balance' => 'decimal:8',
    ];

    public function account()
    {
        return $this->belongsTo(MarketBacktestAccount::class, 'market_backtest_account_id');
    }

    public function positions()
    {
        return $this->hasMany(MarketBacktestPosition::class);
    }

    public function trades()
    {
        return $this->hasMany(MarketBacktestTrade::class);
    }
}
