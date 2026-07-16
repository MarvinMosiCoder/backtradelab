# Admin API Generator

## Purpose

This legacy subsystem lets administrators configure API endpoints and issue API keys. `ApiController` executes configured endpoints; API configuration, keys, logs, and limits are stored in database tables.

| File/table | Responsibility |
|---|---|
| `AdminApiController.php` | Key/configuration CRUD and bulk actions |
| `Api/ApiController.php` | Configured request handling |
| `ApiConfiguration.php` | Endpoint configuration |
| `ApiKeys.php` | Issued keys and active/valid checks |
| `ApiLogs.php`, `ApiRateLimits.php` | Audit and limits |
| `Pages/AdmVram/ApiGenerator*`, `ApiSecretKey.jsx` | Admin UI |

## Flow

1. Admin creates a configuration describing a model/table operation and endpoint.
2. Admin generates and activates/deactivates keys.
3. Incoming configured requests are validated against endpoint status, key, and limits.
4. Requests and outcomes are logged.

Routes under `/api_generator/*` use authenticated legacy admin middleware. Additional runtime endpoint shapes may depend on database configuration, so inspect the route list and `api_configurations` data.

## Security warning

The current generator stores/displays API keys in a legacy manner. Before exposing it externally, use hashed-at-rest key verification, show plaintext only once, apply explicit authorization/scopes, validate allowed tables/columns/operations, and protect logs from secret/personal-data leakage.

## Verification

- Admin-only key/config CRUD.
- Inactive/expired/invalid key.
- Rate limit and audit log.
- Endpoint cannot access unapproved model/table/fields.
- Generated routes/configuration after deployment.

Related: [Roles](roles-privileges-menus.md), [Deployment](deployment-and-production.md).
