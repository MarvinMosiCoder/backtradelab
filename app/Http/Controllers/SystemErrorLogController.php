<?php

namespace App\Http\Controllers;

use App\Models\SystemErrorLog;
use App\Services\AdminAccessService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SystemErrorLogController extends Controller
{
    private const AREAS = ['payments', 'backtest', 'general'];

    public function __construct(private readonly AdminAccessService $adminAccess)
    {
    }

    public function adminPage(Request $request)
    {
        $this->ensureSuperAdmin($request);
        return Inertia::render('SystemLogs/AdminIndex');
    }

    public function adminIndex(Request $request)
    {
        $this->ensureSuperAdmin($request);
        $validated = $request->validate([
            'area' => ['nullable', Rule::in(self::AREAS)],
            'resolved' => ['nullable', 'in:0,1'],
            'search' => ['nullable', 'string', 'max:120'],
        ]);

        $items = SystemErrorLog::query()
            ->with('user:id,name,email')
            ->when($validated['area'] ?? null, fn ($query, $value) => $query->where('area', $value))
            ->when(($validated['resolved'] ?? null) !== null, fn ($query) => $query
                ->when($validated['resolved'] === '1', fn ($q) => $q->whereNotNull('resolved_at'))
                ->when($validated['resolved'] === '0', fn ($q) => $q->whereNull('resolved_at')))
            ->when($validated['search'] ?? null, function ($query, $value) {
                $query->where(function ($nested) use ($value) {
                    $nested->where('message', 'like', "%{$value}%")
                        ->orWhere('exception_class', 'like', "%{$value}%")
                        ->orWhere('file', 'like', "%{$value}%")
                        ->orWhere('url', 'like', "%{$value}%");
                });
            })
            ->orderByDesc('last_seen_at')
            ->paginate(30)
            ->through(fn (SystemErrorLog $log) => $this->serialize($log));

        return response()->json($items);
    }

    public function resolve(Request $request, SystemErrorLog $systemErrorLog)
    {
        $this->ensureSuperAdmin($request);
        $systemErrorLog->update(['resolved_at' => $systemErrorLog->resolved_at ? null : now()]);

        return response()->json(['success' => true, 'log' => $this->serialize($systemErrorLog->fresh('user'))]);
    }

    private function ensureSuperAdmin(Request $request): void
    {
        abort_unless($this->adminAccess->isSuperadmin($request->user()), 403);
    }

    private function serialize(SystemErrorLog $log): array
    {
        return [
            'id' => $log->id,
            'area' => $log->area,
            'level' => $log->level,
            'exceptionClass' => $log->exception_class,
            'message' => $log->message,
            'file' => $log->file,
            'line' => $log->line,
            'trace' => $log->trace,
            'url' => $log->url,
            'method' => $log->method,
            'ip' => $log->ip,
            'user' => $log->user ? ['id' => $log->user->id, 'name' => $log->user->name, 'email' => $log->user->email] : null,
            'occurrences' => $log->occurrences,
            'lastSeenAt' => optional($log->last_seen_at)->toIso8601String(),
            'resolvedAt' => optional($log->resolved_at)->toIso8601String(),
            'createdAt' => optional($log->created_at)->toIso8601String(),
        ];
    }
}
