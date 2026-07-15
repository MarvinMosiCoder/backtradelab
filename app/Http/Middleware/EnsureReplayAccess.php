<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureReplayAccess
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (!$user) abort(401);

        if ($request->session()->get('admin_is_superadmin')) return $next($request);

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
