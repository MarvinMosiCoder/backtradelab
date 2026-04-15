<?php

namespace App\Models\AdmModels;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiLogs extends Model
{
    use HasFactory;

    protected $fillable = ['api_id', 'method', 'ip_address', 'user_id', 'request_data', 'response_data', 'status_code', 'headers'];

    protected $casts = [
        'request_data' => 'array',
        'response_data' => 'array',
        'headers' => 'array',
    ];
}
