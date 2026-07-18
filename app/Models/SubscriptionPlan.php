<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    protected $guarded = [];
    protected $casts = [
        'price' => 'decimal:2',
        'features' => 'array',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
    ];

    public static function normalizeFeatures(?array $features): array
    {
        return collect($features ?? [])
            ->map(fn ($feature) => trim((string) $feature))
            ->filter()
            ->unique(fn ($feature) => mb_strtolower($feature))
            ->take(8)
            ->values()
            ->all();
    }
}
