<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketBacktestPlaybook extends Model
{
    protected $fillable = [
        'adm_user_id',
        'name',
        'description',
        'entry_rules',
        'confirmation_rules',
        'invalidation_rules',
        'stop_rules',
        'target_rules',
        'checklist',
        'is_active',
    ];

    protected $casts = [
        'checklist' => 'array',
        'is_active' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(AdmUser::class, 'adm_user_id');
    }

    public function positions()
    {
        return $this->hasMany(MarketBacktestPosition::class);
    }
}
