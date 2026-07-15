<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionRequest extends Model
{
    protected $guarded = [];
    protected $casts = [
        'reviewed_at' => 'datetime',
        'paid_at' => 'datetime',
        'failed_at' => 'datetime',
        'livemode' => 'boolean',
        'amount' => 'decimal:2',
    ];
    public function user() { return $this->belongsTo(AdmUser::class, 'adm_user_id'); }
    public function messages() { return $this->hasMany(SubscriptionMessage::class); }
}
