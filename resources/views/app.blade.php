<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="icon" href="/images/settings/favicon-logo/favicon-logo.png?v=2" type="image/gif" sizes="16x16">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        {{-- @routes --}}
        @viteReactRefresh 
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
        <!-- As you can see, we will use vite with jsx syntax for React-->
        @inertiaHead
    </head>
    <body>
        @inertia
    </body>
</html>
