<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ImportedTradeBatch extends Model
{
    protected $fillable = [
        'adm_user_id',
        'broker',
        'original_filename',
        'file_path',
        'column_mapping',
        'source_timezone',
        'status',
        'total_rows',
        'imported_rows',
        'duplicate_rows',
        'error_rows',
        'error',
        'row_errors',
    ];

    protected $casts = [
        'column_mapping' => 'array',
        'row_errors' => 'array',
        'total_rows' => 'integer',
        'imported_rows' => 'integer',
        'duplicate_rows' => 'integer',
        'error_rows' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(AdmUser::class, 'adm_user_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ImportedTrade::class, 'imported_trade_batch_id');
    }
}
