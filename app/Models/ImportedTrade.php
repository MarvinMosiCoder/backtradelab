<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportedTrade extends Model
{
    protected $fillable = [
        'adm_user_id',
        'imported_trade_batch_id',
        'broker',
        'symbol',
        'side',
        'quantity',
        'entry_price',
        'exit_price',
        'fee',
        'realized_pnl',
        'opened_at_time',
        'closed_at_time',
        'source_row_hash',
        'raw_row',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:10',
        'entry_price' => 'decimal:8',
        'exit_price' => 'decimal:8',
        'fee' => 'decimal:8',
        'realized_pnl' => 'decimal:8',
        'opened_at_time' => 'integer',
        'closed_at_time' => 'integer',
        'raw_row' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(AdmUser::class, 'adm_user_id');
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(ImportedTradeBatch::class, 'imported_trade_batch_id');
    }
}
