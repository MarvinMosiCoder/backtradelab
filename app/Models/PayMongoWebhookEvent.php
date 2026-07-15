<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayMongoWebhookEvent extends Model
{
    protected $guarded = [];

    protected $casts = [
        'livemode' => 'boolean',
        'processed_at' => 'datetime',
    ];
}
