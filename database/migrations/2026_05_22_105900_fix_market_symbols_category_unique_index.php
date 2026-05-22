<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('market_symbols', function (Blueprint $table) {
            if ($this->indexExists('market_symbols', 'market_symbols_exchange_symbol_unique')) {
                $table->dropUnique('market_symbols_exchange_symbol_unique');
            }

            if (!$this->indexExists('market_symbols', 'market_symbols_exchange_category_symbol_unique')) {
                $table->unique(['exchange', 'category', 'symbol'], 'market_symbols_exchange_category_symbol_unique');
            }
        });
    }

    public function down(): void
    {
        Schema::table('market_symbols', function (Blueprint $table) {
            if ($this->indexExists('market_symbols', 'market_symbols_exchange_category_symbol_unique')) {
                $table->dropUnique('market_symbols_exchange_category_symbol_unique');
            }

            if (!$this->indexExists('market_symbols', 'market_symbols_exchange_symbol_unique')) {
                $table->unique(['exchange', 'symbol'], 'market_symbols_exchange_symbol_unique');
            }
        });
    }

    private function indexExists(string $table, string $name): bool
    {
        return collect(Schema::getIndexes($table))->contains(fn ($index) => $index['name'] === $name);
    }
};
