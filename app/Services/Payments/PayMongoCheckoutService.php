<?php

namespace App\Services\Payments;

use App\Models\AdmUser;
use App\Models\SubscriptionPlan;
use App\Models\SubscriptionRequest;
use Illuminate\Database\QueryException;
use RuntimeException;
use Throwable;

class PayMongoCheckoutService
{
    public function __construct(
        private readonly PayMongoClient $client,
        private readonly SubscriptionEntitlementService $entitlements,
    ) {}

    public function create(AdmUser $user, SubscriptionPlan $plan, string $token): SubscriptionRequest
    {
        $this->client->assertAvailable();
        if ($plan->price === null || PayMongoClient::toCentavos($plan->price) <= 0) {
            throw new RuntimeException('This plan does not have a valid checkout price.');
        }

        $existing = SubscriptionRequest::where('submission_token', $token)
            ->where('adm_user_id', $user->id)
            ->first();
        if ($existing) return $existing;

        try {
            $payment = SubscriptionRequest::create([
                'adm_user_id' => $user->id,
                'plan' => $plan->code,
                'payment_method' => 'paymongo_checkout',
                'amount' => $plan->price,
                'currency' => strtoupper($plan->currency ?: 'PHP'),
                'duration_days' => $plan->duration_days,
                'provider' => 'paymongo',
                'status' => 'creating',
                'submission_token' => $token,
                'livemode' => $this->client->expectedLivemode(),
            ]);
        } catch (QueryException $exception) {
            $payment = SubscriptionRequest::where('submission_token', $token)
                ->where('adm_user_id', $user->id)
                ->first();
            if (!$payment) throw $exception;
            return $payment;
        }

        try {
            $resource = $this->client->createCheckout($payment, [
                'name' => $plan->name,
                'description' => $plan->description,
            ], [
                'name' => $user->name,
                'email' => $user->email,
            ]);
            $attributes = $resource['attributes'] ?? [];
            $checkoutId = $resource['id'] ?? null;
            $checkoutUrl = $attributes['checkout_url'] ?? null;
            $livemode = (bool) ($attributes['livemode'] ?? false);

            if (!$checkoutId || !$checkoutUrl) throw new RuntimeException('PayMongo did not return a checkout URL.');
            if ($livemode !== $this->client->expectedLivemode()) throw new RuntimeException('PayMongo returned the wrong payment mode.');

            $payment->update([
                'provider_checkout_id' => $checkoutId,
                'provider_checkout_url' => $checkoutUrl,
                'payment_reference' => $attributes['reference_number'] ?? $token,
                'livemode' => $livemode,
                'status' => 'pending',
                'provider_status_message' => null,
            ]);

            return $payment->fresh();
        } catch (Throwable $exception) {
            $payment->update([
                'status' => 'failed',
                'failed_at' => now(),
                'provider_status_message' => $this->safeMessage($exception),
            ]);
            throw $exception;
        }
    }

    public function reconcile(SubscriptionRequest $payment): SubscriptionRequest
    {
        if ($payment->provider !== 'paymongo') throw new RuntimeException('This is not a PayMongo transaction.');
        if ($payment->status === 'paid') return $payment;
        if (!$payment->provider_checkout_id) throw new RuntimeException('This payment has no PayMongo Checkout Session.');

        $resource = $this->client->retrieveCheckout($payment->provider_checkout_id);
        return $this->applyCheckoutResource($payment, $resource);
    }

    public function processPaidResource(array $resource): SubscriptionRequest
    {
        $this->client->assertAvailable();
        $checkoutId = $resource['id'] ?? null;
        $token = data_get($resource, 'attributes.metadata.subscription_token');
        if (!$checkoutId && !$token) {
            throw new RuntimeException('PayMongo Checkout Session has no usable identifier.');
        }

        $payment = SubscriptionRequest::query()
            ->where('provider', 'paymongo')
            ->where(function ($query) use ($checkoutId, $token) {
                if ($checkoutId) $query->where('provider_checkout_id', $checkoutId);
                if ($token) $query->orWhere('submission_token', $token);
            })
            ->first();

        if (!$payment) throw new RuntimeException('No local payment matches this PayMongo Checkout Session.');
        if (!$payment->provider_checkout_id && $checkoutId) $payment->update(['provider_checkout_id' => $checkoutId]);

        return $this->applyCheckoutResource($payment->fresh(), $resource, true);
    }

    public function availability(): array
    {
        return $this->client->availability();
    }

    private function applyCheckoutResource(SubscriptionRequest $payment, array $resource, bool $paidEvent = false): SubscriptionRequest
    {
        $checkoutId = $resource['id'] ?? null;
        $attributes = $resource['attributes'] ?? [];
        $livemode = (bool) ($attributes['livemode'] ?? false);
        if (!$checkoutId || $checkoutId !== $payment->provider_checkout_id) throw new RuntimeException('PayMongo Checkout Session mismatch.');
        if ($livemode !== (bool) $payment->livemode || $livemode !== $this->client->expectedLivemode()) {
            throw new RuntimeException('PayMongo payment mode mismatch.');
        }

        $providerPayment = collect($attributes['payments'] ?? [])->first(function ($item) {
            return data_get($item, 'attributes.status') === 'paid';
        });

        if ($providerPayment || $paidEvent) {
            if (!$providerPayment) throw new RuntimeException('Paid webhook did not include a paid payment resource.');
            $paymentAttributes = $providerPayment['attributes'] ?? [];
            $expectedAmount = PayMongoClient::toCentavos($payment->amount);
            if ((int) ($paymentAttributes['amount'] ?? -1) !== $expectedAmount) throw new RuntimeException('PayMongo payment amount mismatch.');
            if (strtoupper((string) ($paymentAttributes['currency'] ?? '')) !== strtoupper($payment->currency)) {
                throw new RuntimeException('PayMongo payment currency mismatch.');
            }

            return $this->entitlements->activate($payment, [
                'id' => $providerPayment['id'] ?? null,
                'method' => data_get($paymentAttributes, 'source.type', 'paymongo_checkout'),
                'reference' => $attributes['reference_number'] ?? $payment->payment_reference,
                'paid_at' => $paymentAttributes['paid_at'] ?? null,
                'amount' => (int) $paymentAttributes['amount'],
                'currency' => strtoupper((string) $paymentAttributes['currency']),
                'livemode' => $livemode,
            ]);
        }

        $providerStatus = strtolower((string) ($attributes['status'] ?? 'pending'));
        if (in_array($providerStatus, ['expired', 'cancelled', 'failed'], true)) {
            $payment->update([
                'status' => $providerStatus === 'cancelled' ? 'expired' : $providerStatus,
                'failed_at' => now(),
                'provider_status_message' => 'PayMongo Checkout Session is '.$providerStatus.'.',
            ]);
        } elseif ($payment->status !== 'pending') {
            $payment->update(['status' => 'pending', 'provider_status_message' => null]);
        }

        return $payment->fresh();
    }

    private function safeMessage(Throwable $exception): string
    {
        return mb_substr($exception->getMessage() ?: 'PayMongo checkout failed.', 0, 500);
    }
}
