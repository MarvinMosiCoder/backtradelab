<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('market_symbols', function (Blueprint $table) {
            $table->foreignId('adm_user_id')
                ->nullable()
                ->after('id')
                ->constrained('adm_users')
                ->cascadeOnDelete();
        });

        Schema::table('market_symbols', function (Blueprint $table) {
            if ($this->indexExists('market_symbols_exchange_category_symbol_unique')) {
                $table->dropUnique('market_symbols_exchange_category_symbol_unique');
            }

            $table->unique(
                ['adm_user_id', 'exchange', 'category', 'symbol'],
                'market_symbols_user_exchange_category_symbol_unique'
            );
            $table->index(['adm_user_id', 'is_active'], 'market_symbols_user_active_idx');
        });
    }

    public function down(): void
    {
        Schema::table('market_symbols', function (Blueprint $table) {
            $table->dropUnique('market_symbols_user_exchange_category_symbol_unique');
            $table->dropIndex('market_symbols_user_active_idx');
            $table->dropConstrainedForeignId('adm_user_id');
        });

        Schema::table('market_symbols', function (Blueprint $table) {
            $table->unique(['exchange', 'category', 'symbol'], 'market_symbols_exchange_category_symbol_unique');
        });
    }

    private function indexExists(string $name): bool
    {
        return collect(Schema::getIndexes('market_symbols'))->contains(fn ($index) => $index['name'] === $name);
    }
};
