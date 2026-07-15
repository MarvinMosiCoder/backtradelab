<?php

namespace App\Http\Controllers;

use App\Models\PayMongoWebhookEvent;
use App\Services\Payments\PayMongoCheckoutService;
use App\Services\Payments\PayMongoSignatureVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Throwable;

class PayMongoWebhookController extends Controller
{
    public function __invoke(
        Request $request,
        PayMongoSignatureVerifier $signatures,
        PayMongoCheckoutService $checkouts,
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

        $event = PayMongoWebhookEvent::firstOrCreate(
            ['provider_event_id' => $eventId],
            [
                'event_type' => $eventType,
                'livemode' => $livemode,
                'resource_id' => $resource['id'] ?? null,
                'status' => 'received',
            ]
        );

        if (!$event->wasRecentlyCreated && in_array($event->status, ['processed', 'ignored'], true)) {
            return response()->json(['received' => true, 'duplicate' => true]);
        }

        if ($eventType !== 'checkout_session.payment.paid') {
            $event->update(['status' => 'ignored', 'result_message' => 'Unsupported event type.', 'processed_at' => now()]);
            return response()->json(['received' => true, 'ignored' => true]);
        }

        try {
            if ($livemode !== (config('services.paymongo.mode') === 'live')) {
                throw new RuntimeException('Webhook mode does not match the configured PayMongo mode.');
            }
            $payment = $checkouts->processPaidResource($resource);
            $event->update([
                'status' => 'processed',
                'result_message' => 'Payment '.$payment->id.' processed.',
                'processed_at' => now(),
            ]);
            return response()->json(['received' => true]);
        } catch (Throwable $exception) {
            $event->update([
                'status' => 'failed',
                'result_message' => mb_substr($exception->getMessage(), 0, 500),
                'processed_at' => now(),
            ]);
            report($exception);
            return response()->json(['message' => 'PayMongo event processing failed.'], 500);
        }
    }
}
