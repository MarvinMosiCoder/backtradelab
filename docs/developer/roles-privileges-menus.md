# Roles, Privileges, and Menus

## Purpose

The legacy administration layer stores privileges, modules, menus, and their mappings in the database. It controls admin navigation and can register module controller routes dynamically.

`adm_privileges.is_admin` distinguishes administrative roles from the protected `Users` trader role. `is_superadmin` grants a full bypass; restricted administrators require an explicit `adm_privileges_roles` action for the current module. The `admin`, `superadmin`, and `admin.permission:{module},{action}` middleware enforce these rules from current database state.

## Files and data

| File/table | Responsibility |
|---|---|
| `PrivilegesController.php` / `adm_privileges` | Create and edit privileges |
| `ModulsController.php` / `adm_modules` | Module metadata and legacy scaffolding |
| `MenusController.php` / `adm_menuses` | Menu tree, status, sidebar response |
| `adm_privileges_roles` | Privilege-to-role/module mappings |
| `adm_menus_privileges` | Menu visibility per privilege |
| `adm_admin_menuses` | Admin menu hierarchy |
| `CommonHelpers.php` | Dynamic route/controller discovery |
| `AdminSidebar.jsx` | Render authorized admin navigation |

## Flow

1. Admin CRUD pages write privilege/module/menu records.
2. Login session setup stores the user's privilege and authorized menu information.
3. `/sidebar` returns menu data for the authenticated session.
4. `routes/web.php` reads active modules and registers legacy controller routes.

Because dynamic routes depend on database state, use:

```bash
php artisan route:list
```

after migrations/seeders and before changing a generated module.

## Maintenance rules

- Treat controller names and paths stored in the database as executable routing configuration.
- Require `check.user` for admin-only pages and verify privilege in controller actions.
- Keep parent/child menu ordering and privilege mappings consistent.
- Do not assume hiding a menu authorizes an endpoint; authorization belongs on the server.
- Never use `admin_is_admin`, `admin_is_superadmin`, or menu visibility as a backend authorization decision.
- Keep the `Users` privilege non-admin, prevent self-demotion and final-superadmin removal, and deny missing module mappings by default.
- Review generated controller/view code before committing it.

## Verification

- Superadmin and restricted-privilege menus.
- Direct URL access when a menu is hidden.
- Create/edit/deactivate privilege and menu.
- Route list with and without module seed data.
- No duplicate route names introduced by generated modules.

Related: [Admin API generator](admin-api-generator.md), [Dashboard and layouts](dashboard-and-layouts.md).
