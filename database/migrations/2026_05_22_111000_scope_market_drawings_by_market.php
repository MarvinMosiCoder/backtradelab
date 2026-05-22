<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('market_drawings', function (Blueprint $table) {
            if (!Schema::hasColumn('market_drawings', 'exchange')) {
                $table->string('exchange', 24)->default('bybit')->after('adm_user_id');
            }

            if (!Schema::hasColumn('market_drawings', 'category')) {
                $table->string('category', 16)->default('spot')->after('exchange');
            }
        });

        Schema::table('market_drawings', function (Blueprint $table) {
            if (!$this->indexExists('market_drawings', 'market_drawings_adm_user_id_index')) {
                $table->index('adm_user_id', 'market_drawings_adm_user_id_index');
            }

            if ($this->indexExists('market_drawings', 'market_drawings_adm_user_id_symbol_unique')) {
                $table->dropUnique('market_drawings_adm_user_id_symbol_unique');
            }

            if (!$this->indexExists('market_drawings', 'market_drawings_user_market_symbol_unique')) {
                $table->unique(
                    ['adm_user_id', 'exchange', 'category', 'symbol'],
                    'market_drawings_user_market_symbol_unique'
                );
            }
        });
    }

    public function down(): void
    {
        Schema::table('market_drawings', function (Blueprint $table) {
            if ($this->indexExists('market_drawings', 'market_drawings_user_market_symbol_unique')) {
                $table->dropUnique('market_drawings_user_market_symbol_unique');
            }

            if (!$this->indexExists('market_drawings', 'market_drawings_adm_user_id_symbol_unique')) {
                $table->unique(['adm_user_id', 'symbol'], 'market_drawings_adm_user_id_symbol_unique');
            }
        });

        Schema::table('market_drawings', function (Blueprint $table) {
            if (Schema::hasColumn('market_drawings', 'category')) {
                $table->dropColumn('category');
            }

            if (Schema::hasColumn('market_drawings', 'exchange')) {
                $table->dropColumn('exchange');
            }
        });
    }

    private function indexExists(string $table, string $name): bool
    {
        return collect(Schema::getIndexes($table))->contains(fn ($index) => $index['name'] === $name);
    }
};
