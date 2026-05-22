<?php

namespace App\Http\Controllers;

use App\Models\MarketDrawing;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MarketDrawingController extends Controller
{
    public function show(Request $request)
    {
        $validated = $request->validate([
            'symbol' => ['required', 'string', 'max:32', 'regex:/^[A-Za-z0-9]+$/'],
            'exchange' => ['nullable', Rule::in(['binance', 'bybit', 'okx', 'bingx', 'mexc'])],
            'category' => ['nullable', Rule::in(['spot', 'linear', 'inverse'])],
        ]);
        $exchange = strtolower($validated['exchange'] ?? 'bybit');
        $category = $validated['category'] ?? 'spot';

        $record = MarketDrawing::query()
            ->where('adm_user_id', $request->user()->id)
            ->where('exchange', $exchange)
            ->where('category', $category)
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
            'exchange' => ['nullable', Rule::in(['binance', 'bybit', 'okx', 'bingx', 'mexc'])],
            'category' => ['nullable', Rule::in(['spot', 'linear', 'inverse'])],
            'drawings' => ['present', 'array'],
        ]);
        $exchange = strtolower($validated['exchange'] ?? 'bybit');
        $category = $validated['category'] ?? 'spot';

        $record = MarketDrawing::query()->updateOrCreate(
            [
                'adm_user_id' => $request->user()->id,
                'exchange' => $exchange,
                'category' => $category,
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
