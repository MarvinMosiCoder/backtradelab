# Getting Started

## Requirements

- PHP 8.1 or newer with extensions required by Laravel and MySQL
- Composer
- Node.js and npm
- MySQL
- A local web server such as Laragon, or `php artisan serve`

## Install step by step

```bash
composer install
npm install
copy .env.example .env
php artisan key:generate
```

Create the database named by `DB_DATABASE`, then configure `.env`:

```env
APP_URL=http://localhost
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=backtradelab
DB_USERNAME=root
DB_PASSWORD=
```

Build the schema and frontend:

```bash
php artisan migrate
npm run build
```

For active development, run Vite and Laravel in separate terminals:

```bash
npm run dev
php artisan serve
```

Laragon users may use the generated local virtual host instead of `artisan serve`. `APP_URL` must match the URL used by OAuth callbacks and PayMongo return URLs.

## Optional integrations

Configure only the integration being tested:

- Google/Facebook: `GOOGLE_*` and `FACEBOOK_*`
- PayMongo: `PAYMONGO_*`; keep disabled until configured
- Mail: `MAIL_*`
- Private/shared files: `FILESYSTEM_DISK` and `AWS_*`
- Legal identity: `LEGAL_*`

Never commit a populated `.env`, provider secret, private certificate, database dump, payment proof, or backup.

## Useful commands

```bash
php artisan route:list
php artisan migrate:status
php artisan test
npm run build
php artisan optimize:clear
```

## Common failures

| Symptom | Check |
|---|---|
| `No application encryption key` | Run `php artisan key:generate`. |
| Database connection error | Confirm MySQL is running and `DB_*` matches the local database. |
| Vite manifest missing | Run `npm install` and `npm run build`, or keep `npm run dev` running. |
| OAuth redirect mismatch | Make `APP_URL`, provider redirect URI, and provider console settings identical. |
| PayMongo unavailable | This is expected while `PAYMONGO_ENABLED=false` or credentials are absent. |
| Stale routes/config | Run `php artisan optimize:clear`. |

Next: [Project architecture](02-project-architecture.md).
