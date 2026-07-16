# Users, Profiles, and Deactivation

## Purpose and entry points

Authenticated users manage profile details, image, theme, and password under `/profile` and password pages. Administrators create/edit users and change status through user-management routes.

| File | Responsibility |
|---|---|
| `ProfilePageController.php` | Profile reads/updates and self-deactivation |
| `AdminUsersController.php` | Admin CRUD, password, bulk status |
| `ForceChangePasswordController.php` | Required password-change and waiver flow |
| `AccountDeactivationService.php` | Shared deactivate/reactivate transaction |
| `AdmUser.php`, `AdmUserProfiles.php` | Account and extended profile records |
| `Pages/AdmVram/ProfilePage.jsx` | Profile and danger-zone UI |

## Deactivation flow

1. `POST /profile/deactivate` requires `auth`, `account.active`, throttling, confirmation text, and—when applicable—the current password.
2. `AccountDeactivationService::deactivate()` marks the account inactive, records actor/reason/time, revokes Sanctum tokens, and disables active price alerts.
3. The controller logs out and invalidates the current session.
4. Other sessions are stopped by `account.active` on their next request.

Deactivation is non-destructive: trading, drawings, replay, journal, feedback, and subscription records remain. Reactivation clears deactivation metadata but does not re-enable alerts.

## Ownership and safety

- A profile action must use the authenticated user, never a request-supplied user ID.
- Admin status changes must prevent self-deactivation.
- File uploads require image type/size validation and controlled storage paths.
- Password changes must enforce current-password/history rules and perform one logout request.

## Verification

- Update name/profile image/theme.
- Local-password and social-only deactivation.
- Wrong password or missing `DEACTIVATE`.
- Token revocation and second-browser blocking.
- Admin reactivation and preserved records.
- Admin cannot deactivate self.

Related: [Authentication](authentication-and-oauth.md), [Price alerts](price-alerts-and-notifications.md).
