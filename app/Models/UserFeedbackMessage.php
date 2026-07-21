<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFeedbackMessage extends Model
{
    protected $fillable = ['user_feedback_id', 'adm_user_id', 'message', 'read_at'];
    protected $casts = ['read_at' => 'datetime'];

    public function feedback(): BelongsTo
    {
        return $this->belongsTo(UserFeedback::class, 'user_feedback_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(AdmUser::class, 'adm_user_id');
    }
}
