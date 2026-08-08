<?php

namespace App\Http\Controllers;

use App\Models\PaymentActivityLog;
use App\Services\AdminAccessService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PaymentActivityLogController extends Controller
{
    public function __construct(private readonly AdminAccessService $adminAccess)
    {
    }

    public function adminPage(Request $request)
    {
        $this->ensureSuperAdmin($request);
        return Inertia::render('Subscriptions/ActivityLog');
    }

    public function adminIndex(Request $request)
    {
        $this->ensureSuperAdmin($request);
        $validated = $request->validate([
            'subscription_request_id' => ['nullable', 'integer'],
            'action' => ['nullable', 'string', 'max:60'],
            'search' => ['nullable', 'string', 'max:120'],
        ]);

        $items = PaymentActivityLog::query()
            ->with(['subscriptionRequest:id,plan,amount,currency,status', 'user:id,name,email'])
            ->when($validated['subscription_request_id'] ?? null, fn ($query, $value) => $query->where('subscription_request_id', $value))
            ->when($validated['action'] ?? null, fn ($query, $value) => $query->where('action', $value))
            ->when($validated['search'] ?? null, function ($query, $value) {
                $query->where(function ($nested) use ($value) {
                    $nested->where('description', 'like', "%{$value}%")
                        ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', "%{$value}%")->orWhere('email', 'like', "%{$value}%"));
                });
            })
            ->latest()
            ->paginate(40)
            ->through(fn (PaymentActivityLog $log) => $this->serialize($log));

        return response()->json($items);
    }

    private function ensureSuperAdmin(Request $request): void
    {
        abort_unless($this->adminAccess->isSuperadmin($request->user()), 403);
    }

    private function serialize(PaymentActivityLog $log): array
    {
        return [
            'id' => $log->id,
            'action' => $log->action,
            'actor' => $log->actor,
            'description' => $log->description,
            'context' => $log->context,
            'user' => $log->user ? ['id' => $log->user->id, 'name' => $log->user->name, 'email' => $log->user->email] : null,
            'subscriptionRequest' => $log->subscriptionRequest ? [
                'id' => $log->subscriptionRequest->id,
                'plan' => $log->subscriptionRequest->plan,
                'amount' => $log->subscriptionRequest->amount,
                'currency' => $log->subscriptionRequest->currency,
                'status' => $log->subscriptionRequest->status,
            ] : null,
            'createdAt' => optional($log->created_at)->toIso8601String(),
        ];
    }
}
