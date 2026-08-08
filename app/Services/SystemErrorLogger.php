<?php

namespace App\Services;

use App\Models\SystemErrorLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class SystemErrorLogger
{
    private const AREA_KEYWORDS = [
        'payments' => ['Payments', 'PayMongo', 'Subscription'],
        'backtest' => ['Backtest', 'Replay'],
    ];

    /**
     * Persist an exception to the system_error_logs table for admin review. Never throws —
     * a failure here must not turn one error into two, so it falls back to the normal log file.
     */
    public function log(Throwable $exception, ?Request $request = null): void
    {
        try {
            $area = $this->classifyArea($exception);
            $file = $exception->getFile();
            $line = $exception->getLine();
            $exceptionClass = get_class($exception);

            $existing = SystemErrorLog::query()
                ->where('exception_class', $exceptionClass)
                ->where('file', $file)
                ->where('line', $line)
                ->whereNull('resolved_at')
                ->where('created_at', '>=', now()->subHour())
                ->first();

            if ($existing) {
                $existing->increment('occurrences');
                $existing->forceFill(['last_seen_at' => now()])->save();
                return;
            }

            SystemErrorLog::query()->create([
                'area' => $area,
                'level' => 'error',
                'exception_class' => $exceptionClass,
                'message' => mb_substr($exception->getMessage() ?: '(no message)', 0, 2000),
                'file' => $file,
                'line' => $line,
                'trace' => mb_substr($exception->getTraceAsString(), 0, 20000),
                'url' => $request?->fullUrl(),
                'method' => $request?->method(),
                'ip' => $request?->ip(),
                'adm_user_id' => $request?->user()?->id,
                'last_seen_at' => now(),
            ]);
        } catch (Throwable $loggingFailure) {
            Log::error('Failed to persist system error log: '.$loggingFailure->getMessage());
        }
    }

    private function classifyArea(Throwable $exception): string
    {
        $file = $exception->getFile();
        foreach (self::AREA_KEYWORDS as $area => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($file, $keyword)) return $area;
            }
        }
        return 'general';
    }
}
