<?php

namespace App\Console\Commands;

use App\Models\AdmModels\AdmNotifications;
use App\Models\AdmUser;
use App\Models\SubscriptionPlan;
use App\Models\SubscriptionRequest;
use Illuminate\Console\Command;
use Throwable;

class SendSubscriptionRenewalReminders extends Command
{
    protected $signature = 'subscriptions:send-renewal-reminders {--days=}';
    protected $description = 'Notify users whose paid replay access is about to expire';

    public function handle(): int
    {
        $days = (int) ($this->option('days') ?? config('services.subscriptions.renewal_reminder_days', 3));
        $days = max(1, $days);

        $users = AdmUser::query()
            ->whereNotNull('replay_access_ends_at')
            ->whereNull('renewal_reminder_sent_at')
            ->whereBetween('replay_access_ends_at', [now(), now()->addDays($days)])
            ->get();

        $failures = 0;
        foreach ($users as $user) {
            try {
                $planName = $this->resolvePlanName($user);
                $endsAt = $user->replay_access_ends_at;

                AdmNotifications::query()->create([
                    'adm_user_id' => $user->id,
                    'type' => 'subscription_reminder',
                    'content' => "Your {$planName} replay access ends ".$endsAt->format('M j, Y g:i A').'. Renew to keep uninterrupted access.',
                    'url' => '/subscription',
                    'is_read' => false,
                ]);

                $user->update(['renewal_reminder_sent_at' => now()]);
            } catch (Throwable $exception) {
                $failures++;
                $this->components->error('User '.$user->id.': '.$exception->getMessage());
            }
        }

        $this->components->info('Reminded '.$users->count().' user(s); '.$failures.' failed.');
        return $failures ? self::FAILURE : self::SUCCESS;
    }

    private function resolvePlanName(AdmUser $user): string
    {
        $lastPaid = SubscriptionRequest::query()
            ->where('adm_user_id', $user->id)
            ->where('status', 'paid')
            ->latest('paid_at')
            ->first();

        if (!$lastPaid) {
            return 'plan';
        }

        $plan = SubscriptionPlan::query()->where('code', $lastPaid->plan)->first();

        return $plan->name ?? ucfirst($lastPaid->plan);
    }
}
