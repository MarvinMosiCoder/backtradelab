<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],



    'apple_api' => [
        'base_url' => env('APPLE_API_BASE_URL'),
        'bulk_enroll_endpoint' => env('APPLE_API_BULK_ENROLL_ENDPOINT'),
        'show_order_details_endpoint' => env('APPLE_API_SHOW_ORDER_DETAILS_ENDPOINT'),
        'check_transaction_status_endpoint' => env('APPLE_API_CHECK_TRANSACTION_STATUS_ENDPOINT'),
        'certificate_path' => env('APPLE_API_CERTIFICATE_PATH', ''),
        'certificate_key_path' => env('APPLE_API_CERTIFICATE_KEY_PATH', ''),
        'ship_to' => env('SHIP_TO','0000742682'),
        'timezone' => env('TIMEZONE','420'),   
        'langCode' => env('LANGCODE','en')      
    ],


];