<?php
namespace App\Http\Controllers;

use App\Models\AdmModels\AdmNotifications;
use App\Models\SubscriptionRequest;
use App\Models\SubscriptionPlan;
use App\Models\SubscriptionMessage;
use App\Models\AdmUser;
use App\Models\PaymentSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReplayAccessController extends Controller
{
    public function paymentSettings(Request $request)
    {
        $setting = PaymentSetting::where('provider', 'gcash')->first();
        return response()->json(['settings' => $setting ? [
            'account_number' => $setting->account_number, 'account_name' => $setting->account_name,
            'rules' => $setting->rules, 'qr_code_url' => $setting->qr_code_path ? route('payment-settings.qr') : null,
        ] : null]);
    }

    public function adminPaymentSettingsPage(Request $request)
    {
        abort_unless((bool) $request->session()->get('admin_is_superadmin'), 403);
        return Inertia::render('Subscriptions/AdminPaymentSettings');
    }

    public function updatePaymentSettings(Request $request)
    {
        abort_unless((bool) $request->session()->get('admin_is_superadmin'), 403);
        $data = $request->validate(['account_number' => 'required|string|max:40', 'account_name' => 'required|string|max:120', 'rules' => 'nullable|string|max:5000', 'qr_code' => 'nullable|image|max:4096', 'remove_qr_code' => 'nullable|boolean']);
        $setting = PaymentSetting::firstOrCreate(['provider' => 'gcash'], ['account_number' => $data['account_number'], 'account_name' => $data['account_name']]);
        if (($data['remove_qr_code'] ?? false) && $setting->qr_code_path) { Storage::disk('public')->delete($setting->qr_code_path); $setting->qr_code_path = null; }
        if ($request->hasFile('qr_code')) { if ($setting->qr_code_path) Storage::disk('public')->delete($setting->qr_code_path); $setting->qr_code_path = $request->file('qr_code')->store('payment-settings', 'public'); }
        $setting->fill(['account_number' => $data['account_number'], 'account_name' => $data['account_name'], 'rules' => $data['rules'] ?? null])->save();
        return response()->json(['success' => true, 'message' => 'GCash payment details saved.']);
    }

    public function paymentQr(Request $request)
    {
        $path = PaymentSetting::where('provider', 'gcash')->value('qr_code_path');
        abort_unless($path && Storage::disk('public')->exists($path), 404);
        return Storage::disk('public')->response($path);
    }
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
        $requests = SubscriptionRequest::where('adm_user_id', $user->id)->withCount('messages')->latest()->get()->map(function ($item) {
            $item->payment_proof_url = $item->payment_proof_path ? route('subscription.proof', $item) : null;
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
            'request_id' => 'nullable|integer|exists:subscription_requests,id',
            'submission_token' => 'required|uuid',
        ]);
        $existingSubmission = SubscriptionRequest::where('submission_token', $data['submission_token'])->where('adm_user_id', $request->user()->id)->first();
        if ($existingSubmission) return response()->json(['success' => true, 'request' => $existingSubmission, 'duplicate' => true]);
        $plan = SubscriptionPlan::where('code', $data['plan'])->where('is_active', true)->firstOrFail();
        abort_if($plan->price === null, 422, 'This plan does not have a configured price yet.');
        $data['amount'] = $plan->price;
        $data['adm_user_id'] = $request->user()->id;
        unset($data['payment_proof']);
        $requestId = $data['request_id'] ?? null;
        unset($data['request_id']);
        $record = DB::transaction(function () use ($request, $requestId, $data) {
            AdmUser::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $duplicate = SubscriptionRequest::where('submission_token', $data['submission_token'])->where('adm_user_id', $request->user()->id)->first();
            if ($duplicate) return $duplicate;
            if (!$requestId) {
                $pending = SubscriptionRequest::where('adm_user_id', $request->user()->id)->where('status', 'pending')->latest()->first();
                if ($pending) return $pending;
            }
            $values = $data;
            if ($request->hasFile('payment_proof')) $values['payment_proof_path'] = $request->file('payment_proof')->store('subscription-proofs', 'public');
            if ($requestId) {
                $draft = SubscriptionRequest::whereKey($requestId)->where('adm_user_id', $request->user()->id)->where('status', 'draft')->firstOrFail();
                $draft->update($values + ['status' => 'pending']);
                return $draft->fresh();
            }
            return SubscriptionRequest::create($values);
        });
        if ($record->submission_token !== $data['submission_token']) return response()->json(['message' => 'You already have a payment request awaiting review.', 'request' => $record], 409);
        if (!$requestId && !$record->wasRecentlyCreated) return response()->json(['success' => true, 'request' => $record, 'duplicate' => true]);
        $this->notifyAdmins('New payment request from '.$request->user()->name.' ('.$plan->name.').');
        return response()->json(['success' => true, 'request' => $record], 201);
    }

    public function startConversation(Request $request)
    {
        $data = $request->validate(['plan' => 'required|string|max:50']);
        $plan = SubscriptionPlan::where('code', $data['plan'])->where('is_active', true)->firstOrFail();
        $record = SubscriptionRequest::where('adm_user_id', $request->user()->id)->where('plan', $plan->code)->where('status', 'draft')->latest()->first();
        if (!$record) {
            $record = SubscriptionRequest::create(['adm_user_id' => $request->user()->id, 'plan' => $plan->code, 'payment_method' => 'gcash_manual', 'amount' => $plan->price, 'status' => 'draft']);
            $this->notifyAdmins('New payment inquiry from '.$request->user()->name.' ('.$plan->name.').');
        }
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
        return SubscriptionRequest::query()->with('user:id,name,email')->withCount('messages')->latest()->paginate(30)->through(function ($item) {
            $item->payment_proof_url = $item->payment_proof_path ? route('subscription.proof', $item) : null;
            return $item;
        });
    }

    public function review(Request $request, SubscriptionRequest $subscriptionRequest)
    {
        abort_unless((bool) $request->session()->get('admin_is_superadmin'), 403);
        abort_unless($subscriptionRequest->status === 'pending', 409, 'This payment request has already been reviewed.');
        $data = $request->validate(['status' => 'required|in:approved,rejected', 'admin_notes' => 'nullable|string|max:2000', 'days' => 'nullable|integer|min:1|max:730']);
        DB::transaction(function () use ($subscriptionRequest, $request, $data) {
            $subscriptionRequest->update(['status' => $data['status'], 'admin_notes' => $data['admin_notes'] ?? null, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
            if ($data['status'] === 'approved') {
                $planDays = SubscriptionPlan::where('code', $subscriptionRequest->plan)->value('duration_days') ?? 30;
                $currentExpiry = $subscriptionRequest->user->replay_access_ends_at;
                $startsAt = $currentExpiry && $currentExpiry->isFuture() ? $currentExpiry->copy() : now();
                $subscriptionRequest->user->forceFill(['replay_access_ends_at' => $startsAt->addDays($data['days'] ?? $planDays)])->save();
            }
            $content = $data['status'] === 'approved'
                ? 'Subscription successful! You can now use market replay, paper backtesting, saved sessions, drawings, and trade journal features.'
                : 'Payment rejected. Please open your payment request to review the admin response.';
            $chatMessage = $data['status'] === 'approved'
                ? $content.' Access is active until '.$subscriptionRequest->user->fresh()->replay_access_ends_at->format('M j, Y g:i A').'.'
                : 'Your payment request was rejected.'.(!empty($data['admin_notes']) ? ' Admin response: '.$data['admin_notes'] : ' Please contact the administrator in this chat for assistance.');
            $subscriptionRequest->messages()->create(['adm_user_id' => $request->user()->id, 'message' => $chatMessage]);
            AdmNotifications::query()->create(['adm_user_id' => $subscriptionRequest->adm_user_id, 'type' => 'subscription', 'content' => $content, 'url' => '/subscription', 'is_read' => 0]);
        });
        return response()->json(['success' => true, 'message' => $data['status'] === 'approved' ? 'Payment approved and replay access activated.' : 'Payment request rejected and the user was notified.']);
    }

    public function completeTour(Request $request)
    {
        if (!$request->user()->chart_tour_completed_at) $request->user()->forceFill(['chart_tour_completed_at' => now()])->save();
        return response()->json(['success' => true]);
    }

    public function messages(Request $request, SubscriptionRequest $subscriptionRequest)
    {
        $this->authorizeSubscriptionRequest($request, $subscriptionRequest);
        $subscriptionRequest->refresh();
        return response()->json([
            'request' => ['id' => $subscriptionRequest->id, 'status' => $subscriptionRequest->status, 'admin_notes' => $subscriptionRequest->admin_notes, 'reviewed_at' => $subscriptionRequest->reviewed_at, 'access_ends_at' => optional($subscriptionRequest->user->replay_access_ends_at)->toIso8601String()],
            'messages' => $subscriptionRequest->messages()->with('user:id,name')->oldest()->get()->map(fn ($message) => $this->messagePayload($message, $request)),
        ]);
    }

    public function storeMessage(Request $request, SubscriptionRequest $subscriptionRequest)
    {
        $isAdmin = $this->authorizeSubscriptionRequest($request, $subscriptionRequest);
        $data = $request->validate([
            'message' => 'nullable|string|max:5000',
            'attachment' => 'nullable|file|max:10240|mimes:jpg,jpeg,png,gif,webp,pdf,txt,csv,doc,docx,xls,xlsx',
        ]);
        abort_if(blank($data['message'] ?? null) && !$request->hasFile('attachment'), 422, 'Write a message or attach a file.');
        $values = ['adm_user_id' => $request->user()->id, 'message' => $data['message'] ?? null];
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $values += ['attachment_path' => $file->store('subscription-chat', 'public'), 'attachment_name' => $file->getClientOriginalName(), 'attachment_mime' => $file->getMimeType(), 'attachment_size' => $file->getSize()];
        }
        $message = $subscriptionRequest->messages()->create($values)->load('user:id,name');
        if ($isAdmin) {
            AdmNotifications::query()->create(['adm_user_id' => $subscriptionRequest->adm_user_id, 'type' => 'subscription chat', 'content' => 'Admin sent a message about your payment request.', 'url' => '/subscription', 'is_read' => 0]);
        } else {
            $this->notifyAdmins('New payment chat message from '.$request->user()->name.'.');
        }
        return response()->json(['success' => true, 'message' => $this->messagePayload($message, $request)], 201);
    }

    public function proof(Request $request, SubscriptionRequest $subscriptionRequest)
    {
        $this->authorizeSubscriptionRequest($request, $subscriptionRequest);
        abort_unless($subscriptionRequest->payment_proof_path && Storage::disk('public')->exists($subscriptionRequest->payment_proof_path), 404);
        return Storage::disk('public')->response($subscriptionRequest->payment_proof_path);
    }

    public function messageAttachment(Request $request, SubscriptionMessage $subscriptionMessage)
    {
        $this->authorizeSubscriptionRequest($request, $subscriptionMessage->subscriptionRequest);
        abort_unless($subscriptionMessage->attachment_path && Storage::disk('public')->exists($subscriptionMessage->attachment_path), 404);
        return Storage::disk('public')->download($subscriptionMessage->attachment_path, $subscriptionMessage->attachment_name);
    }

    private function authorizeSubscriptionRequest(Request $request, SubscriptionRequest $subscriptionRequest): bool
    {
        $isAdmin = (bool) $request->session()->get('admin_is_superadmin');
        abort_unless($isAdmin || $subscriptionRequest->adm_user_id === $request->user()->id, 403);
        return $isAdmin;
    }

    private function messagePayload(SubscriptionMessage $message, Request $request): array
    {
        return ['id' => $message->id, 'message' => $message->message, 'user' => $message->user, 'mine' => $message->adm_user_id === $request->user()->id, 'attachment_name' => $message->attachment_name, 'attachment_mime' => $message->attachment_mime, 'attachment_url' => $message->attachment_path ? route('subscription.message-attachment', $message) : null, 'created_at' => $message->created_at];
    }

    private function notifyAdmins(string $content): void
    {
        AdmUser::whereHas('role', fn ($query) => $query->where('is_superadmin', 1))->pluck('id')->each(fn ($id) => AdmNotifications::query()->create(['adm_user_id' => $id, 'type' => 'subscription', 'content' => $content, 'url' => '/admin/subscriptions', 'is_read' => 0]));
    }
}
