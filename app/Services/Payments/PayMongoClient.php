<?php

namespace App\Services\Payments;

use App\Models\SubscriptionRequest;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class PayMongoClient
{
    public function availability(): array
    {
        try {
            $this->assertAvailable();

            return [
                'enabled' => true,
                'mode' => $this->mode(),
                'payment_methods' => $this->configuredMethods(),
                'message' => null,
            ];
        } catch (RuntimeException $exception) {
            return [
                'enabled' => false,
                'mode' => $this->mode(),
                'payment_methods' => [],
                'message' => $exception->getMessage(),
            ];
        }
    }

    public function assertAvailable(): void
    {
        if (!config('services.paymongo.enabled')) {
            throw new RuntimeException('PayMongo checkout is not enabled.');
        }

        $mode = $this->mode();
        $key = (string) config('services.paymongo.secret_key');

        if (!in_array($mode, ['test', 'live'], true)) {
            throw new RuntimeException('PayMongo mode must be test or live.');
        }

        if ($mode === 'test') {
            if (app()->environment('production')) {
                throw new RuntimeException('Test payments are disabled in production.');
            }
            if (!str_starts_with($key, 'sk_test_')) {
                throw new RuntimeException('A PayMongo test secret key is required.');
            }
        }

        if ($mode === 'live') {
            if (!config('services.paymongo.live_enabled')) {
                throw new RuntimeException('Live PayMongo payments are locked until compliance approval.');
            }
            if (!str_starts_with($key, 'sk_live_')) {
                throw new RuntimeException('A PayMongo live secret key is required.');
            }
        }

        if ($this->configuredMethods() === []) {
            throw new RuntimeException('No PayMongo payment methods are configured.');
        }
    }

    public function eligibleMethods(): array
    {
        $this->assertAvailable();

        if ($this->shouldBypassCapabilities()) {
            return $this->configuredMethods();
        }

        $response = $this->request()->get('merchants/capabilities/payment_methods');
        $this->throwForFailure($response->successful(), $response->json());

        $configured = $this->configuredMethods();
        $found = [];
        $this->collectConfiguredMethods($response->json(), $configured, $found);

        return array_values(array_intersect($configured, array_unique($found)));
    }

    public function createCheckout(SubscriptionRequest $payment, array $plan, array $user): array
    {
        $methods = $this->eligibleMethods();
        if ($methods === []) {
            throw new RuntimeException('Card and GCash are not enabled for this PayMongo account.');
        }

        $amount = self::toCentavos($payment->amount);
        $attributes = [
            'billing' => [
                'name' => $user['name'],
                'email' => $user['email'],
            ],
            'cancel_url' => route('subscription.index', ['payment' => 'cancelled']),
            'description' => $plan['name'].' replay access for '.$payment->duration_days.' days',
            'line_items' => [[
                'amount' => $amount,
                'currency' => $payment->currency,
                'description' => $plan['description'] ?: $plan['name'].' replay subscription',
                'name' => $plan['name'].' Replay Access',
                'quantity' => 1,
            ]],
            'metadata' => [
                'subscription_token' => (string) $payment->submission_token,
                'user_id' => (string) $payment->adm_user_id,
                'plan' => (string) $payment->plan,
            ],
            'payment_method_types' => $methods,
            'reference_number' => (string) $payment->submission_token,
            'send_email_receipt' => true,
            'show_description' => true,
            'show_line_items' => true,
            'success_url' => route('subscription.checkout.return', ['token' => $payment->submission_token]),
        ];

        $response = $this->request()->post('checkout_sessions', ['data' => ['attributes' => $attributes]]);
        $this->throwForFailure($response->successful(), $response->json());

        return $response->json('data') ?? [];
    }

    public function retrieveCheckout(string $checkoutId): array
    {
        $this->assertAvailable();
        $response = $this->request()->get('checkout_sessions/'.$checkoutId);
        $this->throwForFailure($response->successful(), $response->json());

        return $response->json('data') ?? [];
    }

    public function mode(): string
    {
        return strtolower((string) config('services.paymongo.mode', 'test'));
    }

    public function expectedLivemode(): bool
    {
        return $this->mode() === 'live';
    }

    public static function toCentavos(mixed $amount): int
    {
        return (int) round(((float) $amount) * 100);
    }

    private function configuredMethods(): array
    {
        return array_values(array_unique(array_filter(
            (array) config('services.paymongo.payment_methods', ['card', 'gcash']),
            fn ($method) => in_array($method, ['card', 'gcash'], true)
        )));
    }

    private function shouldBypassCapabilities(): bool
    {
        return (bool) config('services.paymongo.test_bypass_capabilities')
            && $this->mode() === 'test'
            && !app()->environment('production');
    }

    private function request(): PendingRequest
    {
        return Http::baseUrl(rtrim((string) config('services.paymongo.base_url'), '/'))
            ->withBasicAuth((string) config('services.paymongo.secret_key'), '')
            ->acceptJson()
            ->asJson()
            ->connectTimeout(5)
            ->timeout(15);
    }

    private function throwForFailure(bool $successful, array $payload): void
    {
        if ($successful) return;

        $message = data_get($payload, 'errors.0.detail')
            ?? data_get($payload, 'errors.0.code')
            ?? 'PayMongo could not process the request.';

        throw new RuntimeException(mb_substr((string) $message, 0, 500));
    }

    private function collectConfiguredMethods(mixed $value, array $configured, array &$found): void
    {
        if (is_string($value) && in_array(strtolower($value), $configured, true)) {
            $found[] = strtolower($value);
            return;
        }

        if (!is_array($value)) return;
        $status = strtolower((string) ($value['status'] ?? ''));
        if ($status !== '' && !in_array($status, ['active', 'available', 'enabled'], true)) return;
        if (array_key_exists('enabled', $value) && !$value['enabled']) return;
        if (array_key_exists('available', $value) && !$value['available']) return;

        foreach ($value as $key => $child) {
            if (is_string($key) && in_array(strtolower($key), $configured, true)) {
                $childStatus = is_array($child) ? strtolower((string) ($child['status'] ?? '')) : strtolower((string) $child);
                if ($child === true || in_array($childStatus, ['active', 'available', 'enabled'], true)) {
                    $found[] = strtolower($key);
                }
            }
            $this->collectConfiguredMethods($child, $configured, $found);
        }
    }
}
