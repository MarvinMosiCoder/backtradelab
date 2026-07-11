<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFeedback extends Model
{
    protected $fillable = [
        'adm_user_id',
        'category',
        'title',
        'description',
        'page_url',
        'status',
        'priority',
        'admin_response',
        'responded_by',
        'responded_at',
    ];

    protected $casts = [
        'responded_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(AdmUser::class, 'adm_user_id');
    }

    public function responder(): BelongsTo
    {
        return $this->belongsTo(AdmUser::class, 'responded_by');
    }
}
