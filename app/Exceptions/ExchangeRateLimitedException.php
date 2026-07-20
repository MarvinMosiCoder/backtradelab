<?php

namespace App\Exceptions;

use RuntimeException;

class ExchangeRateLimitedException extends RuntimeException
{
    public function __construct(
        public readonly string $exchange,
        public readonly int $retryAfter,
        string $message = 'Exchange market data is temporarily rate limited.'
    ) {
        parent::__construct($message, 429);
    }
}
