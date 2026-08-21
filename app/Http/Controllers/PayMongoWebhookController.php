<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessPayMongoWebhookEvent;
use App\Models\PayMongoWebhookEvent;
use App\Services\Payments\PayMongoSignatureVerifier;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Throwable;

class PayMongoWebhookController extends Controller
{
    private const SUPPORTED_EVENT_TYPES = [
        'checkout_session.payment.paid',
        'payment.refunded',
        'dispute.updated',
    ];

    public function __invoke(
        Request $request,
        PayMongoSignatureVerifier $signatures,
    ): JsonResponse {
        try {
            $payload = $signatures->verify($request->getContent(), $request->header('Paymongo-Signature'));
        } catch (Throwable $exception) {
            return response()->json(['message' => $exception->getMessage()], 400);
        }

        $eventId = data_get($payload, 'data.id');
        $eventType = data_get($payload, 'data.attributes.type');
        $livemode = (bool) data_get($payload, 'data.attributes.livemode', false);
        $resource = data_get($payload, 'data.attributes.data', []);
        if (!$eventId || !$eventType || !is_array($resource)) {
            return response()->json(['message' => 'PayMongo event payload is incomplete.'], 422);
        }

        try {
            $event = PayMongoWebhookEvent::firstOrCreate(
                ['provider_event_id' => $eventId],
                [
                    'event_type' => $eventType,
                    'livemode' => $livemode,
                    'resource_id' => $resource['id'] ?? null,
                    'resource' => $resource,
                    'status' => 'received',
                ]
            );
        } catch (UniqueConstraintViolationException) {
            // Two near-simultaneous deliveries of the same event id raced past the
            // firstOrCreate() read; the DB-level unique index on provider_event_id
            // let only one insert through. The other row already exists — use it.
            $event = PayMongoWebhookEvent::where('provider_event_id', $eventId)->firstOrFail();
        }

        if (!$event->wasRecentlyCreated && in_array($event->status, ['processed', 'ignored', 'unhandled'], true)) {
            return response()->json(['received' => true, 'duplicate' => true]);
        }

        if (!in_array($eventType, self::SUPPORTED_EVENT_TYPES, true)) {
            $looksRelevant = (bool) preg_match('/refund|dispute|chargeback/i', $eventType);
            $event->update([
                'status' => $looksRelevant ? 'unhandled' : 'ignored',
                'result_message' => $looksRelevant
                    ? 'Refund/dispute-shaped event type has no coded handler yet: '.$eventType
                    : 'Unsupported event type.',
                'processed_at' => now(),
            ]);
            if ($looksRelevant) {
                report(new RuntimeException('Unhandled PayMongo refund/dispute-like webhook event: '.$eventType.' (event id '.$eventId.'). Verify against PayMongo docs and add explicit handling.'));
            }
            return response()->json(['received' => true, 'ignored' => !$looksRelevant, 'unhandled' => $looksRelevant]);
        }

        if ($livemode !== (config('services.paymongo.mode') === 'live')) {
            $event->update([
                'status' => 'failed',
                'result_message' => 'Webhook mode does not match the configured PayMongo mode.',
                'processed_at' => now(),
            ]);
            return response()->json(['message' => 'PayMongo event processing failed.'], 500);
        }

        try {
            ProcessPayMongoWebhookEvent::dispatch($event->id);
        } catch (Throwable $exception) {
            $event->update([
                'status' => 'failed',
                'result_message' => mb_substr($exception->getMessage(), 0, 500),
                'processed_at' => now(),
            ]);
            report($exception);
            return response()->json(['message' => 'PayMongo event processing failed.'], 500);
        }

        return response()->json(['received' => true, 'queued' => true]);
    }
}
