<?php

namespace App\Models\AdmModels;

use app\Helpers\CommonHelpers;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiConfiguration extends Model
{
    use HasFactory;
    
    public static function boot()
    {
        parent::boot();
        static::creating(function($model)
        {
            $model->created_by = CommonHelpers::myId();
            $model->updated_at = null;
        });
        static::updating(function($model)
        {
            $model->updated_by = CommonHelpers::myId();
        });
    }

    protected $fillable = [
        'name',
        'table_name',
        'fields',
        'relations',
        'rules',
        'sql_parameter',
        'endpoint',
        'method',
        'action_type',
        'action_type',
        'auth_type',
        'enable_logging',
        'rate_limit',
        'status',
        'created_by'
    ];

    protected $filterable = [
        'id',
        'name',
        'table_name',
        'method',
        'endpoint',
        'status',
    ];

    // Statuses
    const STATUS_ACTIVE = 1;
    const STATUS_INACTIVE = 0;

    // API Methods
    const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'ALL'];

    // Authentication Types
    const AUTH_TYPES = ['X-API-KEY', 'jwt', 'api_key', 'oauth', 'hmac'];

    // Cast JSON fields to array
    protected $casts = [
        'fields' => 'array',
        'relations' => 'array',
        'rules' => 'array',
    ];

    public function isActive()
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public static function getActiveApis()
    {
        return self::where('status', self::STATUS_ACTIVE)->get();
    }

    public function scopeSearchAndFilter($query, $request){

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($query) use ($search) {
                foreach ($this->filterable as $field) {
                    if ($field === 'status') {
                        if ($search === "ACTIVE"){
                            $query->orWhere($field, '=', 1);
                        }
                        if ($search === "INACTIVE"){
                            $query->orWhere($field, '=', 0);
                        }
                    }
                    else {
                        $query->orWhere($field, 'LIKE', "%$search%");
                    }
                }
            });
        }

        foreach ($this->filterable as $field) {
            if ($request->filled($field)) {
                $value = $request->input($field);
                if ($field === 'status') {
                    $query->where($field, '=', $value);
                }
                else{
                    $query->where($field, 'LIKE', "%$value%");
                }
            }
        }
    
        return $query;

    }
}
