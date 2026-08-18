<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketBacktestShareLink extends Model
{
    protected $fillable = [
        'adm_user_id',
        'market_backtest_account_id',
        'token_hash',
        'label',
        'scope_type',
        'session_id',
        'range_start_time',
        'range_end_time',
        'trade_ids',
        'include_journal',
        'include_snapshots',
        'include_analytics',
        'expires_at',
        'revoked_at',
        'last_viewed_at',
        'view_count',
    ];

    protected $casts = [
        'trade_ids' => 'array',
        'include_journal' => 'boolean',
        'include_snapshots' => 'boolean',
        'include_analytics' => 'boolean',
        'expires_at' => 'datetime',
        'revoked_at' => 'datetime',
        'last_viewed_at' => 'datetime',
        'view_count' => 'integer',
    ];

    /**
     * token_hash must never leak into the authenticated management UI (or any other
     * array/JSON serialization of this model). Belt-and-suspenders with the controller,
     * which also explicitly selects only safe columns rather than relying on this alone.
     */
    protected $hidden = [
        'token_hash',
    ];

    public function user()
    {
        return $this->belongsTo(AdmUser::class, 'adm_user_id');
    }

    public function account()
    {
        return $this->belongsTo(MarketBacktestAccount::class, 'market_backtest_account_id');
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && now()->gte($this->expires_at);
    }
}
