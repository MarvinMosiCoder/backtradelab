# Authentication and OAuth

## Purpose

Traders sign in at `/login` with email/password or Google/Facebook. Administrative accounts use the separate email/password-only `/admin/login`. Both use the same `adm_users` identity table and Laravel session guard; current database privileges determine authorization. Successful traders enter `/market`; administrators enter `/dashboard`.

## Routes and files

| Route/file | Responsibility |
|---|---|
| `GET /login`, `POST /login-save` | Render and process password login |
| `GET/POST /admin/login` | Render and process the admin-only password login |
| `GET /auth/{provider}/redirect`, callback | Socialite OAuth flow |
| `/reset_password*`, `/send_resetpass_email*` | Password-reset screens and actions |
| `app/Http/Controllers/Auth/LoginController.php` | Authentication, OAuth account matching/creation, session setup, logout |
| `app/Http/Controllers/Auth/ResetPasswordController.php` | Reset validation and password history |
| `resources/js/Pages/Auth/*.jsx` | Login and reset UI |
| `config/services.php` | OAuth provider configuration |

Login is throttled at the route:

```php
Route::post('login-save', [LoginController::class, 'authenticate'])
    ->middleware('throttle:login');
```

## Flow

1. `Login.jsx` posts credentials to `/login-save`.
2. Laravel validates the account, status, and password.
3. `LoginController` loads privilege, menus, profile, theme, notification, and announcement session data.
4. Laravel regenerates the authenticated session and redirects by the current database role. The trader endpoint rejects administrative accounts; the admin endpoint rejects non-admin accounts with a generic error.
5. OAuth redirects through Socialite. The callback matches provider identity, then email, and may create a non-superadmin account.

`adm_users` stores identity, provider fields, password-login state, status, privilege, onboarding, trial, and paid-access fields. Password history is stored in `adm_password_histories`.

## Security and maintenance

- Keep OAuth secrets in `.env`; expose only callback URLs publicly.
- Do not allow OAuth registration to choose superadmin privilege.
- Keep social authentication and registration unavailable from the admin login.
- Treat `is_admin`, `is_superadmin`, and module permissions from the database as authoritative; session role values are presentation caches only.
- Reject inactive accounts in every login path.
- Regenerate sessions on authentication and invalidate them on logout.
- Preserve named login/reset/social rate limiters when editing routes.
- When adding a provider, update `whereIn`, `config/services.php`, `.env.example`, callback logic, login UI, and tests.

## Verification

- Correct/incorrect password and throttling.
- Inactive user rejection.
- Known and unknown OAuth email behavior.
- Provider callback error/cancel behavior.
- Normal-user versus superadmin redirect.
- Reset token, password rules, and password-history rejection.
- Password submission shows the theme-aware, accessible “Signing in” overlay until navigation or an authentication error; the email lookup retains its smaller button state.

Related: [Users, profiles, and deactivation](users-profiles-and-deactivation.md), [Roles](roles-privileges-menus.md).
# Two-step login and social consent

Email login first collects a syntactically valid email and checks `/login/check-email` for an existing account before showing the password step. The lookup has dedicated identity/IP rate limits. Password submission remains protected by the existing login rate limits.

After the email step, the login form retains the email internally and displays only the password field. Returning to or reloading the login page starts again at the email step.

Known Google/Facebook users sign in directly. Unknown identities are kept in the server session for up to 15 minutes and sent to `/social-registration/confirm`. No user is created until the visitor accepts the Terms and Privacy Policy and selects **Create account**. Acceptance timestamps and the configured legal effective date are stored. Cancel or expiry clears the pending identity.
