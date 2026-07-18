<?php
namespace App\Http\Controllers;

use App\Models\MarketPriceAlert;
use App\Services\MarketPriceAlertTriggerService;
use Illuminate\Http\Request;

class MarketPriceAlertController extends Controller
{
    public function __construct(private readonly MarketPriceAlertTriggerService $triggers) {}

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
        $data['exchange'] = strtolower($data['exchange']);
        $data['category'] = strtolower($data['category']);
        $data['symbol'] = strtoupper($data['symbol']);
        $data['adm_user_id'] = $request->user()->id;
        return response()->json(['alert' => MarketPriceAlert::create($data)], 201);
    }

    public function check(Request $request)
    {
        $data = $request->validate([
            'exchange' => ['required', 'string', 'max:30'],
            'category' => ['required', 'string', 'max:30'],
            'symbol' => ['required', 'string', 'max:40'],
            'price' => ['required', 'numeric', 'gt:0'],
        ]);

        return response()->json([
            'triggered' => $this->triggers->evaluate(
                $data['exchange'],
                $data['category'],
                $data['symbol'],
                (float) $data['price'],
                $request->user()->id
            ),
        ]);
    }

    public function destroy(Request $request, MarketPriceAlert $marketPriceAlert)
    {
        abort_unless($marketPriceAlert->adm_user_id === $request->user()->id, 403);
        if ($marketPriceAlert->status === 'active') $marketPriceAlert->update(['status' => 'cancelled']);
        return response()->json(['success' => true]);
    }
}
