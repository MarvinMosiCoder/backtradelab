<?php

namespace App\Console\Commands;

use App\Services\MarketAlertMonitor;
use Illuminate\Console\Command;

class MonitorMarketAlerts extends Command
{
    protected $signature = 'market-alerts:monitor {--once : Run a single polling cycle} {--force : Run even when disabled}';
    protected $description = 'Monitor active market price alerts';

    public function handle(MarketAlertMonitor $monitor): int
    {
        if (!config('market-alerts.enabled') && !$this->option('force')) {
            $this->warn('Market alerts are disabled. Set MARKET_ALERTS_ENABLED=true or pass --force.');
            return self::SUCCESS;
        }
        do {
            $monitor->runOnce();
            if ($this->option('once')) break;
            sleep((int) config('market-alerts.poll_seconds', 5));
        } while (true);
        return self::SUCCESS;
    }
}
