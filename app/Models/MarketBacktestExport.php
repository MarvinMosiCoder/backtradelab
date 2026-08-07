<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketBacktestExport extends Model
{
    protected $fillable = [
        'adm_user_id',
        'market_backtest_account_id',
        'format',
        'symbol',
        'session_id',
        'row_limit',
        'status',
        'file_path',
        'filename',
        'error',
    ];

    public function user()
    {
        return $this->belongsTo(AdmUser::class, 'adm_user_id');
    }

    public function account()
    {
        return $this->belongsTo(MarketBacktestAccount::class, 'market_backtest_account_id');
    }
}
