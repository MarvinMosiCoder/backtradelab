<?php

namespace App\Http\Controllers;

use App\Models\MarketBacktestRiskSetting;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MarketBacktestRiskSettingController extends Controller
{
    public function show(Request $request)
    {
        return response()->json([
            'success' => true,
            'settings' => $this->serialize($this->getOrCreate($request)),
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'mode' => ['required', Rule::in(['warning', 'enforced'])],
            'max_daily_loss' => ['nullable', 'numeric', 'min:0.01', 'max:1000000000'],
            'max_trades_per_day' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'max_concurrent_positions' => ['nullable', 'integer', 'min:1', 'max:100'],
            'max_consecutive_losses' => ['nullable', 'integer', 'min:1', 'max:100'],
            'is_enabled' => ['required', 'boolean'],
        ]);

        $settings = $this->getOrCreate($request);
        $settings->update($validated);

        return response()->json(['success' => true, 'settings' => $this->serialize($settings->fresh())]);
    }

    private function getOrCreate(Request $request): MarketBacktestRiskSetting
    {
        return MarketBacktestRiskSetting::firstOrCreate(
            ['adm_user_id' => $request->user()->id],
            ['mode' => 'warning', 'is_enabled' => false]
        );
    }

    private function serialize(MarketBacktestRiskSetting $settings): array
    {
        return [
            'mode' => $settings->mode,
            'maxDailyLoss' => $settings->max_daily_loss !== null ? (float) $settings->max_daily_loss : null,
            'maxTradesPerDay' => $settings->max_trades_per_day,
            'maxConcurrentPositions' => $settings->max_concurrent_positions,
            'maxConsecutiveLosses' => $settings->max_consecutive_losses,
            'isEnabled' => $settings->is_enabled,
        ];
    }
}
