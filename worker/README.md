# Patreon login Worker

Stateless Cloudflare Worker behind "Log in with Patreon" (header account menu,
`/shop`, `/account`). No database: it exchanges the OAuth code, reads
`/identity`, and hands the site an HMAC-signed session in the URL fragment.
Logic lives in `src/lib/patreon.ts`.

The site opens `/login` in a **new tab** with `return=<site>/auth?next=…&back=…`.
`/auth` stores the session in localStorage (every open tab picks it up through
the `storage` event), then goes on to the Patreon checkout (`next`, a Buy) or
closes itself (a plain Log in). So `ALLOWED_ORIGINS` must cover the page
`/auth` lives on.

## One-time setup

1. **Patreon client** — <https://www.patreon.com/portal/registration/register-clients>
   → Create Client (API v2).
   - Redirect URIs: `https://anki-xiehanzi-auth.<your-subdomain>.workers.dev/callback`
     and `http://localhost:8787/callback` (for `wrangler dev`).
   - Note the **Client ID**, **Client Secret** and **Creator's Access Token**.
2. **See your campaign** — prints the campaign id and every tier id:
   ```bash
   PATREON_CREATOR_TOKEN=… npm run patreon:explore
   ```
3. **Fill `worker/wrangler.toml`** — `PATREON_CLIENT_ID`, `PATREON_CAMPAIGN_ID`.
4. **Secrets** (Cloudflare account needed; `npx wrangler login` once):
   ```bash
   npx wrangler secret put PATREON_CLIENT_SECRET --config worker/wrangler.toml
   npx wrangler secret put PATREON_CREATOR_TOKEN --config worker/wrangler.toml   # Shop purchases
   openssl rand -base64 32 | npx wrangler secret put SESSION_SECRET --config worker/wrangler.toml
   npm run auth:deploy
   ```
   Without `PATREON_CREATOR_TOKEN` login still works, but Shop purchases are
   not recognised and `/refresh` answers 501.
5. **Point the site at it** — GitHub → Settings → Secrets and variables →
   Actions → Variables: `PATREON_AUTH_URL` = the Worker URL. Locally, put
   `VITE_PATREON_AUTH_URL=http://localhost:8787` in `.env.local`.
6. **Say what each tier unlocks** — in `static/data/shop.json`, add
   `"unlockTiers": ["<tier id>", …]` to a product.

## Local dev

`worker/.dev.vars` (gitignored):
```
PATREON_CLIENT_ID=…            # overrides the wrangler.toml placeholder
PATREON_CLIENT_SECRET=…
PATREON_CREATOR_TOKEN=…        # optional: Shop purchases + /refresh
SESSION_SECRET=any-long-random-string
```
Then `npm run auth:dev` (port 8787) beside `npm run dev`.

## Endpoints

| Path | Does |
|---|---|
| `GET /login?return=<page>` | → Patreon consent. `<page>` must be on `ALLOWED_ORIGINS`. |
| `GET /callback` | Code → token → `/identity` → `<page>#patreon=<session>` (or `#patreon_error=<code>`). |
| `GET /refresh` | `Bearer <session>` → `{ token, session }` with membership and purchases re-read via the creator token. No Patreon screen — the shop calls it when the buyer returns from checkout. |
| `GET /session` | `Authorization: Bearer <session>` → `{ valid, session }`. For gated features later. |

Scopes asked: `identity identity.memberships` — no email, no address.

## Shop purchases

Patreon's API has no Shop / one-time purchase resource, but a member's
`campaign_lifetime_support_cents` includes Shop spend. The Worker subtracts
paid tier charges (pledge history) and matches the rest to product prices
(`src/lib/patreonSpend.ts`, prices from `SHOP_JSON_URL`). Check the matching
against Patreon's Sales page with:

```bash
PATREON_CREATOR_TOKEN=… npm run patreon:dashboard   # → .cache/patreon/dashboard.html
```

Prices must stay distinguishable: every combination of products needs a
different total (15/8/5 do). A new product priced at a sum of others makes
those buyers `ambiguous`.
