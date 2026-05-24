<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketBacktestPosition extends Model
{
    protected $fillable = [
        'market_backtest_account_id',
        'market_backtest_session_id',
        'symbol',
        'side',
        'quantity',
        'entry_price',
        'margin',
        'leverage',
        'entry_fee',
        'exit_fee',
        'realized_pnl',
        'exit_price',
        'opened_at_time',
        'closed_at_time',
        'stop_loss',
        'take_profit',
        'status',
        'setup_tag',
        'tags',
        'entry_reason',
        'exit_reason',
        'mistake',
        'emotion',
        'journal_notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:10',
        'entry_price' => 'decimal:8',
        'margin' => 'decimal:8',
        'leverage' => 'decimal:2',
        'entry_fee' => 'decimal:8',
        'exit_fee' => 'decimal:8',
        'realized_pnl' => 'decimal:8',
        'exit_price' => 'decimal:8',
        'stop_loss' => 'decimal:8',
        'take_profit' => 'decimal:8',
        'tags' => 'array',
    ];

    public function account()
    {
        return $this->belongsTo(MarketBacktestAccount::class, 'market_backtest_account_id');
    }

    public function session()
    {
        return $this->belongsTo(MarketBacktestSession::class, 'market_backtest_session_id');
    }

    public function trades()
    {
        return $this->hasMany(MarketBacktestTrade::class);
    }

    public function snapshots()
    {
        return $this->hasMany(MarketBacktestSnapshot::class);
    }
}
