<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingChallenge extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'description',
        'rules',
        'is_active',
    ];

    protected $casts = [
        'rules' => 'array',
        'is_active' => 'boolean',
    ];

    public function attempts()
    {
        return $this->hasMany(TrainingChallengeAttempt::class);
    }
}
