<?php

namespace App\Http\Controllers;

use App\Models\MarketReplayProgress;
use Illuminate\Http\Request;

class MarketReplayProgressController extends Controller
{
    public function show(Request $request)
    {
        $validated = $request->validate([
            'symbol' => ['required', 'string', 'max:30'],
            'exchange' => ['required', 'string', 'max:30'],
            'category' => ['required', 'string', 'max:30'],
        ]);

        $progress = MarketReplayProgress::query()
            ->where('adm_user_id', $request->user()->id)
            ->where('symbol', strtoupper($validated['symbol']))
            ->where('exchange', strtolower($validated['exchange']))
            ->where('category', strtolower($validated['category']))
            ->first();

        return response()->json([
            'success' => true,
            'progress' => $progress,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'symbol' => ['required', 'string', 'max:30'],
            'exchange' => ['required', 'string', 'max:30'],
            'category' => ['required', 'string', 'max:30'],
            'timeframe' => ['required', 'string', 'max:10'],
            'replay_time' => ['required', 'integer', 'min:1'],
            'selected_price' => ['nullable', 'numeric'],
            'client_saved_at' => ['required', 'integer', 'min:1'],
        ]);

        $progress = MarketReplayProgress::query()->firstOrNew([
            'adm_user_id' => $request->user()->id,
            'symbol' => strtoupper($validated['symbol']),
            'exchange' => strtolower($validated['exchange']),
            'category' => strtolower($validated['category']),
        ]);

        if (
            !$progress->exists
            || (int) $validated['client_saved_at'] >= (int) ($progress->client_saved_at ?? 0)
        ) {
            $progress->fill([
                'timeframe' => $validated['timeframe'],
                'replay_time' => $validated['replay_time'],
                'selected_price' => $validated['selected_price'] ?? null,
                'client_saved_at' => $validated['client_saved_at'],
            ])->save();
        }

        return response()->json([
            'success' => true,
            'progress' => $progress,
        ]);
    }
}
