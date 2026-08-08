<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentActivityLog extends Model
{
    protected $guarded = [];
    protected $casts = [
        'context' => 'array',
    ];

    public function subscriptionRequest()
    {
        return $this->belongsTo(SubscriptionRequest::class);
    }

    public function user()
    {
        return $this->belongsTo(AdmUser::class, 'adm_user_id');
    }
}
