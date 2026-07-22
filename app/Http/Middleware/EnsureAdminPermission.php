<?php

namespace App\Http\Middleware;

use App\Services\AdminAccessService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminPermission
{
    public function __construct(private readonly AdminAccessService $access)
    {
    }

    public function handle(Request $request, Closure $next, string $module, string $action): Response
    {
        abort_unless($this->access->allows($request->user(), $module, $action), 403);

        return $next($request);
    }
}
