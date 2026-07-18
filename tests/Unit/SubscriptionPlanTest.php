<?php

namespace Tests\Unit;

use App\Models\SubscriptionPlan;
use PHPUnit\Framework\TestCase;

class SubscriptionPlanTest extends TestCase
{
    public function test_features_are_cast_to_and_from_an_array(): void
    {
        $plan = new SubscriptionPlan();
        $plan->features = ['Market replay', 'Trade journal'];

        $this->assertSame(['Market replay', 'Trade journal'], $plan->features);
        $this->assertSame('["Market replay","Trade journal"]', $plan->getAttributes()['features']);
    }

    public function test_features_are_trimmed_deduplicated_and_limited(): void
    {
        $features = SubscriptionPlan::normalizeFeatures([
            ' Replay ', 'replay', '', 'Journal', 'Reports', 'Alerts', 'Drawings', 'Indicators', 'Snapshots', 'Extra',
        ]);

        $this->assertSame(['Replay', 'Journal', 'Reports', 'Alerts', 'Drawings', 'Indicators', 'Snapshots', 'Extra'], $features);
    }
}
