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

        if (!$user->replay_trial_started_at) {
            $user->forceFill([
                'replay_trial_started_at' => now(),
                'replay_trial_ends_at' => now()->addDays(7),
            ])->save();
        }

        $allowed = ($user->replay_trial_ends_at && now()->lte($user->replay_trial_ends_at))
            || ($user->replay_access_ends_at && now()->lte($user->replay_access_ends_at));

        if (!$allowed) {
            return response()->json(['message' => 'Your replay access has expired.', 'code' => 'replay_subscription_required'], 402);
        }

        return $next($request);
    }
}
