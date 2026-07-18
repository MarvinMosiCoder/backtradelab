<?php

return [
    'featured_markets' => [
        ['exchange' => 'bybit', 'category' => 'spot', 'symbol' => 'BTCUSDT'],
        ['exchange' => 'bybit', 'category' => 'spot', 'symbol' => 'ETHUSDT'],
        ['exchange' => 'bybit', 'category' => 'spot', 'symbol' => 'SOLUSDT'],
    ],

    'tips' => [
        ['title' => 'Practice with Replay', 'content' => 'Choose a historical candle, play the market forward, and review each decision without risking capital.', 'action_label' => 'Open Workspace', 'action_url' => '/dashboard'],
        ['title' => 'Plan alerts before entries', 'content' => 'Set price alerts around important levels so you can return when the market reaches your setup.', 'action_label' => 'Open Workspace', 'action_url' => '/dashboard'],
        ['title' => 'Keep indicators focused', 'content' => 'Use a small set of indicators that answer specific questions instead of filling the chart with duplicate signals.', 'action_label' => 'Learn more', 'action_url' => '/help'],
        ['title' => 'Review the journal', 'content' => 'Compare planned risk with actual execution and look for repeatable patterns across completed sessions.', 'action_label' => 'View Trade Report', 'action_url' => '/trade-report'],
        ['title' => 'Protect the practice account', 'content' => 'Define entry, stop, target, and position size before opening a simulated trade.', 'action_label' => 'Open Workspace', 'action_url' => '/dashboard'],
    ],
];
