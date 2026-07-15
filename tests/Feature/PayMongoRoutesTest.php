<?php

namespace Tests\Feature;

use Tests\TestCase;

class PayMongoRoutesTest extends TestCase
{
    public function test_webhook_is_public_and_rejects_an_invalid_signature(): void
    {
        config()->set('services.paymongo.webhook_secret', 'whsk_example');

        $this->postJson('/webhooks/paymongo', [], ['Paymongo-Signature' => 'invalid'])
            ->assertBadRequest();
    }

    public function test_removed_manual_payment_write_routes_are_not_registered(): void
    {
        $this->postJson('/subscription-requests', [])->assertNotFound();
        $this->postJson('/subscription-requests/1/messages', [])->assertStatus(405);
        $this->putJson('/admin/subscriptions/1', ['status' => 'approved'])->assertNotFound();
    }
}
