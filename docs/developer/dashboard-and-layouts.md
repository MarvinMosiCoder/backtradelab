# Dashboard and Layouts

## Purpose

Authenticated pages share a role-aware shell. Traders receive compact market navigation; superadmins receive administration navigation and dashboard statistics.

| File | Responsibility |
|---|---|
| `DashboardController.php` | Build dashboard Inertia props |
| `Pages/Dashboard/Dashboard.jsx` | Role-specific dashboard/workspace |
| `Layouts/layout/layout.jsx` | Main authenticated composition |
| `AppNavbar.jsx`, `AdminNavbar.jsx`, `TraderNavbar.jsx` | Header variants |
| `AppSidebar.jsx`, `TraderSidebar.jsx`, `AdminSidebar.jsx` | Navigation variants |
| `AppContent.jsx` | Main content sizing/scrolling |
| `app.jsx` | Public/auth page layout selection |

## Flow

1. An authenticated route returns an Inertia page.
2. `app.jsx` wraps it with contexts and `Layout`.
3. Layout reads the authenticated privilege/session state.
4. Admin or trader navigation is selected.
5. The page renders inside `AppContent`; navigation actions use Inertia or JSON endpoints.

`GET /dashboard` uses `auth` and `account.active`. `GET /market` is the normal trader workspace.

## Maintenance

- Keep `Auth/*` and `Public/*` outside the authenticated layout.
- Test content overflow when adding fixed headers/sidebars or fullscreen chart UI.
- Add new navigation in both server authorization and the correct role layout.
- Do not derive admin access only from client-rendered role labels.

## Verification

- Trader and superadmin landing pages.
- Desktop/mobile sidebar and navbar behavior.
- Dark/light themes.
- Logout performs one request.
- Market symbol/account widgets refresh after relevant chart actions.

Related: [Architecture](02-project-architecture.md), [Trading chart](trading-chart.md).
