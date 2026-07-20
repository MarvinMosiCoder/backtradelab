<?php

namespace App\Services;

use App\Exceptions\ExchangeRateLimitedException;
use GuzzleHttp\Psr7\Response as GuzzleResponse;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

class ExchangeMarketDataGateway
{
    public function get(string $exchange, string $endpoint, string $url, array $query = [], ?int $cacheSeconds = null): Response
    {
        $exchange = strtolower($exchange);
        $cacheSeconds ??= (int) config('market-data.request_cache_seconds', 30);
        $signature = hash('sha256', $url.'?'.http_build_query($query));
        $freshKey = "exchange-market:fresh:{$exchange}:{$endpoint}:{$signature}";
        $staleKey = "exchange-market:stale:{$exchange}:{$endpoint}:{$signature}";

        if ($cacheSeconds > 0 && ($cached = Cache::get($freshKey))) {
            return $this->restore($cached);
        }

        $cooldown = $this->cooldownRemaining($exchange);
        if ($cooldown > 0) {
            if ($cached = Cache::get($staleKey)) return $this->restore($cached);
            throw new ExchangeRateLimitedException($exchange, $cooldown);
        }

        $lock = Cache::lock("exchange-market:lock:{$exchange}:{$endpoint}:{$signature}", 20);
        try {
            return $lock->block(3, function () use ($exchange, $endpoint, $url, $query, $cacheSeconds, $freshKey, $staleKey) {
                if ($cacheSeconds > 0 && ($cached = Cache::get($freshKey))) return $this->restore($cached);
                $this->reserveBudget($exchange);

                $started = microtime(true);
                $response = $this->http()->get($url, $query);
                $duration = (int) round((microtime(true) - $started) * 1000);

                if ($this->isLimited($response)) {
                    $retryAfter = $this->activateCooldown($exchange, $response);
                    Log::warning('Exchange market data cooldown activated.', compact('exchange', 'endpoint', 'duration', 'retryAfter'));
                    if ($cached = Cache::get($staleKey)) return $this->restore($cached);
                    throw new ExchangeRateLimitedException($exchange, $retryAfter);
                }

                if ($response->successful()) {
                    Cache::forget("exchange-market:strikes:{$exchange}");
                    $stored = $this->store($response);
                    if ($cacheSeconds > 0) Cache::put($freshKey, $stored, now()->addSeconds($cacheSeconds));
                    Cache::put($staleKey, $stored, now()->addSeconds((int) config('market-data.stale_cache_seconds', 300)));
                }

                Log::info('Exchange market data request.', [
                    'exchange' => $exchange,
                    'endpoint' => $endpoint,
                    'status' => $response->status(),
                    'duration_ms' => $duration,
                    'cache' => 'miss',
                ]);

                return $response;
            });
        } catch (\Illuminate\Contracts\Cache\LockTimeoutException) {
            if ($cached = Cache::get($staleKey)) return $this->restore($cached);
            throw new ExchangeRateLimitedException($exchange, 3, 'A matching market-data refresh is already running.');
        }
    }

    private function reserveBudget(string $exchange): void
    {
        $limit = (int) config("market-data.budgets_per_second.{$exchange}", 5);
        $deadline = microtime(true) + 2;
        do {
            if (RateLimiter::attempt("exchange-market-budget:{$exchange}", $limit, fn () => true, 1)) return;
            usleep(125000);
        } while (microtime(true) < $deadline);

        throw new ExchangeRateLimitedException($exchange, 1, 'The local exchange request budget is exhausted.');
    }

    private function cooldownRemaining(string $exchange): int
    {
        $until = (int) Cache::get("exchange-market:cooldown:{$exchange}", 0);
        return max(0, $until - time());
    }

    private function activateCooldown(string $exchange, Response $response): int
    {
        Cache::add("exchange-market:strikes:{$exchange}", 0, now()->addHour());
        $strikes = (int) Cache::increment("exchange-market:strikes:{$exchange}");
        Cache::put("exchange-market:strikes:{$exchange}", $strikes, now()->addHour());
        $header = (int) ($response->header('Retry-After') ?? 0);
        $base = $response->status() === 418 ? 120 : 5;
        $retryAfter = max($header, min((int) config('market-data.cooldown_max_seconds', 900), $base * (2 ** min($strikes - 1, 7))));
        $retryAfter += random_int(0, max(1, (int) ceil($retryAfter * .2)));
        Cache::put("exchange-market:cooldown:{$exchange}", time() + $retryAfter, now()->addSeconds($retryAfter));
        return $retryAfter;
    }

    private function isLimited(Response $response): bool
    {
        if (in_array($response->status(), [418, 429], true)) return true;
        $code = (string) ($response->json('code') ?? $response->json('retCode') ?? '');
        return in_array($code, ['50011', '10006', '429'], true);
    }

    private function http(): PendingRequest
    {
        return Http::withOptions(['verify' => filter_var(config('services.market_data.verify_tls', true), FILTER_VALIDATE_BOOL)])
            ->withHeaders(['User-Agent' => 'BacktradeLab/1.0', 'Accept' => 'application/json'])
            ->timeout(20);
    }

    private function store(Response $response): array
    {
        return ['status' => $response->status(), 'headers' => $response->headers(), 'body' => $response->body()];
    }

    private function restore(array $stored): Response
    {
        return new Response(new GuzzleResponse($stored['status'], $stored['headers'], $stored['body']));
    }
}
