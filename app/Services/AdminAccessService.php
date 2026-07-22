<?php

namespace App\Services;

use App\Models\AdmUser;
use Illuminate\Support\Facades\DB;

class AdminAccessService
{
    private const ACTION_COLUMNS = [
        'view' => 'is_visible',
        'visible' => 'is_visible',
        'create' => 'is_create',
        'read' => 'is_read',
        'edit' => 'is_edit',
        'update' => 'is_edit',
        'delete' => 'is_delete',
        'void' => 'is_void',
        'override' => 'is_override',
    ];

    public function isAdmin(?AdmUser $user): bool
    {
        $role = $this->role($user);

        return $role && ((bool) $role->is_admin || (bool) $role->is_superadmin);
    }

    public function isSuperadmin(?AdmUser $user): bool
    {
        return (bool) ($this->role($user)?->is_superadmin ?? false);
    }

    public function allows(?AdmUser $user, string $modulePath, string $action): bool
    {
        $role = $this->role($user);
        if (!$role || (!(bool) $role->is_admin && !(bool) $role->is_superadmin)) {
            return false;
        }
        if ((bool) $role->is_superadmin) {
            return true;
        }

        $column = self::ACTION_COLUMNS[strtolower($action)] ?? null;
        if (!$column) {
            return false;
        }

        return DB::table('adm_privileges_roles as permission')
            ->join('adm_modules as module', 'module.id', '=', 'permission.id_adm_modules')
            ->where('permission.id_adm_privileges', $role->id)
            ->where('module.path', trim($modulePath, '/'))
            ->where('module.is_active', 1)
            ->where($column, 1)
            ->exists();
    }

    public function role(?AdmUser $user): ?object
    {
        if (!$user?->id_adm_privileges) {
            return null;
        }

        return DB::table('adm_privileges')
            ->where('id', $user->id_adm_privileges)
            ->first(['id', 'name', 'is_admin', 'is_superadmin', 'theme_color']);
    }
}
