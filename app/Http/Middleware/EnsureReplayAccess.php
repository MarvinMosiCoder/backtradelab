<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\AdminAccessService;

class EnsureReplayAccess
{
    public function __construct(private readonly AdminAccessService $adminAccess)
    {
    }

    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (!$user) abort(401);

        if ($this->adminAccess->isSuperadmin($request->user())) return $next($request);

        $allowed = ($user->replay_trial_ends_at && now()->lte($user->replay_trial_ends_at))
            || ($user->replay_access_ends_at && now()->lte($user->replay_access_ends_at));

        if (!$allowed) {
            return response()->json([
                'message' => $user->replay_trial_started_at
                    ? 'Your replay access has expired.'
                    : 'Activate your free seven-day trial to use replay and backtesting.',
                'code' => 'replay_subscription_required',
                'trialAvailable' => !$user->replay_trial_started_at,
            ], 402);
        }

        return $next($request);
    }
}
