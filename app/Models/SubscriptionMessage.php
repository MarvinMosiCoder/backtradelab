<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionMessage extends Model
{
    protected $guarded = [];

    public function user() { return $this->belongsTo(AdmUser::class, 'adm_user_id'); }
    public function subscriptionRequest() { return $this->belongsTo(SubscriptionRequest::class); }
}
