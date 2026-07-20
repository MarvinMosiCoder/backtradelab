<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (
            app()->environment('production')
            && config('market-data.require_redis_in_production', true)
            && config('cache.default') !== 'redis'
        ) {
            throw new \RuntimeException('Production market-data locks and rate limits require CACHE_DRIVER=redis.');
        }
        //
    }
}
