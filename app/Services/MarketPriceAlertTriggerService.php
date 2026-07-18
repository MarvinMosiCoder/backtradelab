<?php

namespace App\Services;

use App\Models\AdmModels\AdmNotifications;
use App\Models\MarketPriceAlert;
use Illuminate\Support\Facades\DB;

class MarketPriceAlertTriggerService
{
    public function evaluate(
        string $exchange,
        string $category,
        string $symbol,
        float $price,
        ?int $userId = null
    ): array {
        $exchange = strtolower($exchange);
        $category = strtolower($category);
        $symbol = strtoupper($symbol);

        return DB::transaction(function () use ($exchange, $category, $symbol, $price, $userId) {
            $alerts = MarketPriceAlert::query()
                ->where('status', 'active')
                ->where('exchange', $exchange)
                ->where('category', $category)
                ->where('symbol', $symbol)
                ->when($userId !== null, fn ($query) => $query->where('adm_user_id', $userId))
                ->lockForUpdate()
                ->get();

            $triggered = [];
            foreach ($alerts as $alert) {
                $target = (float) $alert->target_price;
                $last = $alert->last_price === null ? null : (float) $alert->last_price;
                $hit = $this->shouldTrigger($alert->direction, $last, $target, $price);

                if (!$hit) {
                    $alert->update(['last_price' => $price]);
                    continue;
                }

                $alert->update([
                    'status' => 'triggered',
                    'triggered_at' => now(),
                    'last_price' => $price,
                ]);

                $content = "{$alert->symbol} reached {$target} (current {$price}).";
                $notification = AdmNotifications::query()->firstOrCreate(
                    ['source_type' => 'market_price_alert', 'source_id' => $alert->id],
                    [
                        'adm_user_id' => $alert->adm_user_id,
                        'type' => 'price alert',
                        'content' => $content,
                        'metadata' => compact('exchange', 'category', 'symbol') + [
                            'target_price' => $target,
                            'price' => $price,
                        ],
                        'url' => '/notifications/view-all-notifications',
                        'is_read' => false,
                    ]
                );

                $triggered[] = [
                    'alert_id' => $alert->id,
                    'notification_id' => $notification->id,
                    'content' => $notification->content,
                ];
            }

            return $triggered;
        });
    }

    public function shouldTrigger(string $direction, ?float $last, float $target, float $price): bool
    {
        if ($direction === 'above') return $price >= $target;
        if ($direction === 'below') return $price <= $target;

        return $last !== null
            && (($last < $target && $price >= $target) || ($last > $target && $price <= $target));
    }
}
