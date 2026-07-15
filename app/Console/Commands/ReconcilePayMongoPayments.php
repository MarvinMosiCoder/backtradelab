<?php

namespace App\Console\Commands;

use App\Models\SubscriptionRequest;
use App\Services\Payments\PayMongoCheckoutService;
use Illuminate\Console\Command;
use Throwable;

class ReconcilePayMongoPayments extends Command
{
    protected $signature = 'payments:reconcile-paymongo {--limit=50}';
    protected $description = 'Reconcile pending PayMongo Checkout Sessions with the provider';

    public function handle(PayMongoCheckoutService $checkouts): int
    {
        if (!$checkouts->availability()['enabled']) {
            $this->components->info('PayMongo is disabled for this environment.');
            return self::SUCCESS;
        }

        $limit = max(1, min(200, (int) $this->option('limit')));
        $payments = SubscriptionRequest::query()
            ->where('provider', 'paymongo')
            ->where('status', 'pending')
            ->whereNotNull('provider_checkout_id')
            ->oldest()
            ->limit($limit)
            ->get();

        $failures = 0;
        foreach ($payments as $payment) {
            try {
                $checkouts->reconcile($payment);
            } catch (Throwable $exception) {
                $failures++;
                $this->components->error('Payment '.$payment->id.': '.$exception->getMessage());
            }
        }

        $this->components->info('Reconciled '.$payments->count().' payment(s); '.$failures.' failed.');
        return $failures ? self::FAILURE : self::SUCCESS;
    }
}
