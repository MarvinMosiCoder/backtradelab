<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="icon" href="/images/settings/favicon-logo/favicon-logo.png?v=2" type="image/gif" sizes="16x16">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        {{-- @routes --}}
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/css/boot-splash.css', 'resources/js/app.jsx'])
        <!-- As you can see, we will use vite with jsx syntax for React-->
        @inertiaHead
    </head>
    <body>
        <div id="boot-splash" aria-hidden="true">
            <div class="boot-splash-candles">
                <span></span><span></span><span></span><span></span><span></span>
            </div>
        </div>
        @inertia
    </body>
</html>
