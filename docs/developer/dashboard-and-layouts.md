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

For superadmins, `/dashboard` includes user health, verified PHP subscription revenue and transaction status, customer-support workload, and the five latest subscription and feedback records. Thirty-day values use a rolling window; subscription revenue includes only verified `paid` PHP transactions and uses `paid_at`.

`GET /admin/workspace` is superadmin-only and reuses the complete trader workspace in an explicit workspace mode. Its **Workspace Chart** link is an `adm_menuses` record with a superadmin privilege mapping, so it is loaded into the main `MENU` sidebar exactly like Market and PNL rather than being hard-coded or placed in the legacy `ADMIN MENU` section. It keeps the administration overview at `/dashboard` while giving administrators access to watchlists, chart controls, Replay, drawings, alerts, and simulated orders.

The admin header keeps two distinct controls below the large-screen breakpoint: the left button toggles the database-driven sidebar and the right button opens the compact core-module menu. The visible legacy operations are Privileges, Announcements, Notifications, Log User Access, Module Activity History, and System Error Logs. Menu Management, Module Generator, and API Generator remain implemented but are inactive in navigation.

## Maintenance

- Keep `Auth/*` and `Public/*` outside the authenticated layout.
- Test content overflow when adding fixed headers/sidebars or fullscreen chart UI.
- Add new navigation in both server authorization and the correct role layout.
- Do not derive admin access only from client-rendered role labels.

## Verification

- Trader and superadmin landing pages.
- Empty and populated subscription/support dashboard summaries and recent lists.
- Normal-user denial and superadmin access for `/admin/workspace`.
- Desktop/mobile sidebar and navbar behavior.
- Both mobile admin menu controls remain aligned, independently operable, and within the viewport.
- Dark/light themes.
- Logout performs one request.
- Market symbol/account widgets refresh after relevant chart actions.

Related: [Architecture](02-project-architecture.md), [Trading chart](trading-chart.md).
