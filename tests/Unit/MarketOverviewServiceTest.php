<?php

namespace Tests\Unit;

use App\Services\MarketOverviewService;
use Tests\TestCase;

class MarketOverviewServiceTest extends TestCase
{
    public function test_it_sanitizes_announcement_excerpts_as_plain_text(): void
    {
        $excerpt = app(MarketOverviewService::class)->sanitizeExcerpt(
            '<style>.hidden { display: none; }</style><p>Hello&nbsp; <strong>traders</strong>.</p><script>alert("x")</script>'
        );

        $this->assertSame('Hello traders.', $excerpt);
    }

    public function test_it_limits_announcement_excerpt_length(): void
    {
        $excerpt = app(MarketOverviewService::class)->sanitizeExcerpt('A deliberately long market update', 14);

        $this->assertSame('A deliberately...', $excerpt);
    }
}
