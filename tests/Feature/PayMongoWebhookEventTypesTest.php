<?php

namespace Tests\Feature;

use App\Jobs\ProcessPayMongoWebhookEvent;
use App\Models\PayMongoWebhookEvent;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PayMongoWebhookEventTypesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated webhook tests.');
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        config()->set('services.paymongo.webhook_secret', 'whsk_example');
        config()->set('services.paymongo.signature_tolerance', 300);
        config()->set('services.paymongo.mode', 'test');

        Schema::create('pay_mongo_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('provider_event_id')->unique();
            $table->string('event_type');
            $table->boolean('livemode')->default(false);
            $table->string('resource_id')->nullable();
            $table->json('resource')->nullable();
            $table->string('status')->default('received');
            $table->string('result_message', 500)->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });
    }

    public function test_refunded_event_type_is_recognized_and_queues_the_job(): void
    {
        Queue::fake();

        $this->postSignedWebhook('evt_refund_1', 'payment.refunded', ['id' => 'pay_1', 'attributes' => ['status' => 'succeeded']])
            ->assertOk()
            ->assertJson(['received' => true, 'queued' => true]);

        $event = PayMongoWebhookEvent::where('provider_event_id', 'evt_refund_1')->first();
        $this->assertNotNull($event);
        $this->assertSame('payment.refunded', $event->event_type);
        Queue::assertPushed(ProcessPayMongoWebhookEvent::class);
    }

    public function test_dispute_event_type_is_recognized_and_queues_the_job(): void
    {
        Queue::fake();

        $this->postSignedWebhook('evt_dispute_1', 'dispute.updated', ['id' => 'disp_1', 'attributes' => ['payment_id' => 'pay_1']])
            ->assertOk()
            ->assertJson(['received' => true, 'queued' => true]);

        Queue::assertPushed(ProcessPayMongoWebhookEvent::class);
    }

    public function test_unrecognized_refund_shaped_event_is_marked_unhandled_not_ignored(): void
    {
        Queue::fake();

        $this->postSignedWebhook('evt_unknown_1', 'payment.refund.something_else', ['id' => 'pay_1'])
            ->assertOk()
            ->assertJson(['received' => true, 'ignored' => false, 'unhandled' => true]);

        $event = PayMongoWebhookEvent::where('provider_event_id', 'evt_unknown_1')->first();
        $this->assertSame('unhandled', $event->status);
        Queue::assertNotPushed(ProcessPayMongoWebhookEvent::class);
    }

    public function test_genuinely_irrelevant_event_type_is_still_ignored(): void
    {
        Queue::fake();

        $this->postSignedWebhook('evt_irrelevant_1', 'source.chargeable', ['id' => 'src_1'])
            ->assertOk()
            ->assertJson(['received' => true, 'ignored' => true, 'unhandled' => false]);

        $event = PayMongoWebhookEvent::where('provider_event_id', 'evt_irrelevant_1')->first();
        $this->assertSame('ignored', $event->status);
    }

    public function test_duplicate_unhandled_event_is_not_reprocessed(): void
    {
        Queue::fake();

        $this->postSignedWebhook('evt_dup_1', 'payment.refund.something_else', ['id' => 'pay_1']);
        $this->postSignedWebhook('evt_dup_1', 'payment.refund.something_else', ['id' => 'pay_1'])
            ->assertOk()
            ->assertJson(['received' => true, 'duplicate' => true]);

        $this->assertSame(1, PayMongoWebhookEvent::where('provider_event_id', 'evt_dup_1')->count());
    }

    private function postSignedWebhook(string $eventId, string $eventType, array $resource)
    {
        $body = json_encode([
            'data' => [
                'id' => $eventId,
                'attributes' => [
                    'type' => $eventType,
                    'livemode' => false,
                    'data' => $resource,
                ],
            ],
        ]);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$body, 'whsk_example');

        return $this->call('POST', '/webhooks/paymongo', [], [], [], [
            'HTTP_Paymongo-Signature' => "t={$timestamp},te={$signature}",
            'CONTENT_TYPE' => 'application/json',
        ], $body);
    }
}
