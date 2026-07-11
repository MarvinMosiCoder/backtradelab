<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    protected $guarded = [];
    protected $casts = ['price' => 'decimal:2', 'is_featured' => 'boolean', 'is_active' => 'boolean'];
}
