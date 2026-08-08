<?php

namespace App\Exceptions;

use App\Services\SystemErrorLogger;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        // Laravel already excludes routine exceptions (validation, 404s, auth, etc.) from
        // reaching reportable() via its own $dontReport/internalDontReport lists, so this
        // callback only sees exceptions worth surfacing to admins.
        $this->reportable(function (Throwable $e) {
            app(SystemErrorLogger::class)->log($e, request());
        });
    }
}
