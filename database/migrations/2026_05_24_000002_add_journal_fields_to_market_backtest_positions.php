<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('market_backtest_positions')) {
            return;
        }

        Schema::table('market_backtest_positions', function (Blueprint $table) {
            if (!Schema::hasColumn('market_backtest_positions', 'setup_tag')) {
                $table->string('setup_tag', 80)->nullable()->after('status');
            }

            if (!Schema::hasColumn('market_backtest_positions', 'tags')) {
                $table->json('tags')->nullable()->after('setup_tag');
            }

            if (!Schema::hasColumn('market_backtest_positions', 'entry_reason')) {
                $table->text('entry_reason')->nullable()->after('tags');
            }

            if (!Schema::hasColumn('market_backtest_positions', 'exit_reason')) {
                $table->text('exit_reason')->nullable()->after('entry_reason');
            }

            if (!Schema::hasColumn('market_backtest_positions', 'mistake')) {
                $table->text('mistake')->nullable()->after('exit_reason');
            }

            if (!Schema::hasColumn('market_backtest_positions', 'emotion')) {
                $table->string('emotion', 80)->nullable()->after('mistake');
            }

            if (!Schema::hasColumn('market_backtest_positions', 'journal_notes')) {
                $table->text('journal_notes')->nullable()->after('emotion');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('market_backtest_positions')) {
            return;
        }

        Schema::table('market_backtest_positions', function (Blueprint $table) {
            foreach ([
                'journal_notes',
                'emotion',
                'mistake',
                'exit_reason',
                'entry_reason',
                'tags',
                'setup_tag',
            ] as $column) {
                if (Schema::hasColumn('market_backtest_positions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
