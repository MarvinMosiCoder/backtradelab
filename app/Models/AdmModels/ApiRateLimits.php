<?php

namespace App\Models\AdmModels;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiRateLimits extends Model
{
    use HasFactory;

    protected $fillable = ['api_id', 'user_id', 'ip_address', 'requests_made', 'reset_time'];

    protected $casts = [
        'reset_time' => 'datetime',
    ];
}
