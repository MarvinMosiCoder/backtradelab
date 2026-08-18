<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingChallengeAttempt extends Model
{
    protected $fillable = [
        'adm_user_id',
        'training_challenge_id',
        'market_backtest_account_id',
        'starting_balance_snapshot',
        'started_at',
        'status',
        'completed_at',
        'result_snapshot',
    ];

    protected $casts = [
        'starting_balance_snapshot' => 'decimal:8',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'result_snapshot' => 'array',
    ];

    public function challenge()
    {
        return $this->belongsTo(TrainingChallenge::class, 'training_challenge_id');
    }

    public function account()
    {
        return $this->belongsTo(MarketBacktestAccount::class, 'market_backtest_account_id');
    }

    public function user()
    {
        return $this->belongsTo(AdmUser::class, 'adm_user_id');
    }
}
