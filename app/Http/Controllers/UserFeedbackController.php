<?php

namespace App\Http\Controllers;

use App\Models\UserFeedback;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserFeedbackController extends Controller
{
    private const CATEGORIES = ['enhancement', 'feature', 'bug', 'usability', 'performance', 'other'];
    private const STATUSES = ['submitted', 'reviewing', 'planned', 'in_progress', 'completed', 'declined'];
    private const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

    public function userPage()
    {
        return Inertia::render('Feedback/Index');
    }

    public function adminPage(Request $request)
    {
        $this->ensureSuperAdmin($request);

        return Inertia::render('Feedback/AdminIndex');
    }

    public function index(Request $request)
    {
        $items = UserFeedback::query()
            ->where('adm_user_id', $request->user()->id)
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (UserFeedback $feedback) => $this->serialize($feedback));

        return response()->json(['success' => true, 'feedback' => $items]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category' => ['required', Rule::in(self::CATEGORIES)],
            'title' => ['required', 'string', 'min:4', 'max:160'],
            'description' => ['required', 'string', 'min:10', 'max:5000'],
            'page_url' => ['nullable', 'string', 'max:500'],
        ]);

        $feedback = UserFeedback::query()->create([
            ...$validated,
            'adm_user_id' => $request->user()->id,
            'status' => 'submitted',
            'priority' => 'normal',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Thank you. Your feedback was submitted.',
            'feedback' => $this->serialize($feedback),
        ], 201);
    }

    public function adminIndex(Request $request)
    {
        $this->ensureSuperAdmin($request);
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'category' => ['nullable', Rule::in(self::CATEGORIES)],
            'priority' => ['nullable', Rule::in(self::PRIORITIES)],
            'search' => ['nullable', 'string', 'max:120'],
        ]);

        $items = UserFeedback::query()
            ->with('user:id,name,email')
            ->when($validated['status'] ?? null, fn ($query, $value) => $query->where('status', $value))
            ->when($validated['category'] ?? null, fn ($query, $value) => $query->where('category', $value))
            ->when($validated['priority'] ?? null, fn ($query, $value) => $query->where('priority', $value))
            ->when($validated['search'] ?? null, function ($query, $value) {
                $query->where(function ($nested) use ($value) {
                    $nested->where('title', 'like', "%{$value}%")
                        ->orWhere('description', 'like', "%{$value}%")
                        ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', "%{$value}%")->orWhere('email', 'like', "%{$value}%"));
                });
            })
            ->orderByRaw("FIELD(priority, 'urgent', 'high', 'normal', 'low')")
            ->latest()
            ->limit(250)
            ->get()
            ->map(fn (UserFeedback $feedback) => $this->serialize($feedback, true));

        return response()->json(['success' => true, 'feedback' => $items]);
    }

    public function update(Request $request, UserFeedback $feedback)
    {
        $this->ensureSuperAdmin($request);
        $validated = $request->validate([
            'status' => ['required', Rule::in(self::STATUSES)],
            'priority' => ['required', Rule::in(self::PRIORITIES)],
            'admin_response' => ['nullable', 'string', 'max:5000'],
        ]);

        $feedback->update([
            ...$validated,
            'responded_by' => $request->user()->id,
            'responded_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Feedback updated.',
            'feedback' => $this->serialize($feedback->fresh('user'), true),
        ]);
    }

    private function ensureSuperAdmin(Request $request): void
    {
        abort_unless((bool) $request->session()->get('admin_is_superadmin'), 403);
    }

    private function serialize(UserFeedback $feedback, bool $includeUser = false): array
    {
        return [
            'id' => $feedback->id,
            'category' => $feedback->category,
            'title' => $feedback->title,
            'description' => $feedback->description,
            'pageUrl' => $feedback->page_url,
            'status' => $feedback->status,
            'priority' => $feedback->priority,
            'adminResponse' => $feedback->admin_response,
            'respondedAt' => optional($feedback->responded_at)->toIso8601String(),
            'createdAt' => optional($feedback->created_at)->toIso8601String(),
            'updatedAt' => optional($feedback->updated_at)->toIso8601String(),
            'user' => $includeUser && $feedback->user ? [
                'id' => $feedback->user->id,
                'name' => $feedback->user->name,
                'email' => $feedback->user->email,
            ] : null,
        ];
    }
}
