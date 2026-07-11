<?php
namespace App\Http\Controllers;

use App\Models\AdmModels\AdmNotifications;
use App\Models\SubscriptionRequest;
use App\Models\SubscriptionPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ReplayAccessController extends Controller
{
    public function plans(Request $request)
    {
        $query = SubscriptionPlan::orderBy('sort_order');
        if (!$request->session()->get('admin_is_superadmin')) $query->where('is_active', true);
        return response()->json(['plans' => $query->get()]);
    }

    public function adminPlansPage(Request $request)
    {
        abort_unless((bool) $request->session()->get('admin_is_superadmin'), 403);
        return Inertia::render('Subscriptions/AdminPlans');
    }

    public function updatePlans(Request $request)
    {
        abort_unless((bool) $request->session()->get('admin_is_superadmin'), 403);
        $data = $request->validate([
            'plans' => 'required|array|min:1', 'plans.*.id' => 'required|exists:subscription_plans,id',
            'plans.*.price' => 'nullable|numeric|min:0|max:99999999', 'plans.*.duration_days' => 'required|integer|min:1|max:3650',
            'plans.*.description' => 'nullable|string|max:160', 'plans.*.is_featured' => 'required|boolean', 'plans.*.is_active' => 'required|boolean',
        ]);
        foreach ($data['plans'] as $item) {
            SubscriptionPlan::whereKey($item['id'])->update($item);
        }
        return response()->json(['success' => true, 'plans' => SubscriptionPlan::orderBy('sort_order')->get()]);
    }

    public function userPage(Request $request)
    {
        $user = $request->user();
        if (!$user->replay_trial_started_at) {
            $user->forceFill(['replay_trial_started_at' => now(), 'replay_trial_ends_at' => now()->addDays(7)])->save();
        }

        $trialActive = $user->replay_trial_ends_at && now()->lte($user->replay_trial_ends_at);
        $paidActive = $user->replay_access_ends_at && now()->lte($user->replay_access_ends_at);
        $activeUntil = collect([$user->replay_trial_ends_at, $user->replay_access_ends_at])
            ->filter()->sortByDesc(fn ($date) => $date->getTimestamp())->first();
        $requests = SubscriptionRequest::where('adm_user_id', $user->id)->latest()->get()->map(function ($item) {
            $item->payment_proof_url = $item->payment_proof_path ? Storage::disk('public')->url($item->payment_proof_path) : null;
            return $item;
        });

        return Inertia::render('Subscriptions/UserIndex', [
            'subscription' => [
                'status' => $paidActive ? 'active' : ($trialActive ? 'trial' : 'expired'),
                'allowed' => (bool) $request->session()->get('admin_is_superadmin') || $trialActive || $paidActive,
                'trialStartedAt' => optional($user->replay_trial_started_at)->toIso8601String(),
                'trialEndsAt' => optional($user->replay_trial_ends_at)->toIso8601String(),
                'accessEndsAt' => optional($user->replay_access_ends_at)->toIso8601String(),
                'activeUntil' => optional($activeUntil)->toIso8601String(),
                'daysRemaining' => $activeUntil && now()->lte($activeUntil) ? now()->diffInDays($activeUntil) + 1 : 0,
                'requests' => $requests,
            ],
        ]);
    }

    public function status(Request $request)
    {
        $user = $request->user();
        if (!$user->replay_trial_started_at) {
            $user->forceFill(['replay_trial_started_at' => now(), 'replay_trial_ends_at' => now()->addDays(7)])->save();
        }
        $activeUntil = collect([$user->replay_trial_ends_at, $user->replay_access_ends_at])
            ->filter()->sortByDesc(fn ($date) => $date->getTimestamp())->first();
        return response()->json([
            'allowed' => (bool) $request->session()->get('admin_is_superadmin') || ($activeUntil && now()->lte($activeUntil)),
            'trialEndsAt' => optional($user->replay_trial_ends_at)->toIso8601String(),
            'accessEndsAt' => optional($user->replay_access_ends_at)->toIso8601String(),
            'latestRequest' => SubscriptionRequest::where('adm_user_id', $user->id)->latest()->first(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'plan' => 'required|string|max:50', 'payment_method' => 'required|string|max:50',
            'payment_reference' => 'required|string|max:100',
            'payment_proof' => 'nullable|image|max:4096',
        ]);
        $plan = SubscriptionPlan::where('code', $data['plan'])->where('is_active', true)->firstOrFail();
        abort_if($plan->price === null, 422, 'This plan does not have a configured price yet.');
        $data['amount'] = $plan->price;
        $data['adm_user_id'] = $request->user()->id;
        if ($request->hasFile('payment_proof')) $data['payment_proof_path'] = $request->file('payment_proof')->store('subscription-proofs', 'public');
        unset($data['payment_proof']);
        $record = SubscriptionRequest::create($data);
        return response()->json(['success' => true, 'request' => $record], 201);
    }

    public function adminPage(Request $request)
    {
        abort_unless((bool) $request->session()->get('admin_is_superadmin'), 403);
        return Inertia::render('Subscriptions/AdminIndex');
    }

    public function adminIndex(Request $request)
    {
        abort_unless((bool) $request->session()->get('admin_is_superadmin'), 403);
        return SubscriptionRequest::query()->with('user:id,name,email')->latest()->paginate(30);
    }

    public function review(Request $request, SubscriptionRequest $subscriptionRequest)
    {
        abort_unless((bool) $request->session()->get('admin_is_superadmin'), 403);
        $data = $request->validate(['status' => 'required|in:approved,rejected', 'admin_notes' => 'nullable|string|max:2000', 'days' => 'nullable|integer|min:1|max:730']);
        $subscriptionRequest->update(['status' => $data['status'], 'admin_notes' => $data['admin_notes'] ?? null, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
        if ($data['status'] === 'approved') {
            $planDays = SubscriptionPlan::where('code', $subscriptionRequest->plan)->value('duration_days') ?? 30;
            $subscriptionRequest->user->forceFill(['replay_access_ends_at' => now()->addDays($data['days'] ?? $planDays)])->save();
        }
        AdmNotifications::query()->create(['adm_user_id' => $subscriptionRequest->adm_user_id, 'type' => 'subscription', 'content' => 'Your replay subscription request was '.$data['status'].'.', 'is_read' => 0]);
        return response()->json(['success' => true]);
    }
}
