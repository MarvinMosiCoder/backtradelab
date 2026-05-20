<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('market_symbols', function (Blueprint $table) {
            $table->string('exchange', 24)->default('bybit')->after('symbol');
            $table->string('exchange_symbol', 64)->nullable()->after('exchange');
            $table->string('coin_name', 64)->nullable()->after('exchange_symbol');
            $table->string('base_coin', 32)->nullable()->after('coin_name');
            $table->string('quote_coin', 32)->nullable()->after('base_coin');
            $table->dropUnique(['symbol']);
            $table->unique(['exchange', 'category', 'symbol']);
        });
    }

    public function down(): void
    {
        Schema::table('market_symbols', function (Blueprint $table) {
            $table->dropUnique(['exchange', 'category', 'symbol']);
            $table->unique(['symbol']);
            $table->dropColumn([
                'exchange',
                'exchange_symbol',
                'coin_name',
                'base_coin',
                'quote_coin',
            ]);
        });
    }
};
