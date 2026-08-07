<?php

namespace App\Services\Payments;

use App\Models\AdmModels\AdmNotifications;
use App\Models\AdmUser;
use App\Models\SubscriptionRequest;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class SubscriptionEntitlementService
{
    public function activate(SubscriptionRequest $payment, array $providerPayment): SubscriptionRequest
    {
        return DB::transaction(function () use ($payment, $providerPayment) {
            $lockedPayment = SubscriptionRequest::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($lockedPayment->status === 'paid') return $lockedPayment;
            if ($lockedPayment->provider !== 'paymongo') throw new RuntimeException('Only PayMongo payments can be activated automatically.');
            if (!$lockedPayment->duration_days || $lockedPayment->duration_days < 1) throw new RuntimeException('The purchased access duration is invalid.');
            $this->assertProviderPaymentMatches($lockedPayment, $providerPayment);

            $user = AdmUser::whereKey($lockedPayment->adm_user_id)->lockForUpdate()->firstOrFail();
            $startsAt = $user->replay_access_ends_at && $user->replay_access_ends_at->isFuture()
                ? $user->replay_access_ends_at->copy()
                : now();
            $endsAt = $startsAt->addDays($lockedPayment->duration_days);
            $paidAt = isset($providerPayment['paid_at']) && is_numeric($providerPayment['paid_at'])
                ? Carbon::createFromTimestamp((int) $providerPayment['paid_at'])
                : now();

            $lockedPayment->update([
                'status' => 'paid',
                'payment_method' => $providerPayment['method'] ?? 'paymongo_checkout',
                'payment_reference' => $providerPayment['reference'] ?? $lockedPayment->payment_reference,
                'provider_payment_id' => $providerPayment['id'] ?? $lockedPayment->provider_payment_id,
                'provider_status_message' => null,
                'paid_at' => $paidAt,
                'failed_at' => null,
            ]);
            $user->forceFill([
                'replay_access_ends_at' => $endsAt,
                'renewal_reminder_sent_at' => null,
            ])->save();

            AdmNotifications::query()->create([
                'adm_user_id' => $user->id,
                'type' => 'subscription',
                'content' => 'PayMongo payment confirmed. Replay access is active until '.$endsAt->format('M j, Y g:i A').'.',
                'url' => '/subscription',
                'is_read' => 0,
            ]);

            return $lockedPayment->fresh();
        });
    }

    public function revoke(SubscriptionRequest $payment, string $reason, array $context = []): SubscriptionRequest
    {
        return DB::transaction(function () use ($payment, $reason, $context) {
            $lockedPayment = SubscriptionRequest::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($lockedPayment->status === 'refunded') return $lockedPayment;

            $user = AdmUser::whereKey($lockedPayment->adm_user_id)->lockForUpdate()->firstOrFail();
            $hadFutureAccess = $user->replay_access_ends_at && $user->replay_access_ends_at->isFuture();
            $otherPaidPurchaseExists = SubscriptionRequest::where('adm_user_id', $user->id)
                ->where('id', '!=', $lockedPayment->id)
                ->where('status', 'paid')
                ->exists();

            if ($hadFutureAccess) {
                $user->forceFill(['replay_access_ends_at' => now()->subSecond()])->save();
            }

            $lockedPayment->update([
                'status' => 'refunded',
                'refunded_at' => now(),
                'refund_reason' => $lockedPayment->refund_reason ?: $reason,
            ]);

            AdmNotifications::query()->create([
                'adm_user_id' => $user->id,
                'type' => 'subscription',
                'content' => 'Your payment for the '.$lockedPayment->plan.' plan was refunded/reversed. Replay access has been removed.',
                'url' => '/subscription',
                'is_read' => 0,
            ]);

            Log::info('Subscription access revoked for user '.$user->id.' via subscription_request '.$lockedPayment->id.': '.$reason, $context);

            if ($otherPaidPurchaseExists) {
                Log::warning('Refund fully cleared replay access for user '.$user->id.' via subscription_request '.$lockedPayment->id
                    .' while other paid, non-refunded purchases exist for this user — access may have been over-revoked. Manual review recommended.');
            }

            return $lockedPayment->fresh();
        });
    }

    public function assertProviderPaymentMatches(SubscriptionRequest $payment, array $providerPayment): void
    {
        if ((int) ($providerPayment['amount'] ?? -1) !== PayMongoClient::toCentavos($payment->amount)) {
            throw new RuntimeException('PayMongo payment amount mismatch.');
        }
        if (strtoupper((string) ($providerPayment['currency'] ?? '')) !== strtoupper($payment->currency)) {
            throw new RuntimeException('PayMongo payment currency mismatch.');
        }
        if ((bool) ($providerPayment['livemode'] ?? false) !== (bool) $payment->livemode) {
            throw new RuntimeException('PayMongo payment mode mismatch.');
        }
    }
}
