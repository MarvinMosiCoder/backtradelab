<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketBacktestSnapshot extends Model
{
    protected $fillable = [
        'market_backtest_account_id',
        'market_backtest_session_id',
        'market_backtest_position_id',
        'type',
        'path',
        'url',
        'captured_at_time',
    ];

    public function account()
    {
        return $this->belongsTo(MarketBacktestAccount::class, 'market_backtest_account_id');
    }

    public function session()
    {
        return $this->belongsTo(MarketBacktestSession::class, 'market_backtest_session_id');
    }

    public function position()
    {
        return $this->belongsTo(MarketBacktestPosition::class, 'market_backtest_position_id');
    }
}
