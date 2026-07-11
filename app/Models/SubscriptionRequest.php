<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionRequest extends Model
{
    protected $guarded = [];
    protected $casts = ['reviewed_at' => 'datetime'];
    public function user() { return $this->belongsTo(AdmUser::class, 'adm_user_id'); }
}
