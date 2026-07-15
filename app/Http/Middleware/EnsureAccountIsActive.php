<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user || in_array(strtoupper((string) $user->status), ['ACTIVE', '1'], true)) {
            return $next($request);
        }

        Auth::logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        $message = 'Your account is deactivated. Contact an administrator if you want to reactivate it.';

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json([
                'message' => $message,
                'code' => 'ACCOUNT_INACTIVE',
            ], 403);
        }

        return redirect()->route('login')->withErrors(['message' => $message]);
    }
}
