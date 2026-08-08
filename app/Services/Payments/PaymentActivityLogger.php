<?php

namespace App\Services\Payments;

use App\Models\AdmUser;
use App\Models\PaymentActivityLog;
use App\Models\SubscriptionRequest;
use Throwable;

class PaymentActivityLogger
{
    /**
     * Record one entry in a payment's activity trail. Best-effort: a logging failure must
     * never interrupt the payment flow it's describing, so it reports and swallows.
     */
    public function log(
        ?SubscriptionRequest $payment,
        ?AdmUser $user,
        string $action,
        string $description,
        array $context = [],
        string $actor = 'system',
    ): void {
        try {
            PaymentActivityLog::query()->create([
                'subscription_request_id' => $payment?->id,
                'adm_user_id' => $user?->id ?? $payment?->adm_user_id,
                'action' => $action,
                'actor' => $actor,
                'description' => mb_substr($description, 0, 500),
                'context' => $context ?: null,
            ]);
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
