<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('market_backtest_playbooks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adm_user_id')->constrained('adm_users')->cascadeOnDelete();
            $table->string('name', 120);
            $table->text('description')->nullable();
            $table->text('entry_rules')->nullable();
            $table->text('confirmation_rules')->nullable();
            $table->text('invalidation_rules')->nullable();
            $table->text('stop_rules')->nullable();
            $table->text('target_rules')->nullable();
            $table->json('checklist')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['adm_user_id', 'name']);
            $table->index(['adm_user_id', 'is_active']);
        });

        Schema::table('market_backtest_positions', function (Blueprint $table) {
            $table->foreignId('market_backtest_playbook_id')
                ->nullable()
                ->after('market_backtest_session_id')
                ->constrained('market_backtest_playbooks')
                ->nullOnDelete();
            $table->json('playbook_snapshot')->nullable()->after('journal_notes');
            $table->json('checklist_answers')->nullable()->after('playbook_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('market_backtest_positions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('market_backtest_playbook_id');
            $table->dropColumn(['playbook_snapshot', 'checklist_answers']);
        });

        Schema::dropIfExists('market_backtest_playbooks');
    }
};
