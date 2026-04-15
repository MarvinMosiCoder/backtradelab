<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Session;
class CheckUserForceChangePassword
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if(Session::get('check_user')){
            return redirect()->route('show-change-force-password')->send();
        }
        if(Session::get('unread-announcement') === true){
            return redirect()->route('show-announcement')->send();
        }
        return $next($request);
    }
}
