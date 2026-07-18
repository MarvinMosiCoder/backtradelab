<?php

namespace App\Services;

use App\Models\AdmUser;
use App\Models\Announcement;
use Illuminate\Support\Str;

class MarketOverviewService
{
    public function payload(AdmUser $user): array
    {
        $readIds = $user->announcements()->pluck('announcements.id')->map(fn ($id) => (int) $id)->all();
        $announcements = Announcement::query()
            ->where('status', 'ACTIVE')
            ->latest()
            ->limit(4)
            ->get()
            ->map(fn (Announcement $announcement) => [
                'id' => $announcement->id,
                'title' => $announcement->title ?: 'System update',
                'excerpt' => $this->sanitizeExcerpt($announcement->message),
                'created_at' => optional($announcement->created_at)->toIso8601String(),
                'is_read' => in_array((int) $announcement->id, $readIds, true),
            ])
            ->values();

        return [
            'featured_markets' => collect(config('market_overview.featured_markets', []))
                ->map(fn ($market) => [
                    'exchange' => strtolower((string) ($market['exchange'] ?? 'bybit')),
                    'category' => strtolower((string) ($market['category'] ?? 'spot')),
                    'symbol' => strtoupper((string) ($market['symbol'] ?? '')),
                ])
                ->filter(fn ($market) => $market['symbol'] !== '')
                ->values(),
            'announcements' => $announcements,
            'tips' => array_values(config('market_overview.tips', [])),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function sanitizeExcerpt(?string $message, int $limit = 240): string
    {
        $withoutExecutableContent = preg_replace('/<(script|style)\b[^>]*>.*?<\/\1>/is', ' ', (string) $message);
        $plain = html_entity_decode(strip_tags($withoutExecutableContent), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $plain = preg_replace('/\s+/u', ' ', $plain);
        return Str::limit(trim($plain), $limit);
    }
}
