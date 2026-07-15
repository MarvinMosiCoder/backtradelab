<?php

namespace App\Services;

use App\Models\AdmUser;
use App\Models\MarketPriceAlert;
use Illuminate\Support\Facades\DB;

class AccountDeactivationService
{
    public function deactivate(AdmUser $user, ?int $actorId = null, ?string $reason = null): void
    {
        DB::transaction(function () use ($user, $actorId, $reason) {
            $user->forceFill([
                'status' => 'INACTIVE',
                'deactivated_at' => now(),
                'deactivation_reason' => $reason,
                'deactivated_by' => $actorId,
            ])->save();

            $user->tokens()->delete();

            MarketPriceAlert::query()
                ->where('adm_user_id', $user->id)
                ->where('status', 'active')
                ->update(['status' => 'inactive']);

        });
    }

    public function reactivate(AdmUser $user): void
    {
        $user->forceFill([
            'status' => 'ACTIVE',
            'deactivated_at' => null,
            'deactivation_reason' => null,
            'deactivated_by' => null,
        ])->save();
    }
}
