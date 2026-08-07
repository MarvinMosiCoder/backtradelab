# Public and Legal Pages

## Purpose

Unauthenticated visitors use the product homepage, login page, privacy policy, terms, and essential-cookie notice.

| Route/file | Responsibility |
|---|---|
| `GET /` / `Pages/Public/Home.jsx` | Public product page |
| `GET /api/featured-coins` | Rate-limited BTC, ETH, and SOL public market summary |
| `GET /privacy-policy` / `PrivacyPolicy.jsx` | Privacy disclosures |
| `GET /terms-of-service` / `TermsOfService.jsx` | Service terms |
| `LegalPage.jsx` | Shared legal layout |
| `CookieNotice.jsx` | Global essential-cookie notice |
| `config/legal.php` | Operator, email, jurisdiction, effective date |

Routes pass environment-backed legal values:

```php
Route::get('/privacy-policy', fn () => Inertia::render('Public/PrivacyPolicy', [
    'legal' => config('legal'),
]));
```

## Flow and state

Public pages bypass the authenticated layout. Home and login share the browser key `backtradelab-theme`. The cookie notice stores acknowledgment locally and links to the privacy policy; it does not disable required session/CSRF storage.

The homepage requests a fixed Bybit Spot BTCUSDT, ETHUSDT, and SOLUSDT summary. It combines cached exchange statistics and optional fundamentals with static educational descriptions. Loading, partial-provider, and unavailable states keep the public page usable, and the section identifies the data as informational rather than investment advice.

`Home.jsx` uses a few reusable, no-dependency motion primitives (plain React + `IntersectionObserver`, no animation library):

- `useScrollReveal()` / `<Reveal>` — fades and slides a section or card in once it enters the viewport; reuse these for new sections instead of adding ad hoc scroll listeners.
- `useCountUp()` — animates the featured-coin price from 0 to its live value once its card is revealed.
- The hero chart SVG measures its own path length on mount (`getTotalLength`) and animates `stroke-dashoffset` to "draw" the line in; the hero background glow follows the pointer via `onMouseMove`.
- Nav shows a scroll-progress bar and a shadow once scrolled; the login menu is always mounted and toggled with opacity/scale classes (not conditionally rendered) so it can transition on both open and close, and closes on outside click.
- New `floatY` and `shimmer` keyframes live in `tailwind.config.js` for the floating hero card/badge and the coin-card loading skeleton.

## Maintenance

- Edit legal content in the dedicated page, shared presentation in `LegalPage.jsx`, and operator facts in configuration.
- Keep production OAuth consent-screen links identical to the deployed legal URLs.
- Do not hard-code private contact details or secrets in JSX.
- Review legal text with qualified counsel before launch or material data/payment changes.
- Keep homepage motion effects reusing the primitives above; the page intentionally has no animation-library dependency.

## Verification

- Routes work while logged out and on mobile.
- Dark/light theme persists between home and login.
- Legal props render configured values.
- Cookie notice dismisses and remains dismissed.
- Homepage/login footer links are correct.
- Featured coins render with complete, partial, and unavailable provider responses.

Related: [Authentication](authentication-and-oauth.md), [Deployment](deployment-and-production.md).
