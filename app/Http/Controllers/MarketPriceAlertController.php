<?php
namespace App\Http\Controllers;

use App\Models\AdmModels\AdmNotifications;
use App\Models\MarketPriceAlert;
use Illuminate\Http\Request;

class MarketPriceAlertController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(['alerts' => MarketPriceAlert::where('adm_user_id', $request->user()->id)->latest()->get()]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'exchange' => 'required|string|max:30', 'category' => 'required|string|max:30', 'symbol' => 'required|string|max:40',
            'target_price' => 'required|numeric|gt:0', 'direction' => 'required|in:above,below,cross', 'last_price' => 'nullable|numeric|gt:0',
        ]);
        $data['symbol'] = strtoupper($data['symbol']);
        $data['adm_user_id'] = $request->user()->id;
        return response()->json(['alert' => MarketPriceAlert::create($data)], 201);
    }

    public function destroy(Request $request, MarketPriceAlert $marketPriceAlert)
    {
        abort_unless($marketPriceAlert->adm_user_id === $request->user()->id, 403);
        $marketPriceAlert->delete();
        return response()->json(['success' => true]);
    }

    public function check(Request $request)
    {
        $data = $request->validate(['exchange' => 'required|string', 'category' => 'required|string', 'symbol' => 'required|string', 'price' => 'required|numeric|gt:0']);
        $price = (float) $data['price'];
        $alerts = MarketPriceAlert::where('adm_user_id', $request->user()->id)->where('status', 'active')
            ->where('exchange', $data['exchange'])->where('category', $data['category'])->where('symbol', strtoupper($data['symbol']))->get();
        $triggered = [];
        foreach ($alerts as $alert) {
            $target = (float) $alert->target_price; $last = $alert->last_price === null ? null : (float) $alert->last_price;
            $hit = $alert->direction === 'above' ? $price >= $target : ($alert->direction === 'below' ? $price <= $target : ($last !== null && (($last < $target && $price >= $target) || ($last > $target && $price <= $target))));
            if ($hit) {
                $alert->update(['status' => 'triggered', 'triggered_at' => now(), 'last_price' => $price]);
                AdmNotifications::create(['adm_user_id' => $request->user()->id, 'type' => 'price alert', 'content' => "{$alert->symbol} reached {$target} (current {$price}).", 'is_read' => 0]);
                $triggered[] = $alert->id;
            } else $alert->update(['last_price' => $price]);
        }
        return response()->json(['triggered' => $triggered]);
    }
}
