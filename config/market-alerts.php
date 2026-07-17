<?php

return [
    'enabled' => env('MARKET_ALERTS_ENABLED', false),
    'poll_seconds' => max(1, (int) env('MARKET_ALERT_POLL_SECONDS', 5)),
];
