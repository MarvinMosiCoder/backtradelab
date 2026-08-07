<?php

namespace App\Jobs;

use App\Models\PayMongoWebhookEvent;
use App\Services\Payments\PayMongoCheckoutService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use RuntimeException;
use Throwable;

class ProcessPayMongoWebhookEvent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private int $webhookEventId)
    {
    }

    public function handle(PayMongoCheckoutService $checkouts): void
    {
        $event = PayMongoWebhookEvent::find($this->webhookEventId);

        if (!$event || in_array($event->status, ['processed', 'ignored'], true)) {
            return;
        }

        try {
            $payment = match ($event->event_type) {
                'checkout_session.payment.paid' => $checkouts->processPaidResource($event->resource ?? []),
                'payment.refunded' => $checkouts->processRefundResource($event->resource ?? []),
                'dispute.updated' => $checkouts->processDisputeResource($event->resource ?? []),
                default => throw new RuntimeException('No processor registered for event type '.$event->event_type),
            };
            $event->update([
                'status' => 'processed',
                'result_message' => 'Payment '.$payment->id.' processed.',
                'processed_at' => now(),
            ]);
        } catch (Throwable $exception) {
            $event->update([
                'status' => 'failed',
                'result_message' => mb_substr($exception->getMessage(), 0, 500),
                'processed_at' => now(),
            ]);
            report($exception);
        }
    }
}
