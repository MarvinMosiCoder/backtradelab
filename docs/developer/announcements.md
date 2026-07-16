# Announcements

## Purpose

Administrators create/edit announcements; authenticated users retrieve unread announcements and mark them read.

| Route/file | Responsibility |
|---|---|
| `/announcement*` | List/create/edit actions |
| `GET /unread-announcement` | Current user's unread items |
| `POST /read-announcement` | Update pivot read state |
| `AnnouncementsController.php` | Announcement and audience logic |
| `Announcement.php` | Many-to-many user relationship |
| `announcements`, `announcement_user` | Content and per-user read state |
| `Pages/AdmVram/Announcement*.jsx` | Admin/user presentation |

## Flow

1. Admin creates content and target/audience settings.
2. Records are associated to users through `announcement_user`.
3. Authenticated UI requests unread items.
4. Reading updates the authenticated user's pivot row.

## Maintenance and verification

- Sanitize rich announcement content before rendering.
- Never let a user mark another user's pivot record.
- Enforce admin privileges on create/edit, not only menu visibility.
- Test audience selection, unread count, mark-read idempotency, expired/inactive items, and restricted direct URLs.

Related: [Roles](roles-privileges-menus.md), [Dashboard](dashboard-and-layouts.md).
