<?php

namespace App\Http\Controllers;

use App\Services\MarketOverviewService;
use Illuminate\Http\Request;

class MarketOverviewController extends Controller
{
    public function __invoke(Request $request, MarketOverviewService $overview)
    {
        return response()->json($overview->payload($request->user()));
    }
}
