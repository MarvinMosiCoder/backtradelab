<?php

namespace App\Http\Controllers;

use App\Models\AdmUser;
use App\Models\SubscriptionMessage;
use App\Models\SubscriptionPlan;
use App\Models\SubscriptionRequest;
use App\Services\Payments\PayMongoCheckoutService;
use App\Services\AdminAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use RuntimeException;
use Throwable;

class ReplayAccessController extends Controller
{
    public function __construct(
        private readonly PayMongoCheckoutService $checkouts,
        private readonly AdminAccessService $adminAccess,
    ) {}

    public function plans(Request $request)
    {
        $query = SubscriptionPlan::whereIn('code', ['weekly', 'monthly', 'yearly'])->orderBy('sort_order');
        if (!$this->adminAccess->isSuperadmin($request->user())) $query->where('is_active', true);

        return response()->json([
            'plans' => $query->get(),
            'checkout' => $this->checkouts->availability(),
        ]);
    }

    public function adminPlansPage(Request $request)
    {
        $this->requireAdmin($request);
        return Inertia::render('Subscriptions/AdminPlans');
    }

    public function updatePlans(Request $request)
    {
        $this->requireAdmin($request);
        $data = $request->validate([
            'plans' => 'required|array|min:1', 'plans.*.id' => 'required|exists:subscription_plans,id',
            'plans.*.price' => 'nullable|numeric|min:0.01|max:99999999', 'plans.*.duration_days' => 'required|integer|min:1|max:3650',
            'plans.*.description' => 'nullable|string|max:160',
            'plans.*.features' => 'nullable|array|max:8',
            'plans.*.features.*' => 'required|string|max:80',
            'plans.*.is_featured' => 'required|boolean', 'plans.*.is_active' => 'required|boolean',
        ]);
        foreach ($data['plans'] as $item) {
            $item['features'] = SubscriptionPlan::normalizeFeatures($item['features'] ?? []);
            SubscriptionPlan::whereKey($item['id'])->update($item);
        }

        return response()->json(['success' => true, 'plans' => SubscriptionPlan::orderBy('sort_order')->get()]);
    }

    public function userPage(Request $request)
    {
        $user = $request->user();
        $trialActive = $user->replay_trial_ends_at && now()->lte($user->replay_trial_ends_at);
        $paidActive = $user->replay_access_ends_at && now()->lte($user->replay_access_ends_at);
        $activeUntil = collect([$user->replay_trial_ends_at, $user->replay_access_ends_at])
            ->filter()->sortByDesc(fn ($date) => $date->getTimestamp())->first();

        return Inertia::render('Subscriptions/UserIndex', [
            'subscription' => [
                'status' => $paidActive ? 'active' : ($trialActive ? 'trial' : ($user->replay_trial_started_at ? 'expired' : 'available')),
                'allowed' => $this->adminAccess->isSuperadmin($request->user()) || $trialActive || $paidActive,
                'trialAvailable' => !$user->replay_trial_started_at && !$paidActive,
                'trialStartedAt' => optional($user->replay_trial_started_at)->toIso8601String(),
                'trialEndsAt' => optional($user->replay_trial_ends_at)->toIso8601String(),
                'accessEndsAt' => optional($user->replay_access_ends_at)->toIso8601String(),
                'activeUntil' => optional($activeUntil)->toIso8601String(),
                'daysRemaining' => $activeUntil && now()->lte($activeUntil) ? now()->diffInDays($activeUntil) + 1 : 0,
                'requests' => SubscriptionRequest::where('adm_user_id', $user->id)
                    ->withCount('messages')->latest()->get()->map(fn ($payment) => $this->paymentPayload($payment)),
                'checkout' => $this->checkouts->availability(),
                'activeAccess' => $this->activeAccessPayload($user),
            ],
        ]);
    }

    public function status(Request $request)
    {
        $user = $request->user();
        $activeUntil = collect([$user->replay_trial_ends_at, $user->replay_access_ends_at])
            ->filter()->sortByDesc(fn ($date) => $date->getTimestamp())->first();
        $paidActive = $user->replay_access_ends_at && now()->lte($user->replay_access_ends_at);

        return response()->json([
            'allowed' => $this->adminAccess->isSuperadmin($request->user()) || ($activeUntil && now()->lte($activeUntil)),
            'trialAvailable' => !$user->replay_trial_started_at && !$paidActive,
            'trialStartedAt' => optional($user->replay_trial_started_at)->toIso8601String(),
            'trialEndsAt' => optional($user->replay_trial_ends_at)->toIso8601String(),
            'accessEndsAt' => optional($user->replay_access_ends_at)->toIso8601String(),
            'latestRequest' => optional(SubscriptionRequest::where('adm_user_id', $user->id)->latest()->first(), fn ($payment) => $this->paymentPayload($payment)),
            'checkout' => $this->checkouts->availability(),
            'activeAccess' => $this->activeAccessPayload($user),
        ]);
    }

    public function activateTrial(Request $request)
    {
        $result = DB::transaction(function () use ($request) {
            $user = AdmUser::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            if ($user->replay_trial_started_at) return ['activated' => false, 'user' => $user];
            if ($user->replay_access_ends_at && now()->lte($user->replay_access_ends_at)) {
                return ['activated' => false, 'user' => $user, 'paid_active' => true];
            }
            $startedAt = now();
            $user->forceFill(['replay_trial_started_at' => $startedAt, 'replay_trial_ends_at' => $startedAt->copy()->addDays(7)])->save();
            return ['activated' => true, 'user' => $user->fresh()];
        });

        $user = $result['user'];
        if (!$result['activated']) {
            $active = $user->replay_trial_ends_at && now()->lte($user->replay_trial_ends_at);
            if ($result['paid_active'] ?? false) {
                return response()->json([
                    'message' => 'Your paid replay access is already active. Your free trial remains available after it ends.',
                    'allowed' => true, 'trialAvailable' => false,
                    'accessEndsAt' => optional($user->replay_access_ends_at)->toIso8601String(),
                ], 409);
            }
            return response()->json([
                'message' => $active ? 'Your free trial is already active.' : 'Your free trial has already been used.',
                'allowed' => $active || ($user->replay_access_ends_at && now()->lte($user->replay_access_ends_at)),
                'trialAvailable' => false,
                'trialEndsAt' => optional($user->replay_trial_ends_at)->toIso8601String(),
            ], $active ? 200 : 409);
        }

        return response()->json([
            'success' => true, 'message' => 'Your free seven-day trial is now active.', 'allowed' => true,
            'trialAvailable' => false,
            'trialStartedAt' => optional($user->replay_trial_started_at)->toIso8601String(),
            'trialEndsAt' => optional($user->replay_trial_ends_at)->toIso8601String(),
        ], 201);
    }

    public function createCheckout(Request $request)
    {
        if ($this->activeAccessPayload($request->user())) {
            return response()->json(['message' => 'Your replay access is already active. You can choose another plan after it expires.'], 409);
        }
        $data = $request->validate(['plan' => 'required|string|max:50', 'submission_token' => 'required|uuid']);
        $plan = SubscriptionPlan::where('code', $data['plan'])->where('is_active', true)->firstOrFail();

        try {
            $payment = $this->checkouts->create($request->user(), $plan, $data['submission_token']);
            if (!$payment->provider_checkout_url || !in_array($payment->status, ['pending', 'paid'], true)) {
                throw new RuntimeException($payment->provider_status_message ?: 'This checkout is not available.');
            }
            return response()->json([
                'checkout_url' => $payment->provider_checkout_url,
                'payment' => $this->paymentPayload($payment),
            ], $payment->wasRecentlyCreated ? 201 : 200);
        } catch (Throwable $exception) {
            report($exception);
            return response()->json(['message' => $exception->getMessage() ?: 'Unable to start PayMongo checkout.'], 503);
        }
    }

    public function checkoutReturn(Request $request, string $token)
    {
        $payment = SubscriptionRequest::where('submission_token', $token)
            ->where('adm_user_id', $request->user()->id)->firstOrFail();
        $result = 'pending';
        try {
            $payment = $this->checkouts->reconcile($payment);
            $result = $payment->status;
        } catch (Throwable $exception) {
            report($exception);
        }

        return redirect()->route('subscription.index', ['payment' => $result]);
    }

    public function checkoutStatus(Request $request, SubscriptionRequest $subscriptionRequest)
    {
        $this->authorizePayment($request, $subscriptionRequest);
        if ($subscriptionRequest->provider === 'paymongo' && $subscriptionRequest->status === 'pending') {
            try {
                $subscriptionRequest = $this->checkouts->reconcile($subscriptionRequest);
            } catch (Throwable $exception) {
                report($exception);
            }
        }
        return response()->json(['payment' => $this->paymentPayload($subscriptionRequest->fresh())]);
    }

    public function adminPage(Request $request)
    {
        $this->requireAdmin($request);
        return Inertia::render('Subscriptions/AdminIndex');
    }

    public function adminIndex(Request $request)
    {
        $this->requireAdmin($request);
        $query = SubscriptionRequest::query()->with('user:id,name,email')->withCount('messages')->latest();
        if ($request->filled('provider')) $query->where('provider', $request->string('provider')->toString());
        if ($request->filled('status')) $query->where('status', $request->string('status')->toString());
        if ($request->filled('mode')) $query->where('livemode', $request->string('mode')->toString() === 'live');

        return $query->paginate(30)->through(fn ($payment) => $this->paymentPayload($payment, true));
    }

    public function adminReconcile(Request $request, SubscriptionRequest $subscriptionRequest)
    {
        $this->requireAdmin($request);
        try {
            $payment = $this->checkouts->reconcile($subscriptionRequest);
            return response()->json(['success' => true, 'payment' => $this->paymentPayload($payment, true)]);
        } catch (Throwable $exception) {
            report($exception);
            return response()->json(['message' => $exception->getMessage() ?: 'Unable to reconcile the payment.'], 422);
        }
    }

    public function messages(Request $request, SubscriptionRequest $subscriptionRequest)
    {
        $this->authorizePayment($request, $subscriptionRequest);
        return response()->json([
            'request' => $this->paymentPayload($subscriptionRequest),
            'messages' => $subscriptionRequest->messages()->with('user:id,name')->oldest()->get()
                ->map(fn ($message) => $this->messagePayload($message, $request)),
            'read_only' => true,
        ]);
    }

    public function proof(Request $request, SubscriptionRequest $subscriptionRequest)
    {
        $this->authorizePayment($request, $subscriptionRequest);
        abort_unless($subscriptionRequest->payment_proof_path && Storage::disk('public')->exists($subscriptionRequest->payment_proof_path), 404);
        return Storage::disk('public')->response($subscriptionRequest->payment_proof_path);
    }

    public function messageAttachment(Request $request, SubscriptionMessage $subscriptionMessage)
    {
        $this->authorizePayment($request, $subscriptionMessage->subscriptionRequest);
        abort_unless($subscriptionMessage->attachment_path && Storage::disk('public')->exists($subscriptionMessage->attachment_path), 404);
        return Storage::disk('public')->download($subscriptionMessage->attachment_path, $subscriptionMessage->attachment_name);
    }

    public function completeTour(Request $request)
    {
        if (!$request->user()->chart_tour_completed_at) $request->user()->forceFill(['chart_tour_completed_at' => now()])->save();
        return response()->json(['success' => true]);
    }

    private function authorizePayment(Request $request, SubscriptionRequest $payment): bool
    {
        $isAdmin = $this->adminAccess->isSuperadmin($request->user());
        abort_unless($isAdmin || $payment->adm_user_id === $request->user()->id, 403);
        return $isAdmin;
    }

    private function requireAdmin(Request $request): void
    {
        abort_unless($this->adminAccess->isSuperadmin($request->user()), 403);
    }

    private function paymentPayload(SubscriptionRequest $payment, bool $includeUser = false): array
    {
        $payload = [
            'id' => $payment->id,
            'plan' => $payment->plan,
            'provider' => $payment->provider,
            'payment_method' => $payment->payment_method,
            'payment_reference' => $payment->payment_reference,
            'provider_checkout_id' => $payment->provider_checkout_id,
            'provider_payment_id' => $payment->provider_payment_id,
            'amount' => $payment->amount,
            'currency' => $payment->currency ?: 'PHP',
            'duration_days' => $payment->duration_days,
            'mode' => $payment->livemode ? 'live' : 'test',
            'status' => $payment->status,
            'provider_status_message' => $payment->provider_status_message,
            'admin_notes' => $payment->admin_notes,
            'paid_at' => optional($payment->paid_at)->toIso8601String(),
            'failed_at' => optional($payment->failed_at)->toIso8601String(),
            'reviewed_at' => optional($payment->reviewed_at)->toIso8601String(),
            'created_at' => optional($payment->created_at)->toIso8601String(),
            'messages_count' => $payment->messages_count ?? $payment->messages()->count(),
            'payment_proof_url' => $payment->payment_proof_path ? route('subscription.proof', $payment) : null,
            'legacy' => $payment->provider === 'manual',
        ];
        if ($includeUser) $payload['user'] = $payment->user;
        return $payload;
    }

    private function activeAccessPayload(AdmUser $user): ?array
    {
        $paidActive = $user->replay_access_ends_at && now()->lte($user->replay_access_ends_at);
        $trialActive = $user->replay_trial_ends_at && now()->lte($user->replay_trial_ends_at);
        if (!$paidActive && !$trialActive) return null;
        $payment = $paidActive ? SubscriptionRequest::where('adm_user_id', $user->id)
            ->where('status', 'paid')->latest('paid_at')->first() : null;
        return [
            'kind' => $paidActive ? 'paid' : 'trial', 'plan' => $payment?->plan,
            'endsAt' => optional($paidActive ? $user->replay_access_ends_at : $user->replay_trial_ends_at)->toIso8601String(),
        ];
    }

    private function messagePayload(SubscriptionMessage $message, Request $request): array
    {
        return [
            'id' => $message->id, 'message' => $message->message, 'user' => $message->user,
            'mine' => $message->adm_user_id === $request->user()->id,
            'attachment_name' => $message->attachment_name, 'attachment_mime' => $message->attachment_mime,
            'attachment_url' => $message->attachment_path ? route('subscription.message-attachment', $message) : null,
            'created_at' => $message->created_at,
        ];
    }
}
