<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_challenges', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 60)->unique();
            $table->string('name', 120);
            $table->text('description');
            $table->json('rules');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $now = now();

        DB::table('training_challenges')->insert([
            [
                'slug' => 'risk-discipline-20',
                'name' => '20 Trades, 1% Risk Discipline',
                'description' => 'Close 20 trades, each risking at most 1% of your starting balance.',
                'rules' => json_encode(['requiredTrades' => 20, 'maxRiskPercentPerTrade' => 1.0]),
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'playbook-consistency-15',
                'name' => 'Playbook Consistency — 15 Trades',
                'description' => 'Close 15 trades, every one using an attached strategy playbook.',
                'rules' => json_encode(['requiredTrades' => 15, 'requirePlaybookId' => true]),
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'loss-streak-control-10',
                'name' => 'Loss Streak Control — 10 Trades',
                'description' => 'Close 10 trades without ever hitting 3 consecutive losses.',
                'rules' => json_encode(['requiredTrades' => 10, 'maxConsecutiveLosses' => 3]),
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'combined-discipline-25',
                'name' => 'Combined Discipline — 25 Trades',
                'description' => 'Close 25 trades, each risking at most 1.5%, using a playbook, without a 4-trade loss streak.',
                'rules' => json_encode([
                    'requiredTrades' => 25,
                    'maxRiskPercentPerTrade' => 1.5,
                    'requirePlaybookId' => true,
                    'maxConsecutiveLosses' => 4,
                ]),
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('training_challenges');
    }
};
