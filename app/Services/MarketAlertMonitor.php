<?php

namespace App\Services;

use App\Models\AdmModels\AdmNotifications;
use App\Models\MarketPriceAlert;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MarketAlertMonitor
{
    private array $failures = [];

    public function __construct(private readonly MarketCurrentPriceService $prices) {}

    public function runOnce(): int
    {
        $groups = MarketPriceAlert::query()->where('status', 'active')
            ->get(['exchange', 'category', 'symbol'])->unique(fn ($a) => "{$a->exchange}:{$a->category}:{$a->symbol}");
        $triggered = 0;
        foreach ($groups as $group) {
            $key = "{$group->exchange}:{$group->category}:{$group->symbol}";
            if (($this->failures[$key]['retry_at'] ?? 0) > time()) continue;
            try {
                $price = $this->prices->fetch($group->exchange, $group->category, $group->symbol);
                $triggered += $this->evaluate($group->exchange, $group->category, $group->symbol, $price);
                unset($this->failures[$key]);
            } catch (\Throwable $exception) {
                $attempt = min(6, ($this->failures[$key]['attempt'] ?? 0) + 1);
                $this->failures[$key] = ['attempt' => $attempt, 'retry_at' => time() + min(60, 2 ** $attempt)];
                Log::warning('Price alert market poll failed', [
                    'exchange' => $group->exchange, 'category' => $group->category,
                    'symbol' => $group->symbol, 'message' => $exception->getMessage(),
                ]);
            }
        }
        return $triggered;
    }

    public function evaluate(string $exchange, string $category, string $symbol, float $price): int
    {
        return DB::transaction(function () use ($exchange, $category, $symbol, $price) {
            $alerts = MarketPriceAlert::query()->where('status', 'active')->where('exchange', $exchange)
                ->where('category', $category)->where('symbol', strtoupper($symbol))->lockForUpdate()->get();
            $triggered = 0;
            foreach ($alerts as $alert) {
                $target = (float) $alert->target_price;
                $last = $alert->last_price === null ? null : (float) $alert->last_price;
                $hit = $alert->direction === 'above' ? $price >= $target
                    : ($alert->direction === 'below' ? $price <= $target
                    : ($last !== null && (($last < $target && $price >= $target) || ($last > $target && $price <= $target))));
                if (!$hit) {
                    $alert->update(['last_price' => $price]);
                    continue;
                }
                $alert->update(['status' => 'triggered', 'triggered_at' => now(), 'last_price' => $price]);
                AdmNotifications::query()->firstOrCreate(
                    ['source_type' => 'market_price_alert', 'source_id' => $alert->id],
                    [
                        'adm_user_id' => $alert->adm_user_id, 'type' => 'price alert',
                        'content' => "{$alert->symbol} reached {$target} (current {$price}).",
                        'metadata' => ['exchange' => $exchange, 'category' => $category, 'symbol' => $symbol, 'target_price' => $target, 'price' => $price],
                        'url' => '/notifications/view-all-notifications', 'is_read' => false,
                    ]
                );
                $triggered++;
            }
            return $triggered;
        });
    }
}
