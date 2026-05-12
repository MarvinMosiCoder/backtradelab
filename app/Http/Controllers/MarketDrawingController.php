<?php

namespace App\Http\Controllers;

use App\Models\MarketDrawing;
use Illuminate\Http\Request;

class MarketDrawingController extends Controller
{
    public function show(Request $request)
    {
        $validated = $request->validate([
            'symbol' => ['required', 'string', 'max:32', 'regex:/^[A-Za-z0-9]+$/'],
        ]);

        $record = MarketDrawing::query()
            ->where('adm_user_id', $request->user()->id)
            ->where('symbol', strtoupper($validated['symbol']))
            ->first();

        return response()->json([
            'success' => true,
            'exists' => $record !== null,
            'drawings' => $record?->drawings ?? [],
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'symbol' => ['required', 'string', 'max:32', 'regex:/^[A-Za-z0-9]+$/'],
            'drawings' => ['present', 'array'],
        ]);

        $record = MarketDrawing::query()->updateOrCreate(
            [
                'adm_user_id' => $request->user()->id,
                'symbol' => strtoupper($validated['symbol']),
            ],
            [
                'drawings' => $validated['drawings'],
            ]
        );

        return response()->json([
            'success' => true,
            'drawings' => $record->drawings,
        ]);
    }
}
