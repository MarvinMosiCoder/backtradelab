<?php

namespace App\Http\Controllers;

use App\Models\MarketToolSetting;
use Illuminate\Http\Request;

class MarketToolSettingController extends Controller
{
    public function show(Request $request)
    {
        $record = MarketToolSetting::query()
            ->where('adm_user_id', $request->user()->id)
            ->first();

        return response()->json([
            'success' => true,
            'settings' => $record?->settings ?? [],
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'settings' => ['present', 'array'],
        ]);

        $record = MarketToolSetting::query()->updateOrCreate(
            [
                'adm_user_id' => $request->user()->id,
            ],
            [
                'settings' => $validated['settings'],
            ]
        );

        return response()->json([
            'success' => true,
            'settings' => $record->settings,
        ]);
    }
}
