# System Settings

## Purpose

Administrators configure application presentation such as name, logo, login details, and theme-related settings stored in `adm_settings`.

| Route/file | Responsibility |
|---|---|
| `GET /appname`, `/applogo`, `/login-details` | Publicly needed presentation values |
| `POST /settings/postSave`, `/postDelete` | Authenticated admin changes |
| `SettingsController.php` | Read/write settings and files |
| `AdmSettings.php` | Settings records |
| `Pages/AdmVram/Settings.jsx` | Admin settings UI |
| `Components/SystemSettings/*.jsx` | Frontend value loaders |

`app.jsx` loads the application name before creating the Inertia app, while `AppInitializer.jsx` loads the logo for navigation progress presentation.

## Maintenance

- Keep public getter responses limited to non-secret presentation data.
- Validate uploaded logo/favicon type and size, and delete/replace files safely.
- Cache settings only with a clear invalidation path after admin updates.
- Provide a stable default when a setting is absent.
- Environment-backed legal/payment/provider configuration does not belong in this database UI unless a secure secret-management design is added.

## Verification

- Defaults on a fresh database.
- Name/logo/login changes after reload.
- Invalid file rejection.
- Restricted settings write/delete.
- Dark/light layout remains readable.

Related: [Public pages](public-and-legal-pages.md), [Dashboard](dashboard-and-layouts.md).
