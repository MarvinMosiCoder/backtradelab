<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketBacktestTrade extends Model
{
    protected $fillable = [
        'market_backtest_account_id',
        'market_backtest_position_id',
        'symbol',
        'side',
        'action',
        'quantity',
        'price',
        'notional',
        'fee',
        'pnl',
        'executed_at_time',
    ];

    protected $casts = [
        'quantity' => 'decimal:10',
        'price' => 'decimal:8',
        'notional' => 'decimal:8',
        'fee' => 'decimal:8',
        'pnl' => 'decimal:8',
    ];

    public function account()
    {
        return $this->belongsTo(MarketBacktestAccount::class, 'market_backtest_account_id');
    }

    public function position()
    {
        return $this->belongsTo(MarketBacktestPosition::class, 'market_backtest_position_id');
    }
}
