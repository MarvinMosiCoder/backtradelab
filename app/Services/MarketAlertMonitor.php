<?php

namespace App\Services;

use App\Models\MarketPriceAlert;
use Illuminate\Support\Facades\Log;

class MarketAlertMonitor
{
    private array $failures = [];

    public function __construct(
        private readonly MarketCurrentPriceService $prices,
        private readonly MarketPriceAlertTriggerService $triggers
    ) {}

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
                $triggered += count($this->triggers->evaluate($group->exchange, $group->category, $group->symbol, $price));
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

}
