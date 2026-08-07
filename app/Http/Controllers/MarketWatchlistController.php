<?php

namespace App\Http\Controllers;

use App\Models\MarketWatchlist;
use Illuminate\Http\Request;

class MarketWatchlistController extends Controller
{
    public function show(Request $request)
    {
        $record = MarketWatchlist::query()
            ->where('adm_user_id', $request->user()->id)
            ->first();

        return response()->json([
            'success' => true,
            'exists' => (bool) $record,
            'watchlists' => $record?->data ?? ['Main' => []],
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'data' => ['present', 'array'],
        ]);

        $record = MarketWatchlist::query()->updateOrCreate(
            [
                'adm_user_id' => $request->user()->id,
            ],
            [
                'data' => $validated['data'],
            ]
        );

        return response()->json([
            'success' => true,
            'watchlists' => $record->data,
        ]);
    }
}
