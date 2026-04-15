<?php

namespace App\Models\AdmModels;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApiKeys extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [ 
        'secret_key', 
        'status', 
        'expires_at',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    // Status Constants
    const STATUS_ACTIVE = 1;
    const STATUS_REVOKED = 0;

    public function isValid()
    {
        return $this->status === self::STATUS_ACTIVE && ($this->expires_at === null || now()->lt($this->expires_at) && $this->deleted_at === null);
    }
}
